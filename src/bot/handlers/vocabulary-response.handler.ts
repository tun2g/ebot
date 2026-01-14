import { groupService } from '../../database/services/group.service';
import { userResponseService } from '../../database/services/user-response.service';
import { vocabularyService } from '../../database/services/vocabulary.service';
import logger from '../../shared/logger/logger';
import { BotContext } from '../interface/context';
import { formatResponseConfirmationMessage, formatWordMissingMessage, MESSAGES } from '../resources/learning-messages';

export class VocabularyResponseHandler {
  async handle(ctx: BotContext): Promise<boolean> {
    try {
      // Check if this is a reply to a message
      if (!ctx.message || !('reply_to_message' in ctx.message) || !ctx.message.reply_to_message) {
        return false;
      }

      // Check if this is a text message
      if (!('text' in ctx.message)) {
        return false;
      }

      if (!ctx.chat || !ctx.from) {
        return false;
      }

      const replyToMessageId = ctx.message.reply_to_message.message_id;

      // Get the group
      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        return false;
      }

      // Check if the reply is to a vocabulary message
      const vocabulary = await vocabularyService.findVocabularyByMessageId(group._id, replyToMessageId);
      if (!vocabulary) {
        return false;
      }

      const sentence = ctx.message.text.trim();

      // Validate that the sentence contains the target word (case-insensitive)
      const wordPattern = new RegExp(`\\b${vocabulary.word}\\b`, 'i');
      if (!wordPattern.test(sentence)) {
        await ctx.reply(formatWordMissingMessage(vocabulary.word), {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: ctx.message.message_id },
        });
        return true;
      }

      // Check if user has already responded to this vocabulary
      const hasResponded = await userResponseService.hasUserResponded(ctx.from.id, vocabulary._id);
      if (hasResponded) {
        await ctx.reply(MESSAGES.RESPONSE.ALREADY_SUBMITTED, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
        return true;
      }

      // Save the response
      const response = await userResponseService.createResponse({
        userId: ctx.from.id,
        groupId: group._id,
        vocabularyId: vocabulary._id,
        sentence,
      });

      if (!response) {
        await ctx.reply(MESSAGES.RESPONSE.ERROR_SAVING);
        return true;
      }

      // Send confirmation
      await ctx.reply(formatResponseConfirmationMessage(sentence), {
        reply_parameters: { message_id: ctx.message.message_id },
      });

      logger.info(
        `Vocabulary response saved for user ${ctx.from.id}, vocabulary: ${vocabulary.word}, group: ${ctx.chat.id}`
      );

      return true;
    } catch (error) {
      logger.error(`Error in vocabulary response handler: ${error}`);
      return false;
    }
  }
}

export const vocabularyResponseHandler = new VocabularyResponseHandler();
