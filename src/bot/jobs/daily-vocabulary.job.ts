import Bull from 'bull';

import { groupService } from '../../database/services/group.service';
import { vocabularyService } from '../../database/services/vocabulary.service';
import { weeklyTopicService } from '../../database/services/weekly-topic.service';
import logger from '../../shared/logger/logger';
import { aiService } from '../../shared/services/ai/ai.service';
import { bot } from '../index';
import { formatVocabularyMessage } from '../resources/learning-messages';

export async function dailyVocabularyJob(_job: Bull.Job) {
  try {
    logger.info('Starting daily vocabulary job');

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Only run Tuesday through Sunday (not Monday, as that's topic selection day)
    if (dayOfWeek === 1) {
      logger.info('Skipping vocabulary broadcast on Monday (topic selection day)');
      return;
    }

    // Get all active groups
    const groups = await groupService.getAllActiveGroups();

    for (const group of groups) {
      try {
        // Get active topic for this group
        const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

        if (!activeTopic || activeTopic.status !== 'active') {
          logger.info(`Group ${group.telegramGroupId} has no active topic, skipping vocabulary`);
          continue;
        }

        // Get previous words for this topic
        const previousWords = await vocabularyService.getPreviousWordsForTopic(activeTopic._id);

        // Generate vocabulary using AI
        const vocabularyData = await aiService.generateVocabulary(activeTopic.topicName, previousWords);

        // Save vocabulary to database
        const vocabulary = await vocabularyService.createVocabulary({
          topicId: activeTopic._id,
          groupId: group._id,
          word: vocabularyData.word,
          vietnameseMeaning: vocabularyData.vietnameseMeaning,
          englishSynonyms: vocabularyData.englishSynonyms,
          pronunciation: vocabularyData.pronunciation,
          exampleUsages: vocabularyData.exampleUsages,
          broadcastDate: new Date(),
        });

        if (!vocabulary) {
          logger.error(`Failed to create vocabulary for group ${group.telegramGroupId}`);
          continue;
        }

        // Format vocabulary message
        const message = formatVocabularyMessage(vocabularyData);

        // Send message to group
        const sentMessage = await bot.telegram.sendMessage(group.telegramGroupId, message, {
          parse_mode: 'Markdown',
        });

        // Update vocabulary with broadcast message ID for reply detection
        await vocabularyService.updateBroadcastMessageId(vocabulary._id, sentMessage.message_id);

        logger.info(
          `Vocabulary broadcast sent to group ${group.telegramGroupId}, word: ${vocabularyData.word}, message ID: ${sentMessage.message_id}`
        );
      } catch (error) {
        logger.error(`Error broadcasting vocabulary to group ${group.telegramGroupId}: ${error}`);
      }
    }

    logger.info('Daily vocabulary job completed');
  } catch (error) {
    logger.error(`Daily vocabulary job failed: ${error}`);
    throw error;
  }
}
