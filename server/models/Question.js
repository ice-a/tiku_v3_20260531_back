import mongoose from 'mongoose';

const { Schema } = mongoose;

const questionSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  stats: {
    views: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 }
  },
  answerPool: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answer: { type: String, required: true },
    source: { type: String, enum: ['ai', 'manual'], default: 'manual' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// 索引
questionSchema.index({ category: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ status: 1 });

const Question = mongoose.model('Question', questionSchema);

export default Question;
