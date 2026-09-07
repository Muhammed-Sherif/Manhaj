import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { ChannelHistoryInputPeer } from 'telegram/tl/custom/channel';
import dotenv from 'dotenv';
import { db, questions, choices } from '@manhaj/db';
import { eq, max } from 'drizzle-orm';

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
  errors: string[];
}

const stats: RunStats = {
  messagesScanned: 0,
  questionsInserted: 0,
  skippedMessages: 0,
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

// Voting function disabled due to API compatibility issues
// async function voteOnPoll(client: TelegramClient, channel: any, messageId: number, pollId: string) {
//   try {
//     // Vote on the first option to reveal correct answer
//     await client.invoke(
//       new Api.messages.SendVote({
//         peer: channel,
//         msgId: messageId,
//         answers: [Buffer.from([0])],
//       })
//     );
//     console.log(`🗳️  Voted on poll (message ${messageId}) to reveal correct answer`);
//     stats.pollsVotedOn = stats.pollsVotedOn + 1;
//   } catch (error) {
//     console.error(`Failed to vote on poll (message ${messageId}):`, error);
//     stats.errors.push(`Vote failed for message ${messageId}: ${error}`);
//   }
// }

async function insertQuestion(
  poll: any,
  channelMessageId: number
): Promise<boolean> {
  try {
    // Insert question
    const [question] = await database
      .insert(questions)
      .values({
        questionText: poll.question,
        explanation: poll.explanation || '', // Empty string since explanation is required
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
      const correctAnswerIndex = poll.results?.correctAnswers?.[0] || -1;
      
      for (let i = 0; i < poll.answers.length; i++) {
        const answer = poll.answers[i];
        // Extract text from TextWithEntities object if needed
        const choiceText = answer.text?.text || answer.text;
        await database.insert(choices).values({
          questionId: question.id,
          choiceText: choiceText,
          isCorrect: i === correctAnswerIndex,
        });
      }
    }

    stats.questionsInserted = stats.questionsInserted + 1;
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
  fromMedia: boolean = false
): Promise<boolean> {
  try {
    // Insert question
    const [question] = await database
      .insert(questions)
      .values({
        questionText: text,
        explanation: '', // Empty string since explanation is required but not available
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

    const prefix = fromMedia ? 'media caption' : 'text message';
    console.log(`✅ Inserted ${prefix} question: "${text.substring(0, 50)}..."`);

    stats.questionsInserted = stats.questionsInserted + 1;
    return true;
  } catch (error) {
    console.error(`Failed to insert text question (message ${channelMessageId}):`, error);
    stats.errors.push(`Insert failed for message ${channelMessageId}: ${error}`);
    return false;
  }
}

async function processMessage(message: any, channel: any): Promise<void> {
  stats.messagesScanned = stats.messagesScanned + 1;

  // Log message structure for debugging (simplified)
  if (message.poll) {
    const mediaPoll = message.poll;
    const poll = mediaPoll.poll || mediaPoll;
    const questionText = poll.question?.text || poll.question;
    console.log(`📨 Poll ${message.id}: "${questionText?.substring(0, 40) || 'undefined'}..." (${poll.quiz ? 'quiz' : 'regular'})`);
  } else if (message.message) {
    console.log(`📨 Text ${message.id}: "${message.message.substring(0, 40)}..."`);
  } else if (message.media) {
    console.log(`📨 Media ${message.id}: ${message.media.className}`);
  }

  // Handle poll messages
  if (message.poll) {
    const mediaPoll = message.poll;
    const poll = mediaPoll.poll || mediaPoll; // Handle nested structure

    // Extract question text from TextWithEntities object
    const questionText = poll.question?.text || poll.question;
    
    // Check if poll has question text
    if (!questionText) {
      console.log(`⏭️  Skipped poll without question text (message ${message.id})`);
      stats.skippedMessages = stats.skippedMessages + 1;
      return;
    }

    // Check if correct answer is visible
    const hasCorrectAnswer = poll.results?.correctAnswers && poll.results.correctAnswers.length > 0;

    // Skip voting due to API compatibility issues
    // Polls will be inserted without correct answers for now

    // Insert poll question (will skip if already exists)
    await insertQuestion({ ...poll, question: questionText }, message.id);
    return;
  }

  // Handle text messages
  if (message.message) {
    const text = message.message;
    if (text && text.trim().length > 0) {
      await insertTextQuestion(text, message.id);
      return;
    }
  }

  // Handle media messages with captions
  if (message.media && message.message) {
    const caption = message.message;
    if (caption && caption.trim().length > 0) {
      await insertTextQuestion(caption, message.id, true);
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

    let offsetId = lastProcessedId || 0;
    const batchSize = 50;
    let hasMore = true;
    let emptyBatches = 0;

    while (hasMore && emptyBatches < 3) {
      console.log(`📥 Fetching messages from ID ${offsetId + 1}...`);

      try {
        const messages = await fetchWithRetry(async () => {
          return client.invoke(
            new Api.messages.GetHistory({
              peer: channel,
              offsetId: offsetId,
              limit: batchSize,
              reverse: true, // oldest first
            })
          );
        });

        if (!messages || !('messages' in messages) || messages.messages.length === 0) {
          console.log('📭 No more messages found');
          emptyBatches = emptyBatches + 1;
          hasMore = false;
          break;
        }

        emptyBatches = 0; // Reset counter if we got messages

        console.log(`📨 Received ${messages.messages.length} messages\n`);

        for (const message of messages.messages) {
          if ('id' in message) {
            await processMessage(message, channel);
            offsetId = message.id;
          }
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
