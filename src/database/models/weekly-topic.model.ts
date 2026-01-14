import mongoose, { Document, Schema } from 'mongoose';

export enum WeeklyTopicStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface IWeeklyTopic extends Document {
  groupId: mongoose.Types.ObjectId;
  topicName: string;
  startDate: Date;
  endDate: Date;
  selectedBy?: number;
  status: WeeklyTopicStatus;
  aiSuggestions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyTopicSchema: Schema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    topicName: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    selectedBy: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(WeeklyTopicStatus),
      default: WeeklyTopicStatus.PENDING,
      index: true,
    },
    aiSuggestions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'weekly_topics',
  }
);

// Compound index for querying active topics by group
WeeklyTopicSchema.index({ groupId: 1, status: 1 });

export const WeeklyTopic = mongoose.model<IWeeklyTopic>('WeeklyTopic', WeeklyTopicSchema);
