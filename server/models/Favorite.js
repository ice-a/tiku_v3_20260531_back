import mongoose from 'mongoose';

const { Schema } = mongoose;

const favoriteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemType: {
    type: String,
    enum: ['question', 'navigation', 'affiliate', 'careerPost'],
    required: true
  },
  itemId: {
    type: Schema.Types.ObjectId,
    required: true
  }
}, {
  timestamps: true
});

// 唯一复合索引：防止重复收藏
favoriteSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;
