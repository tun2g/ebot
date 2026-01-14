import mongoose, { Document, Schema } from 'mongoose';

export interface IUserResponse extends Document {
  userId: number;
  groupId: mongoose.Types.ObjectId;
  vocabularyId: mongoose.Types.ObjectId;
  sentence: string;
  score?: number;
  feedback?: string;
  breakdown?: {
    grammar: number;
    usage: number;
    complexity: number;
  };
  submittedAt: Date;
  evaluatedAt?: Date;
}

const UserResponseSchema: Schema = new Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    vocabularyId: {
      type: Schema.Types.ObjectId,
      ref: 'Vocabulary',
      required: true,
      index: true,
    },
    sentence: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    feedback: {
      type: String,
      default: null,
    },
    breakdown: {
      type: {
        grammar: {
          type: Number,
          min: 0,
          max: 4,
        },
        usage: {
          type: Number,
          min: 0,
          max: 3,
        },
        complexity: {
          type: Number,
          min: 0,
          max: 3,
        },
      },
      default: null,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    evaluatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'user_responses',
  }
);

// Compound indexes for efficient queries
UserResponseSchema.index({ vocabularyId: 1, evaluatedAt: 1 });
UserResponseSchema.index({ groupId: 1, submittedAt: 1 });
UserResponseSchema.index({ userId: 1, groupId: 1, vocabularyId: 1 });

export const UserResponse = mongoose.model<IUserResponse>('UserResponse', UserResponseSchema);
