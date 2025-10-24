import { Schema, model, models } from "mongoose";

export interface IUser {
  _id?: string;
  phone: string;
  password: string;
  role: 'user' | 'admin';
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true
    },
    password: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: ['user', 'admin'], 
      default: 'user' 
    },
    otp: { 
      type: String,
      default: null
    },
    otpExpiry: { 
      type: Date,
      default: null
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    }
  },
  { 
    timestamps: true 
  }
);

export default models.User || model<IUser>("User", UserSchema);