import Bull from 'bull';
import { bot } from 'src/bot/index';
import { formatWeeklySummaryMessage } from 'src/bot/resources/learning-messages';
import { WeeklyTopicStatus } from 'src/database/models/weekly-topic.model';
import { groupService } from 'src/database/services/group.service';
import { userService } from 'src/database/services/user.service';
import { userResponseService } from 'src/database/services/user-response.service';
import { userStatsService } from 'src/database/services/user-stats.service';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';

export async function weeklySummaryJob(_job: Bull.Job) {
  const startTime = new Date();
  logger.info(`🚀 CRONJOB STARTED: Weekly Summary | ${startTime.toISOString()} (${startTime.toLocaleString()})`);

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

        // Fetch user information for top performers
        const userIds = leaderboard.map((stats) => stats.userId);
        const users = await userService.findUsersByTelegramIds(userIds);
        const userMap = new Map(users.map((u) => [u.telegramUserId, u]));

        // Format weekly summary with usernames
        const summaryText = formatWeeklySummaryMessage({
          topicName: activeTopic.topicName,
          startDate: activeTopic.startDate,
          endDate: activeTopic.endDate,
          totalDays,
          totalResponses,
          uniqueParticipants,
          avgScore,
          topPerformers: leaderboard.map((stats) => ({
            userId: stats.userId,
            username: userService.getDisplayName(userMap.get(stats.userId) || null, stats.userId),
            totalScore: stats.totalScore,
            responsesSubmitted: stats.responsesSubmitted,
          })),
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

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.info('Weekly summary job completed');
    logger.info(
      `✅ CRONJOB COMPLETED: Weekly Summary | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | ${endTime.toISOString()}`
    );
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.error(`Weekly summary job failed: ${error}`);
    logger.error(
      `❌ CRONJOB FAILED: Weekly Summary | Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s) | Error: ${error}`
    );
    throw error;
  }
}
