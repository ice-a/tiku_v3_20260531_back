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
  }
}, {
  timestamps: true
});

const Navigation = mongoose.model('Navigation', navigationSchema);

export default Navigation;
