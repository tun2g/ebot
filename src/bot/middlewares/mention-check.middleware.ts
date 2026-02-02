import { BotContext } from 'src/bot/interface/context';
import logger from 'src/shared/logger/logger';

/**
 * Middleware to check if bot is mentioned in channels/groups
 * Only allows messages in private chats or when bot is mentioned in groups/channels
 */
export const mentionCheckMiddleware = async (ctx: BotContext, next: () => Promise<void>) => {
  // Get chat type
  const chatType = ctx.chat?.type;

  // Allow all messages in private chats
  if (chatType === 'private') {
    return next();
  }

  // Allow callback queries (inline button clicks) in all chat types
  if (ctx.callbackQuery) {
    return next();
  }

  // For groups, supergroups, and channels - check if bot is mentioned
  if (chatType === 'group' || chatType === 'supergroup' || chatType === 'channel') {
    const botUsername = ctx.botInfo?.username;

    if (!botUsername) {
      logger.warn('Bot username not available');
      return next();
    }

    // Allow replies to bot's messages (for vocabulary responses and topic selection)
    if (ctx.message && 'reply_to_message' in ctx.message && ctx.message.reply_to_message) {
      if (ctx.message.reply_to_message.from?.username === botUsername) {
        return next();
      }
    }

    // Check if message exists
    if (!ctx.message || !('text' in ctx.message)) {
      return; // Ignore non-text messages in channels/groups
    }

    const messageText = ctx.message.text || '';
    const mentionPattern = `@${botUsername}`;

    // Check if bot is mentioned in the message
    if (messageText.includes(mentionPattern)) {
      logger.info(`Bot mentioned in ${chatType} by user ${ctx.from?.id}`);
      return next();
    }

    // Check if bot is mentioned in entities (for mentions)
    const entities = ctx.message.entities || [];
    const isMentioned = entities.some((entity) => {
      if (entity.type === 'mention') {
        const mention = messageText.substring(entity.offset, entity.offset + entity.length);
        return mention === mentionPattern;
      }
      if (entity.type === 'text_mention') {
        return entity.user?.username === botUsername;
      }
      return false;
    });

    if (isMentioned) {
      logger.info(`Bot mentioned (via entity) in ${chatType} by user ${ctx.from?.id}`);
      return next();
    }

    // Bot not mentioned - ignore message
    logger.debug(`Bot not mentioned in ${chatType}, ignoring message from user ${ctx.from?.id}`);
    return;
  }

  // For unknown chat types, allow the message
  return next();
};
