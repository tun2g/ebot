# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the bot

```bash
yarn dev              # Run with ts-node
yarn dev:watch        # Run with nodemon (hot reload)
```

### Building and production

```bash
yarn build            # Compile TypeScript to dist/
yarn start            # Run compiled code from dist/
```

### Code quality

```bash
yarn lint             # Run ESLint and auto-fix
yarn lint:check       # Check without fixing
yarn format           # Format with Prettier
yarn format:check     # Check formatting without fixing
yarn check-types      # Run TypeScript type checker
```

### Docker development

```bash
docker compose -f docker-compose.dev.yml up -d --build    # Start bot with MongoDB
docker logs telebot_dev -f                                # View bot logs
```

### Git workflow

```bash
yarn commit           # Use Commitizen for conventional commits (enforced by husky)
```

## Architecture Overview

### Bot Registration Pattern

The bot uses a registration pattern where commands, menu handlers, and action handlers register themselves via Map collections in `src/bot/index.ts`:

1. **Public commands** (no auth): Registered in `publicCommands` Map before `authMiddleware`
2. **Private commands** (auth required): Registered in `privateCommands` Map after `authMiddleware`
3. **Action handlers**: Registered in `actionHandlers` Map, support both string and regex patterns

Example: To add a new command, create the command file, then add to the appropriate Map:

```typescript
const privateCommands = new Map([
  ...menuCommand.register(),
  ...yourCommand.register(), // Add here
]);
```

### Menu Handler Architecture

Menus follow a three-file pattern (see `src/bot/menus/main/`):

1. **menu.ts** - UI definition with `replyMarkup()` method returning Telegraf Markup
2. **handler.ts** - Callback handlers for menu button clicks (e.g., `MainMenuSimpleMenu`)
3. **action-handler.ts** - Handles ongoing user actions based on session state

Menu callbacks are namespaced by class name (e.g., `MainMenu` + `SimpleMenu` = `MainMenuSimpleMenu`).

### Session vs Database Storage Strategy

The bot uses a **hybrid storage model**:

- **Redis (via sessionService)**: Ephemeral session state

  - Current action (e.g., `WAITING_FOR_INPUT`)
  - Temporary UI state
  - Key format: `session:{userId}:{chatId}`
  - No expiry by default, cleared manually via `delSession()`

- **MongoDB (via database/services)**: Persistent user data
  - User identity (ID, username, registration date)
  - Long-term user preferences or data

**Key insight**: Session is NOT on the context object. Always use `sessionService.getSession(ctx)` to retrieve it.

### Callback Data Storage Pattern

For dynamic menus with data that exceeds Telegram's 64-byte callback_data limit, use `callbackDataStorageService`:

1. Store list data in Redis with `hSetCallbackData()` or `setCallbackData()`
2. Pass only a reference ID in the callback button
3. Retrieve full data with `hGetCallbackData()` or `getCallbackData()` in the handler
4. Data expires after 1 hour (3600 seconds)

### Message Handler Flow

Text messages follow this path (`src/bot/bot-message-handler.ts`):

1. Get session from Redis
2. Check if `session.currentAction` is set
3. If set, dispatch to registered action handler in `actionsMap`
4. If not set, execute default message handling logic

To add a new action-based flow:

1. Add action to `src/bot/constants/current-action.ts`
2. Register handler in `BotMessageHandler.actionsMap`
3. Set action via `sessionService.setSession(ctx, { currentAction: YOUR_ACTION })`

### Middleware Order

Middlewares execute in this order (defined in `src/bot/index.ts`):

1. `loggerMiddleware` - Logs all interactions
2. `bot.start()` - Handles /start specially
3. Public commands (no auth)
4. **`authMiddleware`** - Authentication boundary
5. Private commands (requires auth)
6. Message handlers (requires auth)
7. Action handlers (requires auth)

### Configuration Management

All configuration comes from `src/configs/configuration.ts`, which loads from environment variables:

- `BOT_TOKEN` - Telegram bot token (required)
- `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE` - MongoDB connection
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DATABASE` - Redis connection
- `NODE_ENV` - Environment mode
- `TELEGRAM_API_URL` - API base URL (defaults to official)

### Bootstrap Sequence

The app starts in `src/index.ts`:

1. Connect to MongoDB (bot continues even if connection fails)
2. Set up bot commands via `setUpBotCommand.process()`
3. Set bot description
4. Launch bot with Telegraf

### Import Sorting

ESLint enforces automatic import sorting via `simple-import-sort`:

- External packages first
- Empty line
- Internal imports (from `../` or `./`)
- Sorted alphabetically within each group

Run `yarn lint` to auto-fix import order.

## TypeScript Configuration Notes

- Target: ES2017
- Module: CommonJS
- Output: `dist/` directory
- `strictNullChecks` enabled, but `noImplicitAny` disabled
- Decorators enabled (experimental)
