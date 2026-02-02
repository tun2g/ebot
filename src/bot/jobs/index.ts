import { dailyEvaluationJob } from 'src/bot/jobs/daily-evaluation.job';
import { dailyVocabularyJob } from 'src/bot/jobs/daily-vocabulary.job';
import { topicBroadcastJob } from 'src/bot/jobs/topic-broadcast.job';
import { weeklySummaryJob } from 'src/bot/jobs/weekly-summary.job';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import { queueService } from 'src/shared/services/queue.service';

export async function initializeJobs() {
  try {
    logger.info('🔧 Initializing cron jobs...');

    const timezone = configService.timezone;

    // Register job processors
    queueService.registerProcessor('topic-broadcast', topicBroadcastJob);
    queueService.registerProcessor('daily-vocabulary', dailyVocabularyJob);
    queueService.registerProcessor('daily-evaluation', dailyEvaluationJob);
    queueService.registerProcessor('weekly-summary', weeklySummaryJob);

    logger.info('✅ Registered all job processors');

    // Get existing repeating jobs to check for duplicates
    const existingJobs = await queueService.getQueue().getRepeatableJobs();
    logger.info(`Found ${existingJobs.length} existing repeating jobs`);

    // Only clear existing jobs if we have any to avoid unnecessary operations
    if (existingJobs.length > 0) {
      logger.info('🧹 Clearing existing repeating jobs to avoid duplicates...');
      await queueService.removeAllRepeatingJobs();
      logger.info('✅ Cleared existing repeating jobs');
    }

    // Schedule jobs with cron expressions
    logger.info('📅 Scheduling new cron jobs...');

    // Monday 9 AM - Topic broadcast
    await queueService.addRepeatingJob('topic-broadcast', {}, '0 9 * * 1', timezone);

    // Daily 9 AM (Tue-Sun) - Vocabulary broadcast
    await queueService.addRepeatingJob('daily-vocabulary', {}, '0 9 * * *', timezone);

    // Daily 9 PM - Evaluation
    await queueService.addRepeatingJob('daily-evaluation', {}, '0 21 * * *', timezone);

    // Sunday 9 PM - Weekly summary
    await queueService.addRepeatingJob('weekly-summary', {}, '0 21 * * 0', timezone);

    // Verify jobs were scheduled successfully
    const scheduledJobs = await queueService.getQueue().getRepeatableJobs();
    logger.info(`\n📊 Job Verification Report:`);
    logger.info(`Total scheduled jobs: ${scheduledJobs.length}`);

    if (scheduledJobs.length > 0) {
      logger.info('Scheduled repeating jobs:');
      for (const job of scheduledJobs) {
        logger.info(`  - ${job.name}: cron="${job.cron}", next run: ${new Date(job.next).toLocaleString()}`);
      }
    } else {
      logger.warn('⚠️  No repeating jobs found after initialization!');
    }

    logger.info('✅ All cron jobs initialized successfully');
  } catch (error) {
    logger.error(`❌ Failed to initialize cron jobs: ${error}`);
    throw error;
  }
}
