import { callChatCompletions } from './aiClient.js';
import { badRequest } from '../utils/HttpError.js';

const SYSTEM_PROMPTS = {
  interview: `你是一位专业的面试辅导顾问。当用户开始对话时，先友好地问候，然后根据用户描述的具体情况给出针对性建议。
回答时使用 markdown 格式，包括：
- 用 **粗体** 强调关键点
- 用 \`代码块\` 展示示例回答
- 用有序列表梳理步骤
- 用 > 引用块给出面试技巧

不要一开始就列出所有功能，而是根据用户的实际问题给出精准、实用的回答。`,

  resume: `你是一位专业的简历优化顾问。当用户开始对话时，先友好地问候，然后根据用户提供的简历内容或描述给出针对性优化建议。
回答时使用 markdown 格式，包括：
- 用 **粗体** 强调关键优化点
- 用 > 引用块展示优化前后对比
- 用有序列表梳理修改步骤
- 用表格对比不同写法的优劣

不要一开始就列出所有功能，而是根据用户的具体简历问题给出精准、实用的回答。`,

  career: `你是一位专业的职场规划顾问。当用户开始对话时，先友好地问候，然后根据用户的背景和目标给出针对性建议。
回答时使用 markdown 格式，包括：
- 用 **粗体** 强调关键建议
- 用有序列表梳理发展路径
- 用 > 引用块给出行业洞察
- 用表格对比不同选择的利弊

不要一开始就列出所有功能，而是根据用户的实际困惑给出精准、实用的回答。`
};

