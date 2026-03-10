import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'growth'],
    default: 'free'
  },
  dmLinksUsed: {
    type: Number,
    default: 0
  },
  profileCardsUsed: {
    type: Number,
    default: 0
  },
  formsUsed: {
    type: Number,
    default: 0
  },
  leadsThisMonth: {
    type: Number,
    default: 0
  },
  lastLeadsReset: {
    type: Date,
    default: Date.now
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  billingCycleStart: {
    type: Date,
    default: Date.now
  },
  billingCycleEnd: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;
