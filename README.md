# Telegram Bot Template

A clean, modern Telegram bot template built with TypeScript, demonstrating core bot features like commands, interactive menus, and pagination.

## 🚀 Features

- **Command Handling** - Process user commands like /start, /menu, /help
- **Interactive Menus** - Inline keyboard buttons for navigation
- **Pagination** - Browse through lists with Previous/Next buttons
- **User Management** - MongoDB integration for storing user data
- **Session State** - Redis for temporary session management
- **Smart Mentions** - Bot responds in private chats or when @mentioned in groups/channels
- **TypeScript** - Full type safety and modern ES features
- **Docker Ready** - Easy deployment with Docker Compose

## 📋 Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript 5.5+
- **Bot Framework**: Telegraf.js 4.16+
- **Database**: MongoDB 7.0 (via Mongoose)
- **Cache**: Redis 4.6+ (for sessions)
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged

## 📁 Project Structure

```
src/
├── bot/
│   ├── commands/          # Bot commands (/start, /menu, /help)
│   ├── menus/             # Interactive menus and handlers
│   │   └── main/          # Main menu with examples
│   ├── middlewares/       # Logger and auth middlewares
│   ├── constants/         # Bot constants and enums
│   ├── interface/         # TypeScript interfaces
│   └── index.ts           # Bot initialization
├── database/              # Database layer
│   ├── models/            # Mongoose models
│   ├── services/          # Database services
│   └── connection.ts      # MongoDB connection
├── shared/                # Shared utilities
│   ├── services/          # Shared services (Redis, Session, Telegram API)
│   ├── logger/            # Winston logger
│   └── utils/             # Helper functions
├── configs/               # Configuration management
└── index.ts               # Application entry point
```

## 🛠️ Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd botbot
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Configure environment**

   Create `.env` file with the following:

   ```env
   # Bot Configuration
   BOT_TOKEN=your_bot_token_here
   NODE_ENV=development
   TELEGRAM_API_URL=https://api.telegram.org

   # MongoDB
   MONGODB_HOST=mongodb
   MONGODB_PORT=27017
   MONGODB_DATABASE=botdb

   # Redis
   REDIS_HOST=redis
   REDIS_PORT=6379
   REDIS_DATABASE=0
   ```

4. **Start with Docker**

   ```bash
   docker compose -f docker-compose.dev.yml up -d --build
   ```

5. **Or run locally**
   ```bash
   # Make sure MongoDB and Redis are running
   yarn dev
   ```

## 📝 Usage

### Available Commands

- `/start` - Start the bot and show welcome message
- `/menu` - Open interactive menu
- `/help` - Show help information

### Bot Behavior

The bot is configured with smart mention detection:

**Private Chats:**

- Bot responds to all messages and commands

**Groups/Channels:**

- Bot only responds when explicitly mentioned with `@botusername`
- Commands always work (e.g., `/start`, `/menu`)
- Regular text messages are ignored unless bot is mentioned

**Example in a group:**

```
User: Hello bot           ❌ Ignored
User: @yourbotname Hello  ✅ Bot responds
User: /start              ✅ Bot responds (commands always work)
```

This behavior is controlled by the `mentionCheckMiddleware` in `src/bot/middlewares/mention-check.middleware.ts`.

### Development Scripts

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

# Git
yarn commit             # Commitizen for conventional commits
```

## 🎯 Core Examples

### 1. Command Handler

Located in `src/bot/commands/`

```typescript
export class StartCommand {
  async onStart(ctx: BotContext) {
    await ctx.replyWithMarkdownV2(welcomeMessage, mainMenu.replyMarkup());
  }
}
```

### 2. Interactive Menu

Located in `src/bot/menus/main/main.menu.ts`

```typescript
export class MainMenu {
  replyMarkup() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📋 Simple Menu', 'MainMenuSimpleMenu')],
      [Markup.button.callback('📄 Pagination', 'MainMenuPagination')],
    ]);
  }
}
```

### 3. Pagination

Located in `src/bot/menus/main/main.handler.ts`

Shows how to create paginated lists with Previous/Next navigation.

### 4. User Management

Located in `src/database/services/user.service.ts`

```typescript
// Automatically creates or updates user
const user = await userService.findOrCreateUser(ctx);
```

### 5. Session State

Located in `src/shared/services/session.service.ts`

```typescript
// Get/set user session
const session = await sessionService.getSession(ctx);
await sessionService.setSession(ctx, { currentAction: 'some_action' });
```

## 🏗️ Architecture

### Data Flow

```
User Message/Action
    ↓
Logger Middleware (logs interaction)
    ↓
User Service (create/update user in MongoDB)
    ↓
Session Service (get session from Redis)
    ↓
Command/Action Handler
    ↓
Response to User
```

### Storage Strategy

- **MongoDB**: Persistent user data (user ID, username, registration date)
- **Redis**: Temporary session state (current action, UI state)

This hybrid approach separates persistent identity from ephemeral state.

## 🔧 Customization

### Adding a New Command

1. Create command file in `src/bot/commands/your-command/`
2. Register in `src/bot/index.ts`:

   ```typescript
   import { yourCommand } from './commands/your-command/your-command.command';

   const publicCommands = new Map([...yourCommand.register()]);
   ```

3. Add to `src/bot/commands/setup.ts` for bot command list

### Adding a New Menu

1. Create menu files in `src/bot/menus/your-menu/`
2. Create handler class with action methods
3. Register handlers in `src/bot/index.ts`

### Adding User Actions

1. Add action to `src/bot/constants/current-action.ts`:
   ```typescript
   export enum CurrentAction {
     WAITING_FOR_INPUT = 'waiting_for_input',
   }
   ```
2. Handle in `src/bot/bot-message-handler.ts`

## 🐛 Debugging

View logs:

```bash
# Docker
docker logs telebot_dev -f

# Local
# Logs output to console via Winston
```

Check database:

```bash
# MongoDB
docker exec -it botbot_mongodb_dev mongosh
use botdb
db.users.find()

# Redis
docker exec -it botbot_redis_dev redis-cli
KEYS session:*
GET session:123:456
```

## 📚 Resources

- [Telegraf.js Documentation](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⭐ Support

If you find this template helpful, give it a star!
