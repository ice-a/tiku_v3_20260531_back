import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  nickname: { type: String, trim: true, maxlength: 50, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  bio: { type: String, trim: true, maxlength: 500, default: '' },
  socials: { type: mongoose.Schema.Types.Mixed, default: {} },
  aiConfig: {
    baseUrl: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    model: { type: String, default: '' },
    enabled: { type: Boolean, default: false }
  },
  notificationPreferences: {
    feishu: { type: Boolean, default: false },
    wechat: { type: Boolean, default: false },
    email: { type: Boolean, default: true },
    bark: { type: Boolean, default: false }
  },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: '' },
  emailVerificationExpire: { type: Date },
  resetPasswordToken: { type: String, default: '' },
  resetPasswordExpire: { type: Date }
}, {
  timestamps: true
});

// 密码保存前自动哈希
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 密码比较方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 隐藏密码字段
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
