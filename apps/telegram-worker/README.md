# Telegram Question Fetch Worker

This worker fetches quiz questions from a Telegram channel and inserts them into the shared PostgreSQL database as unclassified questions for the Admin to assign to lectures.

## Setup

### 1. Get Telegram API Credentials

1. Go to https://my.telegram.org
2. Sign in with your phone number
3. Go to "API development tools"
4. Create a new application to get:
   - `api_id` (number)
   - `api_hash` (string)

### 2. Generate StringSession (One-Time Setup)

Run the login script to authenticate with your personal Telegram account:

```bash
cd apps/telegram-worker
pnpm run login
```

Follow the prompts:
- Enter your phone number (with country code, e.g., +1234567890)
- Enter the verification code sent to your Telegram
- Enter your 2FA password if enabled

The script will print a `StringSession` - copy this and save it as `TELEGRAM_SESSION` in your `.env` file.

**Important:** This uses your personal Telegram account (not a bot) because bots cannot read channel history predating their membership.

### 3. Configure Environment Variables

Create a `.env` file in `apps/telegram-worker`:

```env
# Telegram API credentials (from my.telegram.org)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash_here

# Generated StringSession from login script
TELEGRAM_SESSION=your_string_session_here

# Target channel (use username without @ or channel ID)
TELEGRAM_CHANNEL_ID=-1001234567890

# Optional: Start from specific message ID (for partial backfill)
# TELEGRAM_BACKFILL_FROM_ID=12345

# Database connection (same as apps/api)
DATABASE_URL=postgresql://user:password@localhost:5432/manhaj
```

### 4. Install Dependencies

```bash
cd apps/telegram-worker
pnpm install
```

## Running the Worker

### Manual Run

```bash
pnpm run run
```

### Scheduled Run (Cron)

Add to your crontab (`crontab -e`) to run every 15 minutes:

```cron
*/15 * * * * cd /path/to/Manhaj/apps/telegram-worker && pnpm run run >> /var/log/telegram-worker.log 2>&1
```

Or using systemd (create `/etc/systemd/system/telegram-worker.service`):

```ini
[Unit]
Description=Telegram Question Fetch Worker
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/path/to/Manhaj/apps/telegram-worker
ExecStart=/usr/bin/pnpm run run
Environment=PATH=/usr/bin:/usr/local/bin

[Install]
WantedBy=multi-user.target
```

Then create a timer (`/etc/systemd/system/telegram-worker.timer`):

```ini
[Unit]
Description=Run Telegram Worker every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable telegram-worker.timer
sudo systemctl start telegram-worker.timer
```

## How It Works

1. **Connects** using saved StringSession (no interactive login)
2. **Queries** the last processed `telegramMessageId` from the database
3. **Fetches** new messages from the channel in batches of 50
4. **Processes** each message:
   - Skips non-poll messages
   - For quiz polls: votes to reveal correct answer if needed
   - Inserts question with `source: 'telegram_auto'` and `lectureId: null`
   - Inserts choices with `isCorrect` based on revealed answer
5. **Handles** rate limits automatically (sleeps on FLOOD_WAIT errors)
6. **Logs** summary of messages scanned, questions inserted, polls voted on

## Important Notes

- **Vote Side Effect**: The worker votes on every poll it processes to reveal correct answers. This is intentional and acceptable per requirements.
- **Deduplication**: Uses both `MAX(telegramMessageId)` check and `ON CONFLICT DO NOTHING` for safety.
- **Idempotent**: Safe to run multiple times - won't create duplicates.
- **Rate Limiting**: Automatically handles Telegram FLOOD_WAIT errors by sleeping for the specified duration.

## Database Schema

The worker adds `telegramMessageId` to the `questions` table for deduplication:

```sql
ALTER TABLE questions ADD COLUMN telegram_message_id INTEGER UNIQUE;
```

This migration will be applied when you run `pnpm db:push` from the project root.

## Troubleshooting

### "Could not find channel"
- Ensure `TELEGRAM_CHANNEL_ID` is correct
- For public channels: use username without `@` (e.g., `mychannel`)
- For private channels: use the numeric ID (e.g., `-1001234567890`)

### "FLOOD_WAIT" errors
- Normal rate limiting - the worker automatically handles these by sleeping
- If persistent, increase the batch size delay in the code

### "Session expired"
- Re-run the login script to generate a new StringSession
- Update `TELEGRAM_SESSION` in your `.env` file
