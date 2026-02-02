import mongoose from 'mongoose';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';

export class MongoDBConnection {
  private isConnected = false;
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 5000; // 5 seconds

  constructor() {
    // Don't auto-connect in constructor; use ensureConnection instead
  }

  private async connect() {
    try {
      await mongoose.connect(configService.database.mongodb.uri);
      this.isConnected = true;
      logger.info('✅ Connected to MongoDB successfully');

      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`❌ MongoDB connection error: ${err}`);
      });
    } catch (err) {
      logger.error(`❌ Error connecting to MongoDB: ${err}`);
      this.isConnected = false;
      throw err;
    }
  }

  /**
   * Ensures MongoDB is connected with retry logic
   * @throws Error if connection fails after all retries
   */
  async ensureConnection(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected');
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`MongoDB connection attempt ${attempt}/${this.maxRetries}...`);
        await this.connect();
        logger.info('MongoDB connection established successfully');
        return;
      } catch (err) {
        lastError = err as Error;
        logger.error(`MongoDB connection attempt ${attempt}/${this.maxRetries} failed: ${err}`);

        if (attempt < this.maxRetries) {
          logger.info(`Retrying in ${this.retryDelayMs / 1000} seconds...`);
          await this.sleep(this.retryDelayMs);
        }
      }
    }

    throw new Error(
      `Failed to connect to MongoDB after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const mongodbConnection = new MongoDBConnection();
