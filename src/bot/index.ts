import { Telegraf } from 'telegraf';

import { configService } from '../configs/configuration';
import logger from '../shared/logger/logger';
import { botMessageHandler } from './bot-message-handler';
import { helpCommand } from './commands/help/help.command';
import { menuCommand } from './commands/menu/menu.command';
import { startCommand } from './commands/start/start.command';
import { BotContext } from './interface/context';
import { mainMenuActionHandler } from './menus/main/main.action-handler';
import { mainMenuHandler } from './menus/main/main.handler';
import { authMiddleware } from './middlewares/auth.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { mentionCheckMiddleware } from './middlewares/mention-check.middleware';

const bot = new Telegraf<BotContext>(configService.botToken);

bot.use(loggerMiddleware);
bot.use(mentionCheckMiddleware);

bot.start(async (ctx) => {
  await startCommand.onStart(ctx);
});

const publicCommands: Map<string, (ctx: BotContext) => void> = new Map<
  string,
  (ctx: BotContext) => void
>([...startCommand.register(), ...helpCommand.register()]);

Array.from(publicCommands).forEach(([command, callback]) => {
  bot.command(command, callback);
});

// NOTE: all actions and commands following this middleware require authentication
bot.use(authMiddleware);

const privateCommands: Map<string, (ctx: BotContext) => void> = new Map<
  string,
  (ctx: BotContext) => void
>([...menuCommand.register()]);

Array.from(privateCommands).forEach(([command, callback]) => {
  bot.command(command, callback);
});

bot.on('message', async (ctx: BotContext) => {
  await botMessageHandler.process(ctx);
});

// Register action handlers
const actionHandlers = new Map<string | RegExp, (ctx: BotContext) => void>([
  ...mainMenuHandler.register(),
  ...mainMenuActionHandler.register(),
]);

// Register all actions (both string and regex patterns)
Array.from(actionHandlers).forEach(([action, callback]) => {
  bot.action(action, callback);
});

bot.catch((error, _ctx) => {
  logger.error(error);
});

export { bot };
