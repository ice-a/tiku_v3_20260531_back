import mongoose from 'mongoose';

const { Schema } = mongoose;

const donationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  message: { type: String, default: '' },
  anonymous: { type: Boolean, default: false },
}, { timestamps: true });

donationSchema.index({ createdAt: -1 });

const Donation = mongoose.model('Donation', donationSchema);

export default Donation;
