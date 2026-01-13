import { sessionService } from '../shared/services/session.service';
import { CurrentAction } from './constants/current-action';
import { BotContext } from './interface/context';

/**
 * Message handler for processing text messages
 * This is where you handle user messages that are not commands
 */
export class BotMessageHandler {
  private actionsMap: Map<CurrentAction, (ctx: BotContext) => void>;

  constructor() {
    // Register action handlers for different current actions
    // Example: when waiting for user input for a specific action
    this.actionsMap = new Map<CurrentAction, (ctx: BotContext) => void>([
      // Add your action handlers here
      // [CurrentAction.WAITING_FOR_INPUT, this.handleInput],
    ]);
  }

  async process(ctx: BotContext) {
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
        `Try using /menu to see the interactive menu!`,
    );
  }
}

export const botMessageHandler = new BotMessageHandler();
