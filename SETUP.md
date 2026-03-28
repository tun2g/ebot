# Setup Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- AI API Key (Google Gemini or Fuse API)

## Installation

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ebot
yarn install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Key environment variables:

```env
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_API_URL=https://api.telegram.org

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ebot
# Or use individual params:
# MONGODB_HOST=localhost
# MONGODB_PORT=27017
# MONGODB_DATABASE=ebot

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DATABASE=0

# AI Provider ('gemini' or 'fuse')
AI_PROVIDER=gemini
AI_API_KEY=your_api_key_here

# For Fuse provider only:
# FUSE_API_URL=https://api.fuseapi.app/v1/chat/completions

# Timezone
TIMEZONE=Asia/Ho_Chi_Minh
```

### 3. Start with Docker (recommended)

```bash
# Development
docker compose -f docker-compose.dev.yml up -d --build

# Production
docker compose up -d --build
```

### 4. Or run locally

Make sure MongoDB and Redis are running, then:

```bash
yarn dev          # Run with ts-node
yarn dev:watch    # Run with nodemon (hot reload)
```

## Development Scripts

```bash
# Development
yarn dev                 # Run with ts-node
yarn dev:watch          # Run with nodemon (hot reload)

# Building
yarn build              # Compile TypeScript
yarn start              # Run compiled code

# Code Quality
yarn lint               # Run ESLint
yarn lint:fix           # Fix ESLint errors
yarn format             # Format with Prettier
yarn format:check       # Check formatting
yarn check-types        # TypeScript type checking

# Commits
yarn commit             # Commitizen for conventional commits
```

## Debugging

### View logs

```bash
# Docker
docker logs telebot_dev -f

# Local — logs output to console via Winston
```

### Inspect databases

```bash
# MongoDB
docker exec -it botbot_mongodb_dev mongosh
use botdb
db.users.find()

# Redis
docker exec -it botbot_redis_dev redis-cli
KEYS session:*
```

## Adding New Features

### New Command

1. Create a command file in `src/bot/commands/your-command/`
2. Register in `src/bot/index.ts`:
   ```typescript
   import { yourCommand } from './commands/your-command/your-command.command';
   const publicCommands = new Map([...yourCommand.register()]);
   ```
3. Add to `src/bot/commands/setup.ts` for the Telegram command list

### New Menu

1. Create menu files in `src/bot/menus/your-menu/`
2. Create a handler class with action methods
3. Register handlers in `src/bot/index.ts`

### New User Action

1. Add action to `src/bot/constants/current-action.ts`:
   ```typescript
   export enum CurrentAction {
     WAITING_FOR_INPUT = 'waiting_for_input',
   }
   ```
2. Handle in `src/bot/bot-message-handler.ts`

## Resources

- [Telegraf.js Documentation](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
