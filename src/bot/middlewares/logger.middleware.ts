import { Command } from 'src/bot/constants/command';
import { BotContext } from 'src/bot/interface/context';
import { userService } from 'src/database/services/user.service';
import logger from 'src/shared/logger/logger';
import { sessionService } from 'src/shared/services/session.service';
import { getIdsInTelegramContext } from 'src/shared/utils';

export const loggerMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  const { userId, chatId, type } = getIdsInTelegramContext(ctx);

  // Create/update user in MongoDB on every interaction
  await userService.findOrCreateUser(ctx);

  const session = await sessionService.getSession(ctx);

  if (chatId) {
    logger.log({
      level: 'info',
      message: `User ${userId} make a ${type} in chat ${chatId}.`,
    });
    logger.info(`------CONTEXT ${userId} BEFORE is: \n${JSON.stringify(session)}`);
  }

  // clear current action if user choose other action
  if (type === 'callback_query') {
    session.currentAction = undefined;
  }
  // Handle new message. If the message is another command, reset the next action as well.
  // For example, if the user's current action is PASS_X_AMOUNT and the new message is /pass_y, clear the current action.
  else {
    const message = (ctx.update as { message?: { text?: string } }).message?.text;
    if (message && Object.values(Command).includes(message as Command)) {
      session.currentAction = undefined;
    }
  }

  return next();
};
