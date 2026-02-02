import mongoose from 'mongoose';
import { IVocabulary, Vocabulary } from 'src/database/models/vocabulary.model';
import logger from 'src/shared/logger/logger';

export class VocabularyService {
  /**
   * Create a new vocabulary entry
   */
  async createVocabulary(data: {
    topicId: mongoose.Types.ObjectId;
    groupId: mongoose.Types.ObjectId;
    word: string;
    vietnameseMeaning: string;
    englishSynonyms: string[];
    pronunciation: string;
    exampleUsages: string[];
    broadcastDate: Date;
    broadcastMessageId?: number;
  }): Promise<IVocabulary | null> {
    try {
      const vocabulary = new Vocabulary(data);
      return await vocabulary.save();
    } catch (error) {
      logger.error(`Error creating vocabulary: ${error}`);
      return null;
    }
  }

  /**
   * Find vocabulary by broadcast message ID
   */
  async findVocabularyByMessageId(groupId: mongoose.Types.ObjectId, messageId: number): Promise<IVocabulary | null> {
    try {
      return await Vocabulary.findOne({
        groupId,
        broadcastMessageId: messageId,
      });
    } catch (error) {
      logger.error(`Error finding vocabulary by message ID: ${error}`);
      return null;
    }
  }

  /**
   * Get all vocabularies for a topic
   */
  async getVocabulariesForTopic(topicId: mongoose.Types.ObjectId): Promise<IVocabulary[]> {
    try {
      return await Vocabulary.find({ topicId }).sort({ broadcastDate: 1 });
    } catch (error) {
      logger.error(`Error getting vocabularies for topic: ${error}`);
      return [];
    }
  }

  /**
   * Get previous words for a topic (for AI context)
   */
  async getPreviousWordsForTopic(topicId: mongoose.Types.ObjectId): Promise<string[]> {
    try {
      const vocabularies = await Vocabulary.find({ topicId }).select('word').sort({ broadcastDate: 1 });

      return vocabularies.map((vocab) => vocab.word);
    } catch (error) {
      logger.error(`Error getting previous words for topic: ${error}`);
      return [];
    }
  }

  /**
   * Update broadcast message ID
   */
  async updateBroadcastMessageId(
    vocabularyId: mongoose.Types.ObjectId,
    messageId: number
  ): Promise<IVocabulary | null> {
    try {
      return await Vocabulary.findByIdAndUpdate(
        vocabularyId,
        { $set: { broadcastMessageId: messageId } },
        { new: true }
      );
    } catch (error) {
      logger.error(`Error updating broadcast message ID: ${error}`);
      return null;
    }
  }

  /**
   * Get vocabulary for today for a specific group
   */
  async getTodayVocabulary(groupId: mongoose.Types.ObjectId): Promise<IVocabulary | null> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      return await Vocabulary.findOne({
        groupId,
        broadcastDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });
    } catch (error) {
      logger.error(`Error getting today's vocabulary: ${error}`);
      return null;
    }
  }
}

export const vocabularyService = new VocabularyService();
