import mongoose from 'mongoose';

const formSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  paragraph: {
    type: String,
    trim: true
  },
  topHeading: {
    icon: {
      type: String,
      default: "gift",
      trim: true
    },
    content: {
      type: String,
      trim: true
    }
  },
  buttonColor: {
    type: String,
    default: '#3b82f6', // Default blue color
    trim: true
  },
  buttonContent: {
    type: String,
    default: 'Unlock My Offer',
    trim: true
  },
  offersHeading: {
    type: String,
    default: "What You'll Get",
    trim: true
  },
  offers: [{
    icon: {
      type: String,
      default: "gift"
    },
    title: {
      type: String,
      required: true
    },
    highlight: {
      type: String
    }
  }],
  fields: [{
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['title', 'paragraph', 'text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio'],
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    placeholder: String,
    columnSpan: {
      type: Number,
      default: 12,
      min: 1,
      max: 12
    },
    options: [String], // For select, radio, checkbox
    validation: {
      minLength: Number,
      maxLength: Number,
      pattern: String
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  inTrash: {
    type: String,
    enum: ['yes', 'no'],
    default: 'no'
  },
  deletedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Form = mongoose.model('Form', formSchema);

export default Form;
