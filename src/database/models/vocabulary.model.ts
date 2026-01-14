import mongoose, { Document, Schema } from 'mongoose';

export interface IVocabulary extends Document {
  topicId: mongoose.Types.ObjectId;
  word: string;
  vietnameseMeaning: string;
  englishSynonyms: string[];
  pronunciation: string;
  exampleUsages: string[];
  broadcastDate: Date;
  broadcastMessageId?: number;
  groupId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VocabularySchema: Schema = new Schema(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyTopic',
      required: true,
      index: true,
    },
    word: {
      type: String,
      required: true,
    },
    vietnameseMeaning: {
      type: String,
      required: true,
    },
    englishSynonyms: {
      type: [String],
      default: [],
    },
    pronunciation: {
      type: String,
      required: true,
    },
    exampleUsages: {
      type: [String],
      default: [],
    },
    broadcastDate: {
      type: Date,
      required: true,
      index: true,
    },
    broadcastMessageId: {
      type: Number,
      default: null,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'vocabularies',
  }
);

// Compound index for finding vocabulary by message ID and group
VocabularySchema.index({ groupId: 1, broadcastMessageId: 1 });
VocabularySchema.index({ topicId: 1, broadcastDate: 1 });

export const Vocabulary = mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);
