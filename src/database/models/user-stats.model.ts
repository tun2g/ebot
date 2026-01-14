import mongoose, { Document, Schema } from 'mongoose';

export interface IUserStats extends Document {
  userId: number;
  groupId: mongoose.Types.ObjectId;
  weeklyTopicId: mongoose.Types.ObjectId;
  responsesSubmitted: number;
  penaltyCount: number;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserStatsSchema: Schema = new Schema(
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
    weeklyTopicId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyTopic',
      required: true,
      index: true,
    },
    responsesSubmitted: {
      type: Number,
      default: 0,
    },
    penaltyCount: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'user_stats',
  }
);

// Compound index for unique user stats per week per group
UserStatsSchema.index({ userId: 1, groupId: 1, weeklyTopicId: 1 }, { unique: true });

// Index for leaderboard queries
UserStatsSchema.index({ weeklyTopicId: 1, totalScore: -1 });

export const UserStats = mongoose.model<IUserStats>('UserStats', UserStatsSchema);
