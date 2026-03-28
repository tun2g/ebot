import { CurrentAction } from 'src/bot/constants/current-action';
import { shadowResponseHandler } from 'src/bot/handlers/shadow-response.handler';
import { topicSelectionHandler } from 'src/bot/handlers/topic-selection.handler';
import { vocabularyResponseHandler } from 'src/bot/handlers/vocabulary-response.handler';
import { voiceResponseHandler } from 'src/bot/handlers/voice-response.handler';
import { BotContext } from 'src/bot/interface/context';
import { sessionService } from 'src/shared/services/session.service';

/**
 * Message handler for processing text messages
 * This is where you handle user messages that are not commands
 */
export class BotMessageHandler {
  private actionsMap: Map<CurrentAction, (ctx: BotContext) => Promise<void>>;

  constructor() {
    // Register action handlers for different current actions
    // Example: when waiting for user input for a specific action
    this.actionsMap = new Map<CurrentAction, (ctx: BotContext) => Promise<void>>([
      // Add your action handlers here
      // [CurrentAction.WAITING_FOR_INPUT, this.handleInput],
    ]);
  }

  async process(ctx: BotContext) {
    // Handle voice/audio messages first (for voice practice and shadow practice)
    if (ctx.message && ('voice' in ctx.message || 'audio' in ctx.message)) {
      const shadowHandled = await shadowResponseHandler.handle(ctx);
      if (shadowHandled) return;

      const voiceHandled = await voiceResponseHandler.handle(ctx);
      if (voiceHandled) return;
    }

    // Check if this is a reply to a bot message (for topic selection or vocabulary response)
    if (ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message) {
      // Try topic selection handler first
      const topicHandled = await topicSelectionHandler.handle(ctx);
      if (topicHandled) return;

      // Try vocabulary response handler
      const vocabHandled = await vocabularyResponseHandler.handle(ctx);
      if (vocabHandled) return;
    }

    const session = await sessionService.getSession(ctx);
    const message =
      'message' in ctx.update && ctx.update.message && 'text' in ctx.update.message
        ? ctx.update.message.text
        : undefined;

    if (!message) {
      return;
    }

    // If there's a current action in progress, handle it
    if (session.currentAction) {
      const handler = this.actionsMap.get(session.currentAction);
      if (handler) {
        await handler(ctx);
        return;
      }
    }

    // Default behavior for messages without current action
    await ctx.reply(
      `You said: "${message}"\n\n` +
        `This is the message handler. You can add custom logic here to process user messages.\n\n` +
        `Try using /help to see available commands!`
    );
  }
}

export const botMessageHandler = new BotMessageHandler();
