import { BotContext } from 'src/bot/interface/context';
import {
  formatResponseConfirmationMessage,
  formatWordMissingMessage,
  MESSAGES,
} from 'src/bot/resources/learning-messages';
import { groupService } from 'src/database/services/group.service';
import { userResponseService } from 'src/database/services/user-response.service';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import logger from 'src/shared/logger/logger';

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

      logger.info(
        `[VocabResponse] Processing reply - ChatID: ${ctx.chat.id}, UserID: ${ctx.from.id}, ReplyToMessageID: ${replyToMessageId}`
      );

      // Get the group
      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        logger.warn(
          `[VocabResponse] Group not found - ChatID: ${ctx.chat.id}. Reply ignored. Group should have been registered on first interaction.`
        );
        return false;
      }

      logger.info(
        `[VocabResponse] Group found - GroupID: ${group._id}, TelegramID: ${group.telegramGroupId}, checking for vocabulary message...`
      );

      // Check if the reply is to a vocabulary message
      const vocabulary = await vocabularyService.findVocabularyByMessageId(group._id, replyToMessageId);
      if (!vocabulary) {
        logger.info(
          `[VocabResponse] Not a vocabulary message - ReplyToMessageID: ${replyToMessageId}, GroupID: ${group._id}. Ignoring reply.`
        );
        return false;
      }

      logger.info(
        `[VocabResponse] Vocabulary message found - VocabID: ${vocabulary._id}, Word: "${vocabulary.word}", Processing user sentence...`
      );

      const sentence = ctx.message.text.trim();

      // Validate that the sentence contains the target word (case-insensitive)
      const wordPattern = new RegExp(`\\b${vocabulary.word}\\b`, 'i');
      if (!wordPattern.test(sentence)) {
        logger.info(
          `[VocabResponse] Word missing in sentence - UserID: ${ctx.from.id}, Word: "${vocabulary.word}", Sentence: "${sentence}"`
        );
        await ctx.reply(formatWordMissingMessage(vocabulary.word), {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: ctx.message.message_id },
        });
        return true;
      }

      // Check if user has already responded to this vocabulary
      const hasResponded = await userResponseService.hasUserResponded(ctx.from.id, vocabulary._id);
      if (hasResponded) {
        logger.info(
          `[VocabResponse] Duplicate response - UserID: ${ctx.from.id}, VocabID: ${vocabulary._id}, Word: "${vocabulary.word}"`
        );
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
        logger.error(
          `[VocabResponse] Failed to save response - UserID: ${ctx.from.id}, VocabID: ${vocabulary._id}, GroupID: ${group._id}`
        );
        await ctx.reply(MESSAGES.RESPONSE.ERROR_SAVING);
        return true;
      }

      // Send confirmation
      await ctx.reply(formatResponseConfirmationMessage(sentence), {
        reply_parameters: { message_id: ctx.message.message_id },
      });

      logger.info(
        `[VocabResponse] Response saved successfully - ResponseID: ${response._id}, UserID: ${ctx.from.id}, VocabID: ${vocabulary._id}, Word: "${vocabulary.word}", GroupID: ${group._id}, Sentence length: ${sentence.length} chars`
      );

      return true;
    } catch (error) {
      logger.error(
        `[VocabResponse] ERROR in handle - ChatID: ${ctx.chat?.id || 'N/A'}, UserID: ${ctx.from?.id || 'N/A'}, Error: ${
          error instanceof Error ? error.message : String(error)
        }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
      );
      return false;
    }
  }
}

export const vocabularyResponseHandler = new VocabularyResponseHandler();
