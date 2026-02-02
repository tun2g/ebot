import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegramUserId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    telegramUserId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      default: null,
    },
    firstName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'users',
  }
);

// Create index for fast lookups
UserSchema.index({ telegramUserId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
