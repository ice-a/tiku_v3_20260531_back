import mongoose from 'mongoose';

const { Schema } = mongoose;

const affiliateSchema = new Schema({
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

affiliateSchema.index({ category: 1, order: 1 });
affiliateSchema.index({ tags: 1 });

const Affiliate = mongoose.model('Affiliate', affiliateSchema);

export default Affiliate;
