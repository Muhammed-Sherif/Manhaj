import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import input from 'input';
import dotenv from 'dotenv';

dotenv.config();

const apiId = parseInt(process.env.TELEGRAM_API_ID || '');
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
  console.error('Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env');
  console.error('Get these from https://my.telegram.org');
  process.exit(1);
}

const session = new StringSession('');
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

async function login() {
  console.log('Starting Telegram login...');
  console.log('This is a one-time setup to generate a StringSession.');
  console.log('The session will be printed below - save it as TELEGRAM_SESSION in your .env file.\n');

  await client.start({
    phoneNumber: async () => await input.text('Please enter your phone number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () => await input.text('Please enter the code you received: '),
    onError: (err) => console.error(err),
  });

  console.log('\n✅ Login successful!');
  console.log('\nYour StringSession (copy this to your .env file as TELEGRAM_SESSION):');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(session.save());
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nAdd this to your .env file:');
  console.log('TELEGRAM_SESSION=' + session.save());
  
  await client.disconnect();
}

login().catch(console.error);
