import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import dotenv from 'dotenv';
import { db, questions, choices, mcqQuestions, writtenQuestions, questionImages } from '@manhaj/db';
import { max } from 'drizzle-orm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

// Initialize database connection after dotenv loads env vars
const database = db();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '');
const apiHash = process.env.TELEGRAM_API_HASH || '';
const sessionString = process.env.TELEGRAM_SESSION || '';
const channelId = process.env.TELEGRAM_CHANNEL_ID || '';
const backfillFromId = process.env.TELEGRAM_BACKFILL_FROM_ID
  ? parseInt(process.env.TELEGRAM_BACKFILL_FROM_ID)
  : null;

if (!apiId || !apiHash || !sessionString || !channelId) {
  console.error('Error: Missing required environment variables');
  console.error('Required: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION, TELEGRAM_CHANNEL_ID');
  process.exit(1);
}

const session = new StringSession(sessionString);
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

interface RunStats {
  messagesScanned: number;
  questionsInserted: number;
  skippedMessages: number;
  pollsVotedOn: number;
  errors: string[];
}

const stats: RunStats = {
  messagesScanned: 0,
  questionsInserted: 0,
  skippedMessages: 0,
  pollsVotedOn: 0,
  errors: [],
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.errorMessage === 'FLOOD_WAIT') {
        const waitTime = error.seconds * 1000;
        console.log(`⏱️  Rate limit hit, waiting ${error.seconds}s...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
}

async function getLastProcessedMessageId(): Promise<number | null> {
  const result = await database
    .select({ maxId: max(questions.telegramMessageId) })
    .from(questions);

  return result[0]?.maxId || backfillFromId || null;
}

async function voteOnPoll(client: TelegramClient, channel: any, messageId: number, pollId: string) {
  try {
    // Vote on the first option (index 0) to reveal correct answer
    // In MTProto, the parameter is 'options' and takes a vector of bytes representing the option
    const result = await client.invoke(
      new Api.messages.SendVote({
        peer: channel,
        msgId: messageId,
        options: [Buffer.from('0')],
      })
    );
    console.log(`🗳️  Voted on poll (message ${messageId}) to reveal correct answer`);
    stats.pollsVotedOn = stats.pollsVotedOn + 1;
    return result;
  } catch (error) {
    console.error(`Failed to vote on poll (message ${messageId}):`, error);
    stats.errors.push(`Vote failed for message ${messageId}: ${error}`);
    return null;
  }
}

async function insertQuestion(
  poll: any,
  channelMessageId: number,
  correctAnswersArray: number[] | undefined
): Promise<boolean> {
  try {
    // Insert question
    const [question] = await database
      .insert(questions)
      .values({
        questionText: poll.question,
        explanation: poll.explanation || '',
        questionType: 'mcq',
        source: 'telegram_auto',
        lectureId: null,
        createdBy: null,
        telegramMessageId: channelMessageId,
      })
      .onConflictDoNothing({
        target: [questions.telegramMessageId],
      })
      .returning();

    if (!question) {
      console.log(`⏭️  Skipped duplicate question (message ${channelMessageId})`);
      return false;
    }

    console.log(`✅ Inserted poll question: "${poll.question.substring(0, 50)}..."`);    

    // Insert choices
    if (poll.answers && Array.isArray(poll.answers)) {

      for (let i = 0; i < poll.answers.length; i++) {
        const answer = poll.answers[i];
        // Extract text from TextWithEntities object if needed
        const choiceText = answer.text?.text || answer.text;
        await database.insert(choices).values({
          questionId: question.id,
          choiceText: choiceText,
          isCorrect: (correctAnswersArray ?? []).includes(i),
        });
      }
    }

    stats.questionsInserted = stats.questionsInserted + 1;

    // Insert MCQ subclass row
    await database.insert(mcqQuestions).values({ questionId: question.id });

    return true;
  } catch (error) {
    console.error(`Failed to insert question (message ${channelMessageId}):`, error);
    stats.errors.push(`Insert failed for message ${channelMessageId}: ${error}`);
    return false;
  }
}

async function insertTextQuestion(
  text: string,
  channelMessageId: number,
  entities: any[] | null = null,
  fromMedia: boolean = false,
  imageUrl?: string,
  isAnswerImage: boolean = false
): Promise<boolean> {
  try {
    // Extract spoiler entity (the hidden answer)
    const spoilerEntity = entities?.find(
      (e: any) => e.className === 'MessageEntitySpoiler'
    );

    // Split message into question text and written answer
    let questionText = text.trim();
    let writtenAnswer: string | null = null;

    if (spoilerEntity) {
      // Text before the spoiler = the question; spoiler text = the answer
      questionText = text.substring(0, spoilerEntity.offset).trim();
      writtenAnswer = text.substring(
        spoilerEntity.offset,
        spoilerEntity.offset + spoilerEntity.length
      ).trim();
    }

    if (!questionText) {
      console.log(`⏭️  Skipped text message with no question part (message ${channelMessageId})`);
      stats.skippedMessages = stats.skippedMessages + 1;
      return false;
    }

    // Insert base question row
    const [question] = await database
      .insert(questions)
      .values({
        questionText,
        explanation: '',
        questionType: 'written',
        source: 'telegram_auto',
        lectureId: null,
        createdBy: null,
        telegramMessageId: channelMessageId,
      })
      .onConflictDoNothing({
        target: [questions.telegramMessageId],
      })
      .returning();

    if (!question) {
      console.log(`⏭️  Skipped duplicate question (message ${channelMessageId})`);
      return false;
    }

    console.log(`✅ Inserted ${fromMedia ? 'text with media' : 'text'} question: "${questionText.substring(0, 50)}..."`);

    // Insert written subclass row with the spoiler answer
    await database.insert(writtenQuestions).values({
      questionId: question.id,
      writtenAnswer: writtenAnswer ?? '',
    });

    if (imageUrl) {
      await database.insert(questionImages).values({
        questionId: question.id,
        imageUrl,
        isAnswer: isAnswerImage,
      });
    }

    stats.questionsInserted = stats.questionsInserted + 1;
    return true;
  } catch (error) {
    console.error(`Failed to insert text question (message ${channelMessageId}):`, error);
    stats.errors.push(`Insert failed for message ${channelMessageId}: ${error}`);
    return false;
  }
}

async function processMessage(message, channel): Promise<void> {
  stats.messagesScanned = stats.messagesScanned + 1;

  // Temporary photo debug log
  if (message.media?.className === 'MessageMediaPhoto') {
    console.log(`🖼️ Photo ${message.id} | spoiler=${message.media.spoiler} | caption="${(message.message || '').slice(0, 40)}" | group=${message.groupedId}`);
  }

  // Log message structure for debugging (simplified)
  if (message.media?.className === "MessageMediaPoll") {
    const mediaPoll = message.media;
    const poll = mediaPoll.poll || mediaPoll;
    const questionText = poll.question?.text || poll.question;
    console.log(`📨 Poll ${message.id}: "${questionText?.substring(0, 40) || 'undefined'}..." (${poll.quiz ? 'quiz' : 'regular'})`);
  } else if (message.message) {
    console.log(`📨 Text ${message.id}: "${message.message.substring(0, 40)}..."`);
  } else if (message.media) {
    console.log(`📨 Media ${message.id}: ${message.media.className}`);
  }

  // Handle poll messages
  if (message.media?.className === "MessageMediaPoll") {
    let poll = message.media.poll;

    // Extract question text from TextWithEntities object
    const questionText = poll.question?.text || poll.question;

    // Check if poll has question text
    if (!questionText) {
      console.log(`⏭️  Skipped poll without question text (message ${message.id})`);
      stats.skippedMessages = stats.skippedMessages + 1;
      return;
    }
    // Check if correct answer is visible
    let correctAnswers: number[] | undefined;
    if (message.media.results?.results) {
      // Each answer.option is a Buffer containing the ASCII digit of the answer index
      // e.g. Buffer<30> = '0', Buffer<31> = '1', etc.
      correctAnswers = message.media.results.results
        .filter((answer: any) => answer.correct)
        .map((answer: any) => parseInt(answer.option.toString('ascii'), 10));
    }

    // If correct answer is hidden and it's a quiz, we must vote to reveal it
    if (!correctAnswers && poll.quiz) {
      await voteOnPoll(client, channel, message.id, poll.id.toString());

      // Fetch the updated message to get the poll results
      for await (const updatedMessage of client.iterMessages(channel, {
        minId: message.id - 1,
        maxId: message.id + 1,
        limit: 1,
      })) {
        if (updatedMessage.id === message.id && updatedMessage.media?.className === "MessageMediaPoll") {
          poll = updatedMessage.media.poll || updatedMessage.media;
          if (updatedMessage.media.results?.results) {
            correctAnswers = updatedMessage.media.results.results
              .filter((answer: any) => answer.correct)
              .map((answer: any) => parseInt(answer.option.toString('ascii'), 10));
          }
        }
      }
    }

    // Insert poll question (will skip if already exists)
    await insertQuestion({ ...poll, question: questionText }, message.id , correctAnswers);
    return;
  }

  // Handle photo messages
  if (message.media?.className === 'MessageMediaPhoto') {
    const caption = (message.message || '').trim();
    const spoiler = message.media.spoiler ?? false;
    const groupedId = message.groupedId ?? null;
    
    console.log(`🖼️ Processing photo ${message.id} (spoiler=${spoiler}, group=${groupedId}, caption="${caption.slice(0, 40)}")`);

    try {
      const buffer = await client.downloadMedia(message);
      if (!buffer) {
        throw new Error('Failed to download media buffer');
      }

      const key = `telegram_images/${Date.now()}-${message.id}.jpg`;
      const bucket = process.env.AWS_S3_BUCKET || 'manhaj';
      const endpoint = process.env.AWS_ENDPOINT_URL_S3;
      
      const s3 = new S3Client({ 
        forcePathStyle: true,
        region: process.env.AWS_REGION || 'eu-central-1',
        endpoint: endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        }
      });

      await s3.send(new PutObjectCommand({ 
        Bucket: bucket, 
        Key: key, 
        Body: buffer,
        ContentType: 'image/jpeg' 
      }));

      const publicUrl = `${endpoint}/${bucket}/${key}`;
      await insertTextQuestion(caption, message.id, message.entities, true, publicUrl, spoiler);
      return;
    } catch (error) {
      console.error(`Error processing photo ${message.id}:`, error);
      stats.errors.push(`Photo ${message.id} error: ${error}`);
      return;
    }
  }

  // Handle text messages
  if (message.message) {
    const text = message.message;
    if (text && text.trim().length > 0) {
      await insertTextQuestion(text, message.id, message.entities);
      return;
    }
  }

  // Skip unsupported message types
  console.log(`⏭️  Skipped unsupported message type (message ${message.id})`);
  stats.skippedMessages = stats.skippedMessages + 1;
}

async function main() {
  console.log('🚀 Starting Telegram Question Fetch Worker...\n');

  try {
    await client.connect();
    console.log('✅ Connected to Telegram\n');

    // Get the channel entity
    const channel = await client.getEntity(channelId).catch(() => {
      throw new Error(`Could not find channel: ${channelId}`);
    });

    console.log(`📺 Target channel: ${channelId}`);
    console.log(`🔍 Backfill from ID: ${backfillFromId || 'none (will start from beginning)'}\n`);

    // Get last processed message ID
    const lastProcessedId = await getLastProcessedMessageId();
    console.log(`📍 Last processed message ID: ${lastProcessedId || 'none (first run)'}\n`);

    console.log(`Starting message fetch from ID: 3997\n`);

    let offsetId = 3996; // 3997 - 1, to test 3997 photo specifically

    while (true) {
      console.log(`📥 Fetching messages from ID ${offsetId + 1}...`);
      let processed = 0;

      try {
        await fetchWithRetry(async () => {
          for await (const message of client.iterMessages(channel, {
            minId: offsetId,
            reverse: true,
            limit: 50,
          })) {
            await processMessage(message, channel);
            offsetId = message.id;
            processed++;
          }
        });

        if (processed === 0) {
          console.log('📭 No more messages found');
          break;
        }

        // Small delay between batches to be respectful
        await sleep(1000);


      } catch (error) {
        console.error('Error fetching messages:', error);
        stats.errors.push(`Batch fetch error: ${error}`);
        hasMore = false;
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
    stats.errors.push(`Fatal error: ${error}`);
  } finally {
    await client.disconnect();
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 RUN SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Messages scanned: ${stats.messagesScanned}`);
  console.log(`Questions inserted: ${stats.questionsInserted}`);
  console.log(`Messages skipped: ${stats.skippedMessages}`);
  console.log(`Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
