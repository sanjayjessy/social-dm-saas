import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'user'
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically delete document after 24 hours
  }
});

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);

export default PendingUser;
