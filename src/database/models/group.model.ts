import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  telegramGroupId: number;
  groupName: string;
  activeWeeklyTopicId?: mongoose.Types.ObjectId;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema(
  {
    telegramGroupId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    activeWeeklyTopicId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyTopic',
      default: null,
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh',
    },
  },
  {
    timestamps: true,
    collection: 'groups',
  }
);

// Create index for fast lookups
GroupSchema.index({ telegramGroupId: 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
