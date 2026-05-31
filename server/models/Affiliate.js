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
  }]
}, {
  timestamps: true
});

const Affiliate = mongoose.model('Affiliate', affiliateSchema);

export default Affiliate;
