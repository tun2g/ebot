import { BotContext } from 'src/bot/interface/context';
import { ASK_MESSAGES } from 'src/bot/resources/ask-messages';
import logger from 'src/shared/logger/logger';
import { ChatMessage } from 'src/shared/services/ai/ai.interface';
import { aiService } from 'src/shared/services/ai/ai.service';
import { Scenes } from 'telegraf';

const MAX_HISTORY = 20;

export const ASK_SCENE_ID = 'ask';

const askScene = new Scenes.BaseScene<BotContext>(ASK_SCENE_ID);

askScene.enter(async (ctx) => {
  // Clear conversation history on enter (use scene.session for scene-specific data)
  ctx.scene.session.conversationHistory = [];
  logger.info(`[Ask] Scene entered - UserID: ${ctx.from?.id}`);
  await ctx.reply(ASK_MESSAGES.WELCOME, { parse_mode: 'Markdown' });
});

askScene.command('done', async (ctx) => {
  logger.info(`[Ask] User exited scene - UserID: ${ctx.from?.id}`);
  await ctx.reply(ASK_MESSAGES.FAREWELL, { parse_mode: 'Markdown' });
  await ctx.scene.leave();
});

askScene.on('text', async (ctx) => {
  const userMessage = ctx.message.text;

  // Don't process other commands inside the scene
  if (userMessage.startsWith('/')) {
    await ctx.reply('⚠️ Use /done to exit the conversation first, then use other commands.');
    return;
  }

  try {
    // Get conversation history from scene session
    const history: ChatMessage[] = ctx.scene.session.conversationHistory || [];

    // Add user message
    history.push({ role: 'user', content: userMessage });

    // Cap history to prevent token overflow
    const trimmedHistory = history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;

    // Send thinking indicator
    const thinkingMsg = await ctx.reply(ASK_MESSAGES.THINKING, { parse_mode: 'Markdown' });

    // Call AI
    const response = await aiService.chat(trimmedHistory);

    // Delete thinking message
    try {
      await ctx.deleteMessage(thinkingMsg.message_id);
    } catch {
      // Ignore delete errors
    }

    // Send AI response (try Markdown first, fallback to plain text)
    try {
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch {
      // Markdown parse failed, send as plain text
      await ctx.reply(response);
    }

    // Update history with assistant response
    trimmedHistory.push({ role: 'assistant', content: response });
    ctx.scene.session.conversationHistory = trimmedHistory;

    logger.info(`[Ask] Message processed - UserID: ${ctx.from?.id}, HistoryLen: ${trimmedHistory.length}`);
  } catch (error) {
    logger.error(`[Ask] Error processing message - UserID: ${ctx.from?.id}, Error: ${error}`);
    await ctx.reply(ASK_MESSAGES.ERROR, { parse_mode: 'Markdown' });
  }
});

askScene.leave(async (ctx) => {
  // Clear history on leave
  ctx.scene.session.conversationHistory = undefined;
});

export { askScene };
