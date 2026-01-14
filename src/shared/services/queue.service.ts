import Bull, { Queue } from 'bull';

import { configService } from '../../configs/configuration';
import logger from '../logger/logger';

class QueueService {
  private queue: Queue;

  constructor() {
    this.queue = new Bull('english-learning', {
      redis: {
        host: configService.database.redis.host,
        port: configService.database.redis.port,
        db: parseInt(configService.database.redis.database),
      },
    });

    // Listen to queue events
    this.queue.on('error', (error) => {
      logger.error(`Queue error: ${error}`);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed: ${err.message}`);
    });

    this.queue.on('completed', (job) => {
      logger.info(`Job ${job.id} completed`);
    });
  }

  /**
   * Register a job processor
   */
  registerProcessor(name: string, processor: (job: Bull.Job) => Promise<void>) {
    this.queue.process(name, processor);
    logger.info(`Registered processor: ${name}`);
  }

  /**
   * Add a repeating job with cron schedule
   */
  async addRepeatingJob(name: string, data: unknown, cronExpression: string, timezone = 'Asia/Ho_Chi_Minh') {
    try {
      await this.queue.add(name, data, {
        repeat: {
          cron: cronExpression,
          tz: timezone,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      logger.info(`Added repeating job: ${name} with cron: ${cronExpression}`);
    } catch (error) {
      logger.error(`Error adding repeating job ${name}: ${error}`);
    }
  }

  /**
   * Add a one-time job
   */
  async addJob(name: string, data: unknown, options?: Bull.JobOptions) {
    try {
      await this.queue.add(name, data, options);
      logger.info(`Added job: ${name}`);
    } catch (error) {
      logger.error(`Error adding job ${name}: ${error}`);
    }
  }

  /**
   * Remove all repeating jobs
   */
  async removeAllRepeatingJobs() {
    try {
      const repeatableJobs = await this.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.queue.removeRepeatableByKey(job.key);
      }
      logger.info('Removed all repeating jobs');
    } catch (error) {
      logger.error(`Error removing repeating jobs: ${error}`);
    }
  }

  /**
   * Get queue instance
   */
  getQueue(): Queue {
    return this.queue;
  }

  /**
   * Close queue connection
   */
  async close() {
    await this.queue.close();
  }
}

export const queueService = new QueueService();
