import { configService } from '../../configs/configuration';
import logger from '../../shared/logger/logger';
import { queueService } from '../../shared/services/queue.service';
import { dailyEvaluationJob } from './daily-evaluation.job';
import { dailyVocabularyJob } from './daily-vocabulary.job';
import { topicBroadcastJob } from './topic-broadcast.job';
import { weeklySummaryJob } from './weekly-summary.job';

export async function initializeJobs() {
  try {
    logger.info('Initializing cron jobs...');

    const timezone = configService.timezone;

    // Register job processors
    queueService.registerProcessor('topic-broadcast', topicBroadcastJob);
    queueService.registerProcessor('daily-vocabulary', dailyVocabularyJob);
    queueService.registerProcessor('daily-evaluation', dailyEvaluationJob);
    queueService.registerProcessor('weekly-summary', weeklySummaryJob);

    // Clear any existing repeating jobs to avoid duplicates
    await queueService.removeAllRepeatingJobs();

    // Schedule jobs with cron expressions
    // Monday 9 AM - Topic broadcast
    await queueService.addRepeatingJob('topic-broadcast', {}, '0 9 * * 1', timezone);

    // Daily 9 AM (Tue-Sun) - Vocabulary broadcast
    await queueService.addRepeatingJob('daily-vocabulary', {}, '0 9 * * *', timezone);

    // Daily 9 PM - Evaluation
    await queueService.addRepeatingJob('daily-evaluation', {}, '0 21 * * *', timezone);

    // Sunday 9 PM - Weekly summary
    await queueService.addRepeatingJob('weekly-summary', {}, '0 21 * * 0', timezone);

    logger.info('All cron jobs initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize cron jobs: ${error}`);
    throw error;
  }
}