const PRESET_RESOURCES = {
  interview: [
    {
      id: 'interview-common',
      title: '常见面试问题题库',
      type: 'question-bank',
      description: '涵盖自我介绍、优缺点、离职原因、薪资期望等高频面试问题及回答技巧',
      items: [
        { question: '请做一个自我介绍', tips: '控制在 1-2 分钟，突出与岗位相关的经历和技能' },
        { question: '你的优缺点是什么', tips: '优点结合岗位需求，缺点选择可改进且不影响工作的方面' },
        { question: '为什么离开上一家公司', tips: '避免负面评价前公司，聚焦个人发展和新机会' },
        { question: '你的期望薪资是多少', tips: '提前调研市场行情，给出合理范围而非具体数字' },
        { question: '你对未来 5 年有什么规划', tips: '展示清晰的职业目标，与公司发展方向一致' }
      ]
    },
    {
      id: 'interview-star',
      title: 'STAR 法则行为面试指南',
      type: 'guide',
      description: '掌握 Situation-Task-Action-Result 框架，高效回答行为面试问题',
      items: [
        { step: 'Situation（情境）', description: '描述当时的背景和面临的情境' },
        { step: 'Task（任务）', description: '说明你需要完成的具体任务或目标' },
        { step: 'Action（行动）', description: '详细描述你采取的具体行动和步骤' },
        { step: 'Result（结果）', description: '量化展示行动带来的成果和影响' }
      ]
    },
    {
      id: 'interview-technical',
      title: '技术面试知识点速查',
      type: 'reference',
      description: '覆盖数据结构、算法、系统设计、数据库等核心技术面试考点',
      categories: ['数据结构与算法', '系统设计', '数据库', '网络协议', '操作系统', '编程语言特性']
    }
  ],
  resume: [
    {
      id: 'resume-fresh',
      title: '应届生简历模板',
      type: 'template',
      description: '适合应届毕业生，突出教育背景、实习经历和项目经验',
      sections: ['个人信息', '教育背景', '实习经历', '项目经验', '技能证书', '自我评价'],
      tips: '重点展示学习能力和项目经历，实习经历用 STAR 法则描述'
    },
    {
      id: 'resume-experienced',
      title: '有经验求职者简历模板',
      type: 'template',
      description: '适合有 3 年以上工作经验的求职者，突出工作成就和专业技能',
      sections: ['个人信息', '工作经历', '核心项目', '专业技能', '教育背景'],
      tips: '工作经历按时间倒序排列，每段经历用 3-5 个量化成就描述'
    },
    {
      id: 'resume-manager',
      title: '管理层简历模板',
      type: 'template',
      description: '适合管理岗位求职者，突出团队管理经验和业务成果',
      sections: ['个人信息', '职业概要', '管理经验', '核心成就', '行业影响', '教育背景'],
      tips: '突出管理幅度（团队人数、预算规模）和业务成果（增长率、成本节约）'
    },
    {
      id: 'resume-writing-guide',
      title: '简历写作技巧指南',
      type: 'guide',
      description: '从 HR 视角出发，教你写出通过筛选的高质量简历',
      tips: [
        '使用动词开头描述工作成就（如：主导、优化、搭建）',
        '量化成果（如：提升效率 30%、管理 10 人团队）',
        '针对不同岗位定制简历，突出相关经验',
        '控制在 1-2 页，排版简洁清晰',
        '使用行业关键词，提高 ATS 系统通过率'
      ]
    }
  ],
  career: [
    {
      id: 'career-industry',
      title: '热门行业分析报告',
      type: 'analysis',
      description: '2024-2025 年热门行业发展趋势、薪资水平和人才需求分析',
      industries: [
        { name: '人工智能', trend: '上升', demand: '高', avgSalary: '25-60K' },
        { name: '新能源', trend: '上升', demand: '高', avgSalary: '15-40K' },
        { name: '半导体', trend: '上升', demand: '中高', avgSalary: '20-50K' },
        { name: '生物医药', trend: '稳定', demand: '中', avgSalary: '15-35K' },
        { name: '金融科技', trend: '稳定', demand: '中', avgSalary: '20-45K' }
      ]
    },
    {
      id: 'career-skills',
      title: '职业技能图谱',
      type: 'skill-map',
      description: '各岗位核心技能要求和发展路径参考',
      tracks: [
        { role: '前端工程师', coreSkills: ['JavaScript/TypeScript', 'React/Vue', 'CSS', '工程化'], advancedSkills: ['架构设计', '性能优化', '跨端开发'] },
        { role: '后端工程师', coreSkills: ['Java/Go/Python', '数据库', 'Linux', 'API 设计'], advancedSkills: ['分布式系统', '微服务架构', '高并发'] },
        { role: '产品经理', coreSkills: ['需求分析', '竞品分析', '原型设计', '数据分析'], advancedSkills: ['商业思维', '战略规划', '团队管理'] },
        { role: '数据分析师', coreSkills: ['SQL', 'Python/R', 'Excel', '数据可视化'], advancedSkills: ['机器学习', '数据建模', '业务洞察'] }
      ]
    },
    {
      id: 'career-path',
      title: '职业发展路径指南',
      type: 'guide',
      description: '从初级到高级的职业发展阶段和晋升策略',
      stages: [
        { level: '初级（0-2 年）', focus: '夯实基础技能，积累项目经验', goal: '独立完成模块开发' },
        { level: '中级（3-5 年）', focus: '深耕专业领域，培养技术广度', goal: '负责核心系统设计' },
        { level: '高级（5-8 年）', focus: '技术领导力，架构能力', goal: '带领团队攻克技术难题' },
        { level: '专家/管理（8+ 年）', focus: '战略思维，行业影响力', goal: '技术决策与团队建设' }
      ]
    },
    {
      id: 'career-job-search',
      title: '求职策略手册',
      type: 'guide',
      description: '从准备到入职的全流程求职策略',
      steps: [
        { phase: '准备期', actions: ['明确求职目标', '梳理个人优势', '更新简历和作品集'] },
        { phase: '投递期', actions: ['多渠道投递（内推 > 猎头 > 平台）', '定制化简历', '跟踪投递进度'] },
        { phase: '面试期', actions: ['充分准备常见问题', '调研目标公司', '模拟面试练习'] },
        { phase: '决策期', actions: ['综合评估 offer（薪资、发展、文化）', '合理谈判', '优雅离职入职'] }
      ]
    }
  ]
};

export const callAI = async (aiConfig, message, history, type) => {
  const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.career;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: message }
  ];

  try {
    const data = await callChatCompletions(aiConfig, messages, {
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = data.choices?.[0]?.message?.content || '';
    return {
      response: content,
      userMessage: { role: 'user', content: message },
      assistantMessage: { role: 'assistant', content }
    };
  } catch (err) {
    throw badRequest('AI API request failed: ' + err.message);
  }
};

export const getResources = (type) => {
  if (type && PRESET_RESOURCES[type]) {
    return PRESET_RESOURCES[type];
  }
  if (!type) {
    return PRESET_RESOURCES;
  }
  return [];
};
