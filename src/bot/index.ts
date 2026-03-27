import { botMessageHandler } from 'src/bot/bot-message-handler';
import { devCommand } from 'src/bot/commands/dev/dev.command';
import { helpCommand } from 'src/bot/commands/help/help.command';
import { learningCommand } from 'src/bot/commands/learning/learning.command';
import { startCommand } from 'src/bot/commands/start/start.command';
import { statsCommand } from 'src/bot/commands/stats/stats.command';
import { topicCommand } from 'src/bot/commands/topic/topic.command';
import { voiceCommand } from 'src/bot/commands/voice/voice.command';
import { BotContext } from 'src/bot/interface/context';
import { learningMenuActionHandler } from 'src/bot/menus/learning/learning.action-handler';
import { learningMenuHandler } from 'src/bot/menus/learning/learning.handler';
import { mainMenuActionHandler } from 'src/bot/menus/main/main.action-handler';
import { mainMenuHandler } from 'src/bot/menus/main/main.handler';
import { authMiddleware } from 'src/bot/middlewares/auth.middleware';
import { loggerMiddleware } from 'src/bot/middlewares/logger.middleware';
import { mentionCheckMiddleware } from 'src/bot/middlewares/mention-check.middleware';
import { ASK_SCENE_ID, askScene } from 'src/bot/scenes/ask/ask.scene';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import { Scenes, session, Telegraf } from 'telegraf';

const bot = new Telegraf<BotContext>(configService.botToken);

bot.use(loggerMiddleware);
bot.use(mentionCheckMiddleware);

// Session middleware (required for scenes)
bot.use(session());

// Scene stage
const stage = new Scenes.Stage<BotContext>([askScene]);
bot.use(stage.middleware());

bot.start(async (ctx) => {
  await startCommand.onStart(ctx);
});

const publicCommands: Map<string, (ctx: BotContext) => void> = new Map<string, (ctx: BotContext) => void>([
  ...startCommand.register(),
  ...helpCommand.register(),
]);

Array.from(publicCommands).forEach(([command, callback]) => {
  bot.command(command, callback);
});

// NOTE: all actions and commands following this middleware require authentication
bot.use(authMiddleware);

const privateCommands: Map<string, (ctx: BotContext) => void> = new Map<string, (ctx: BotContext) => void>([
  ...learningCommand.register(),
  ...topicCommand.register(),
  ...statsCommand.register(),
  ...devCommand.register(),
  ...voiceCommand.register(),
]);

Array.from(privateCommands).forEach(([command, callback]) => {
  bot.command(command, callback);
});

// /ask - Enter the English assistant scene
bot.command('ask', async (ctx) => {
  await ctx.scene.enter(ASK_SCENE_ID);
});

// /done - Leave the current scene
bot.command('done', async (ctx) => {
  await ctx.scene.leave();
});

bot.on('message', async (ctx: BotContext) => {
  await botMessageHandler.process(ctx);
});

// Register action handlers
const actionHandlers = new Map<string | RegExp, (ctx: BotContext) => void>([
  ...mainMenuHandler.register(),
  ...mainMenuActionHandler.register(),
  ...learningMenuHandler.register(),
  ...learningMenuActionHandler.register(),
]);

// Register all actions (both string and regex patterns)
Array.from(actionHandlers).forEach(([action, callback]) => {
  bot.action(action, callback);
});

bot.catch((error, _ctx) => {
  logger.error(error);
});

export { bot };
