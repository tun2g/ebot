import Bull from 'bull';
import { sendVocabularyToGroup } from 'src/bot/utils/send-vocabulary.util';
import { groupService } from 'src/database/services/group.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';

export async function dailyVocabularyJob(_job: Bull.Job) {
  const startTime = new Date();
  logger.info(`🚀 CRONJOB STARTED: Daily Vocabulary | ${startTime.toISOString()} (${startTime.toLocaleString()})`);

  try {
    logger.info('Starting daily vocabulary job');

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Only run Tuesday through Sunday (not Monday, as that's topic selection day)
    // Monday vocabulary is sent immediately after topic selection instead
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

        await sendVocabularyToGroup(group._id, group.telegramGroupId, activeTopic._id, activeTopic.topicName);
      } catch (error) {
        logger.error(`Error broadcasting vocabulary to group ${group.telegramGroupId}: ${error}`);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.info('Daily vocabulary job completed');
    logger.info(
      `✅ CRONJOB COMPLETED: Daily Vocabulary | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | ${endTime.toISOString()}`
    );
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.error(`Daily vocabulary job failed: ${error}`);
    logger.error(
      `❌ CRONJOB FAILED: Daily Vocabulary | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | Error: ${error}`
    );
    throw error;
  }
}
