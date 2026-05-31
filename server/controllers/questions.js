import * as questionsService from '../services/questions.js';

// GET /api/questions - 获取题目列表
export const getList = async (req, res) => {
  try {
    const result = await questionsService.getList(req.query);

    // 未登录用户隐藏部分答案
    if (!req.user) {
      result.questions = result.questions.map(q => {
        const question = q.toObject();
        if (question.answer && question.answer.length > 20) {
          question.answer = question.answer.substring(0, 20) + '...';
        }
        return question;
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// GET /api/questions/stats - 获取统计（需要在 /:id 之前）
export const getStats = async (req, res) => {
  try {
    const stats = await questionsService.getStats(req.user._id);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// GET /api/questions/:id - 获取题目详情
export const getById = async (req, res) => {
  try {
    const question = await questionsService.getById(req.params.id);

    // 未登录用户隐藏完整答案
    if (!req.user) {
      const q = question.toObject ? question.toObject() : { ...question };
      if (q.answer && q.answer.length > 20) {
        q.answer = q.answer.substring(0, 20) + '...';
      }
      return res.json({ success: true, data: { question: q } });
    }

    res.json({ success: true, data: { question } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions - 创建题目
export const create = async (req, res) => {
  try {
    const question = await questionsService.create(req.body, req.user._id);
    res.status(201).json({ success: true, data: { question } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// PUT /api/questions/:id - 更新题目
export const update = async (req, res) => {
  try {
    const question = await questionsService.update(req.params.id, req.body, req.user);
    res.json({ success: true, data: { question } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// DELETE /api/questions/:id - 删除题目
export const deleteQuestion = async (req, res) => {
  try {
    await questionsService.deleteQuestion(req.params.id, req.user);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/import - 批量导入
export const importQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }
    const result = await questionsService.bulkImport(req.file, req.user._id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/:id/approve - 审核通过
export const approve = async (req, res) => {
  try {
    const question = await questionsService.approve(req.params.id, req.user._id);
    res.json({ success: true, data: { question } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/:id/reject - 审核拒绝
export const reject = async (req, res) => {
  try {
    const question = await questionsService.reject(req.params.id, req.user._id);
    res.json({ success: true, data: { question } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/:id/practice - 练习答题
export const practice = async (req, res) => {
  try {
    const { userAnswer } = req.body;
    if (!userAnswer) {
      return res.status(400).json({ success: false, message: '请提供答案' });
    }
    const result = await questionsService.practice(req.params.id, req.user._id, userAnswer);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/:id/ai-score - AI 评分
export const aiScore = async (req, res) => {
  try {
    const { userAnswer } = req.body;
    if (!userAnswer) {
      return res.status(400).json({ success: false, message: '请提供答案' });
    }

    const user = req.user;
    if (!user.aiConfig || !user.aiConfig.enabled) {
      return res.status(400).json({ success: false, message: '请先配置 AI 评分功能' });
    }

    const result = await questionsService.aiScore(
      req.params.id,
      user._id,
      userAnswer,
      user.aiConfig
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/:id/ai-answer - AI 生成答案
export const aiAnswer = async (req, res) => {
  try {
    const user = req.user;
    if (!user.aiConfig || !user.aiConfig.enabled) {
      return res.status(400).json({ success: false, error: '请先配置 AI 功能' });
    }

    const result = await questionsService.aiGenerateAnswer(
      req.params.id,
      user.aiConfig
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// GET /api/questions/:id/share - 生成分享图片
export const share = async (req, res) => {
  try {
    const imageBuffer = await questionsService.share(req.params.id);
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/questions/:id/feedback - 提交反馈
export const submitFeedback = async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!type || !content) {
      return res.status(400).json({ success: false, message: '请提供反馈类型和内容' });
    }
    const feedbackRecord = await questionsService.feedback(
      req.params.id,
      req.user._id,
      type,
      content
    );
    res.json({ success: true, data: { feedback: feedbackRecord } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};
