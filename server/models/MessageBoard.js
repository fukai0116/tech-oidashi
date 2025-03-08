import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  position: {
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    }
  },
  color: {
    type: String,
    default: '#FFFFFF'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MessageBoardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  backgroundColor: {
    type: String,
    default: '#F5F5F5'
  },
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' field on save
MessageBoardSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const MessageBoard = mongoose.model('MessageBoard', MessageBoardSchema);