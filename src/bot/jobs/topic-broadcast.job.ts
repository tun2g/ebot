import Bull from 'bull';

import { groupService } from '../../database/services/group.service';
import { weeklyTopicService } from '../../database/services/weekly-topic.service';
import logger from '../../shared/logger/logger';
import { aiService } from '../../shared/services/ai/ai.service';
import { bot } from '../index';
import { formatTopicBroadcastMessage } from '../resources/learning-messages';

export async function topicBroadcastJob(_job: Bull.Job) {
  try {
    logger.info('Starting topic broadcast job');

    // Get all active groups
    const groups = await groupService.getAllActiveGroups();

    for (const group of groups) {
      try {
        // Check if current week already has an active/pending topic
        const existingTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

        if (existingTopic) {
          logger.info(`Group ${group.telegramGroupId} already has an active topic, skipping`);
          continue;
        }

        // Get previous topics for context
        const previousTopics = await weeklyTopicService.getPreviousTopicsForGroup(group._id, 10);

        // Generate AI suggestions
        const aiSuggestions = await aiService.generateTopicSuggestions(previousTopics, 5);

        // Calculate start and end dates (Monday 9 AM to Sunday 9 PM in group's timezone)
        const now = new Date();
        const startDate = new Date(now);
        startDate.setHours(9, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // Sunday
        endDate.setHours(21, 0, 0, 0); // 9 PM

        // Create weekly topic
        const weeklyTopic = await weeklyTopicService.createWeeklyTopic({
          groupId: group._id,
          startDate,
          endDate,
          aiSuggestions,
        });

        if (!weeklyTopic) {
          logger.error(`Failed to create weekly topic for group ${group.telegramGroupId}`);
          continue;
        }

        // Update group's active topic reference
        await groupService.updateActiveWeeklyTopic(group._id, weeklyTopic._id);

        // Format suggestions message
        const message = formatTopicBroadcastMessage(aiSuggestions);

        // Send message to group
        const sentMessage = await bot.telegram.sendMessage(group.telegramGroupId, message, {
          parse_mode: 'Markdown',
        });

        logger.info(`Topic broadcast sent to group ${group.telegramGroupId}, message ID: ${sentMessage.message_id}`);

        // Store message ID if needed for reply detection (we'll handle this via pending topic status)
      } catch (error) {
        logger.error(`Error broadcasting topic to group ${group.telegramGroupId}: ${error}`);
      }
    }

    logger.info('Topic broadcast job completed');
  } catch (error) {
    logger.error(`Topic broadcast job failed: ${error}`);
    throw error;
  }
}
