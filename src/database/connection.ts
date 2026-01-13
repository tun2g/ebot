import mongoose from 'mongoose';

import { configService } from '../configs/configuration';
import logger from '../shared/logger/logger';

export class MongoDBConnection {
  private isConnected = false;

  constructor() {
    this.connect();
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
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const mongodbConnection = new MongoDBConnection();
