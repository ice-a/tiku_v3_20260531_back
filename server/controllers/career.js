import * as careerService from '../services/career.js';
import ChatHistory from '../models/ChatHistory.js';

const MAX_MESSAGES = 100;

// POST /api/career/chat - AI 对话
export const chat = async (req, res) => {
  try {
    const { message, historyId, type } = req.body;

    // 验证必填字段
    if (!message) {
      return res.status(400).json({ success: false, message: '请提供消息内容' });
    }

    // 验证 type 参数
    const validTypes = ['interview', 'resume', 'career'];
    const chatType = validTypes.includes(type) ? type : 'career';

    // 检查用户是否配置了 AI
    const user = req.user;
    if (!user.aiConfig || !user.aiConfig.enabled) {
      return res.status(403).json({ success: false, message: '请先在个人设置中配置 AI 功能' });
    }

    if (!user.aiConfig.baseUrl || !user.aiConfig.apiKey) {
      return res.status(403).json({ success: false, message: 'AI 配置不完整，请检查 baseUrl 和 apiKey' });
    }

    // 加载或创建对话历史
    let chatHistory = null;
    let historyMessages = [];

    if (historyId) {
      chatHistory = await ChatHistory.findOne({ _id: historyId, userId: user._id });
      if (!chatHistory) {
        return res.status(404).json({ success: false, message: '对话不存在' });
      }
      historyMessages = chatHistory.messages.map(m => ({ role: m.role, content: m.content }));
    }

    const result = await careerService.callAI(user.aiConfig, message, historyMessages, chatType);

    // 保存消息到历史
    if (!chatHistory) {
      // 新建对话，用用户消息前 20 个字符作为标题
      const title = message.length > 20 ? message.slice(0, 20) + '...' : message;
      chatHistory = new ChatHistory({
        userId: user._id,
        type: chatType,
        title,
        messages: [],
        lastMessageAt: new Date()
      });
    }

    chatHistory.messages.push(result.userMessage);
    chatHistory.messages.push(result.assistantMessage);
    chatHistory.lastMessageAt = new Date();

    // 限制消息数为 MAX_MESSAGES
    if (chatHistory.messages.length > MAX_MESSAGES) {
      chatHistory.messages = chatHistory.messages.slice(-MAX_MESSAGES);
    }

    await chatHistory.save();

    res.json({
      success: true,
      data: {
        response: result.response,
        historyId: chatHistory._id
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// GET /api/career/history - 获取对话列表
export const getHistoryList = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;
    const query = { userId };
    if (type && ['interview', 'resume', 'career'].includes(type)) {
      query.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [list, total] = await Promise.all([
      ChatHistory.find(query)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('title type lastMessageAt createdAt updatedAt')
        .lean(),
      ChatHistory.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: { list, total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/career/history/:id - 获取对话详情
export const getHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const chatHistory = await ChatHistory.findOne({ _id: id, userId }).lean();
    if (!chatHistory) {
      return res.status(404).json({ success: false, message: '对话不存在' });
    }

    res.json({ success: true, data: chatHistory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/career/history/:id - 删除对话
export const deleteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await ChatHistory.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '对话不存在' });
    }

    res.json({ success: true, message: '已删除' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/career/resources - 获取资源列表
export const getResources = async (req, res) => {
  try {
    const { type } = req.query;
    const resources = careerService.getResources(type);
    res.json({ success: true, data: { resources } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};
