import { userService } from '../../database/services/user.service';
import logger from '../../shared/logger/logger';
import { sessionService } from '../../shared/services/session.service';
import { getIdsInTelegramContext } from '../../shared/utils';
import { Command } from '../constants/command';

export const loggerMiddleware = async (ctx, next) => {
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

  try {
    // clear current action if user choose other action
    if (type === 'callback_query') {
      session.currentAction = undefined;
    }
    // Handle new message. If the message is another command, reset the next action as well.
    // For example, if the user's current action is PASS_X_AMOUNT and the new message is /pass_y, clear the current action.
    else {
      const message = ctx.update.message?.text;
      if (message && Object.values(Command).includes(message)) {
        session.currentAction = undefined;
      }
    }
  } finally {
    next();
  }
};
