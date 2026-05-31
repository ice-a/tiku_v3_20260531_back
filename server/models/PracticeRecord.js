import mongoose from 'mongoose';

const { Schema } = mongoose;

const practiceRecordSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  userAnswer: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean
  },
  aiScore: {
    type: Number
  },
  aiAnalysis: {
    type: String
  }
}, {
  timestamps: true
});

// 复合索引
practiceRecordSchema.index({ userId: 1, questionId: 1 });

const PracticeRecord = mongoose.model('PracticeRecord', practiceRecordSchema);

export default PracticeRecord;
