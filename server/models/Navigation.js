import mongoose from 'mongoose';

const { Schema } = mongoose;

const navigationSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  stats: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

navigationSchema.index({ category: 1, order: 1 });
navigationSchema.index({ tags: 1 });

const Navigation = mongoose.model('Navigation', navigationSchema);

export default Navigation;
