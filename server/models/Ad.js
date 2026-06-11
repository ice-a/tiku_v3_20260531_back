import mongoose from 'mongoose';

const { Schema } = mongoose;

const adSchema = new Schema({
  slot: { type: String, required: true, unique: true },
  title: { type: String, default: '' },
  type: { type: String, enum: ['image', 'text', 'html'], default: 'image' },
  content: { type: String, default: '' },
  link: { type: String, default: '' },
  active: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  startAt: { type: Date },
  endAt: { type: Date },
}, { timestamps: true });

const Ad = mongoose.model('Ad', adSchema);

export default Ad;
