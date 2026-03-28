import mongoose from 'mongoose';
import { VOCAB_PRONOUNCE_PREFIX } from 'src/bot/handlers/voice.action-handler';
import { bot } from 'src/bot/index';
import { formatVocabularyMessage } from 'src/bot/resources/learning-messages';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { Markup } from 'telegraf';

/**
 * Generate and send a vocabulary word to a group for a given topic.
 * Shared between the daily cron job and the topic selection handlers (for Monday).
 */
export async function sendVocabularyToGroup(
  groupId: mongoose.Types.ObjectId,
  telegramGroupId: number,
  topicId: mongoose.Types.ObjectId,
  topicName: string
): Promise<boolean> {
  try {
    // Get previous words for this topic
    const previousWords = await vocabularyService.getPreviousWordsForTopic(topicId);

    // Generate vocabulary using AI
    const vocabularyData = await aiService.generateVocabulary(topicName, previousWords);

    // Save vocabulary to database
    const vocabulary = await vocabularyService.createVocabulary({
      topicId,
      groupId,
      word: vocabularyData.word,
      vietnameseMeaning: vocabularyData.vietnameseMeaning,
      englishSynonyms: vocabularyData.englishSynonyms,
      pronunciation: vocabularyData.pronunciation,
      exampleUsages: vocabularyData.exampleUsages,
      broadcastDate: new Date(),
    });

    if (!vocabulary) {
      logger.error(`[SendVocabulary] Failed to create vocabulary for group ${telegramGroupId}`);
      return false;
    }

    // Format vocabulary message
    const message = formatVocabularyMessage(vocabularyData);

    // Send message to group with "Hear pronunciation" button
    const sentMessage = await bot.telegram.sendMessage(telegramGroupId, message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('🔊 Hear pronunciation', `${VOCAB_PRONOUNCE_PREFIX}${vocabularyData.word}`),
      ]),
    });

    // Update vocabulary with broadcast message ID for reply detection
    await vocabularyService.updateBroadcastMessageId(vocabulary._id, sentMessage.message_id);

    logger.info(
      `[SendVocabulary] Vocabulary sent to group ${telegramGroupId}, word: ${vocabularyData.word}, message ID: ${sentMessage.message_id}`
    );

    return true;
  } catch (error) {
    logger.error(`[SendVocabulary] Error sending vocabulary to group ${telegramGroupId}: ${error}`);
    return false;
  }
}
