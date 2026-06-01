import crypto from 'crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const miniProgramSessionSchema = new Schema({
  openid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  unionid: {
    type: String,
    default: '',
    index: true,
  },
  sessionKeyHash: {
    type: String,
    required: true,
  },
  clientId: {
    type: String,
    default: '',
    index: true,
  },
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

miniProgramSessionSchema.statics.hashSessionKey = function hashSessionKey(sessionKey) {
  return crypto
    .createHmac('sha256', process.env.MINIPROGRAM_SESSION_SECRET || process.env.JWT_SECRET)
    .update(sessionKey)
    .digest('hex');
};

const MiniProgramSession = mongoose.model('MiniProgramSession', miniProgramSessionSchema);

export default MiniProgramSession;
