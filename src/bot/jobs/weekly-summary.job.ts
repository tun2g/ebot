import Bull from 'bull';

import { WeeklyTopicStatus } from '../../database/models/weekly-topic.model';
import { groupService } from '../../database/services/group.service';
import { userResponseService } from '../../database/services/user-response.service';
import { userStatsService } from '../../database/services/user-stats.service';
import { vocabularyService } from '../../database/services/vocabulary.service';
import { weeklyTopicService } from '../../database/services/weekly-topic.service';
import logger from '../../shared/logger/logger';
import { bot } from '../index';
import { formatWeeklySummaryMessage } from '../resources/learning-messages';

export async function weeklySummaryJob(_job: Bull.Job) {
  try {
    logger.info('Starting weekly summary job');

    // Get all active groups
    const groups = await groupService.getAllActiveGroups();

    for (const group of groups) {
      try {
        // Get active topic for this group
        const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

        if (!activeTopic || activeTopic.status !== 'active') {
          logger.info(`Group ${group.telegramGroupId} has no active topic, skipping summary`);
          continue;
        }

        // Get all vocabularies for this topic
        const vocabularies = await vocabularyService.getVocabulariesForTopic(activeTopic._id);

        // Get all responses for this topic
        const vocabularyIds = vocabularies.map((v) => v._id);
        const allResponses = await userResponseService.getResponsesForWeeklyTopic(group._id, vocabularyIds);

        // Get leaderboard
        const leaderboard = await userStatsService.getLeaderboard(activeTopic._id, 10);

        // Calculate participation stats
        const totalDays = vocabularies.length;
        const totalResponses = allResponses.length;
        const uniqueParticipants = new Set(allResponses.map((r) => r.userId)).size;
        const avgScore =
          totalResponses > 0 ? allResponses.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses : 0;

        // Format weekly summary
        const summaryText = formatWeeklySummaryMessage({
          topicName: activeTopic.topicName,
          startDate: activeTopic.startDate,
          endDate: activeTopic.endDate,
          totalDays,
          totalResponses,
          uniqueParticipants,
          avgScore,
          topPerformers: leaderboard,
          vocabularies,
        });

        // Send summary
        await bot.telegram.sendMessage(group.telegramGroupId, summaryText, {
          parse_mode: 'Markdown',
        });

        logger.info(`Sent weekly summary to group ${group.telegramGroupId}`);

        // Mark topic as completed
        await weeklyTopicService.updateTopicStatus(activeTopic._id, WeeklyTopicStatus.COMPLETED);

        // Clear group's active topic reference
        await groupService.updateActiveWeeklyTopic(group._id, null);

        logger.info(`Completed weekly topic for group ${group.telegramGroupId}`);
      } catch (error) {
        logger.error(`Error generating weekly summary for group ${group.telegramGroupId}: ${error}`);
      }
    }

    logger.info('Weekly summary job completed');
  } catch (error) {
    logger.error(`Weekly summary job failed: ${error}`);
    throw error;
  }
}
