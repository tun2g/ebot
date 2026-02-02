import Bull from 'bull';
import { bot } from 'src/bot/index';
import { formatTopicBroadcastMessage } from 'src/bot/resources/learning-messages';
import { groupService } from 'src/database/services/group.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';

export async function topicBroadcastJob(_job: Bull.Job) {
  const startTime = new Date();
  logger.info(`🚀 CRONJOB STARTED: Topic Broadcast | ${startTime.toISOString()} (${startTime.toLocaleString()})`);

  try {
    logger.info('[TopicBroadcastJob] Starting topic broadcast job');

    // Get all active groups
    const groups = await groupService.getAllActiveGroups();
    logger.info(`[TopicBroadcastJob] Found ${groups.length} groups to process`);

    if (groups.length === 0) {
      logger.warn(
        '[TopicBroadcastJob] No groups found in database. This may be normal if no groups have been registered yet.'
      );
    }

    for (const group of groups) {
      try {
        logger.info(
          `[TopicBroadcastJob] Processing group - GroupID: ${group._id}, TelegramID: ${group.telegramGroupId}, Name: "${group.groupName}"`
        );

        // Check if current week already has an active/pending topic
        const existingTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

        if (existingTopic) {
          logger.info(
            `[TopicBroadcastJob] Group ${group.telegramGroupId} already has an active topic (TopicID: ${existingTopic._id}, Status: ${existingTopic.status}), skipping`
          );
          continue;
        }

        logger.info(
          `[TopicBroadcastJob] No existing topic for group ${group.telegramGroupId}, generating new topic...`
        );

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
          logger.error(
            `[TopicBroadcastJob] Failed to create weekly topic for group ${group.telegramGroupId} (GroupID: ${group._id})`
          );
          continue;
        }

        logger.info(
          `[TopicBroadcastJob] Weekly topic created - TopicID: ${weeklyTopic._id}, GroupID: ${group._id}, Status: ${weeklyTopic.status}`
        );

        // Update group's active topic reference
        await groupService.updateActiveWeeklyTopic(group._id, weeklyTopic._id);

        // Format suggestions message
        const message = formatTopicBroadcastMessage(aiSuggestions);

        // Send message to group
        const sentMessage = await bot.telegram.sendMessage(group.telegramGroupId, message, {
          parse_mode: 'Markdown',
        });

        logger.info(
          `[TopicBroadcastJob] Topic broadcast sent successfully - GroupID: ${group._id}, TelegramID: ${group.telegramGroupId}, MessageID: ${sentMessage.message_id}, TopicID: ${weeklyTopic._id}`
        );

        // Store message ID if needed for reply detection (we'll handle this via pending topic status)
      } catch (error) {
        logger.error(
          `[TopicBroadcastJob] ERROR processing group ${group.telegramGroupId} (GroupID: ${group._id}): ${
            error instanceof Error ? error.message : String(error)
          }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
        );
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.info(`[TopicBroadcastJob] Job completed - ProcessedGroups: ${groups.length}`);
    logger.info(
      `✅ CRONJOB COMPLETED: Topic Broadcast | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | ${endTime.toISOString()}`
    );
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.error(
      `[TopicBroadcastJob] Job failed: ${error instanceof Error ? error.message : String(error)}, Stack: ${
        error instanceof Error ? error.stack : 'N/A'
      }`
    );
    logger.error(
      `❌ CRONJOB FAILED: Topic Broadcast | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | Error: ${error}`
    );
    throw error;
  }
}
