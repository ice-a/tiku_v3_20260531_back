import { getHitokoto } from '../services/hitokoto.js';

export async function getRandomHitokoto(req, res) {
  try {
    const data = await getHitokoto({ refresh: req.query.refresh === '1' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || '获取一言失败',
    });
  }
}
