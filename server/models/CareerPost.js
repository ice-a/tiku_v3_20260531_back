import mongoose from 'mongoose';

const { Schema } = mongoose;

const careerPostSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000
  },
  summary: {
    type: String,
    default: '',
    maxlength: 500
  },
  cover: {
    type: String,
    default: ''
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'published'
  },
  relatedQuestionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question'
  },
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true
});

careerPostSchema.index({ status: 1, publishedAt: -1 });
careerPostSchema.index({ category: 1, status: 1 });
careerPostSchema.index({ tags: 1 });
careerPostSchema.index({ author: 1, createdAt: -1 });

careerPostSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const CareerPost = mongoose.model('CareerPost', careerPostSchema);

export default CareerPost;
