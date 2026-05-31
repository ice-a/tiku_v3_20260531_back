import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, { _id: false, timestamps: true });

const chatHistorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['interview', 'resume', 'career'],
    default: 'career'
  },
  title: {
    type: String,
    default: '新对话'
  },
  messages: [messageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

chatHistorySchema.index({ userId: 1, updatedAt: -1 });
chatHistorySchema.index({ userId: 1, type: 1, updatedAt: -1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
export default ChatHistory;
