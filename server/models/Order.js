import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['pro', 'enterprise'], required: true },
  amount: { type: Number, required: true },
  channel: { type: String, enum: ['alipay', 'wechat', 'manual'], required: true },
  status: { type: String, enum: ['pending', 'paid', 'expired', 'refunded'], default: 'pending', index: true },
  duration: { type: Number, required: true },
  tradeNo: { type: String, default: '' },
  paidAt: { type: Date },
  remark: { type: String, default: '' },
}, { timestamps: true });

orderSchema.index({ userId: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
