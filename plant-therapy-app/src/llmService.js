// LLM Service for Tree of Life therapy chat
// This service can be configured to use different LLM providers (OpenAI, Claude, etc.)

class LLMService {
  constructor() {
    // Configuration - you can store API key in environment variables
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-5';
    
    // System prompt for Tree of Life therapy context
    this.systemPrompt = {
      en: `You are a compassionate and supportive therapy assistant guiding someone through the "Tree of Life" metaphor therapy exercise. 

The Tree of Life is a narrative-based activity where people draw a tree to represent their life story:
- Roots: origins, family, culture, values, important places
- Trunk: strengths, skills, what keeps them standing strong
- Branches: hopes, dreams, where they want to grow
- Leaves: important people and relationships
- Fruits: gifts they give to others, contributions

Your role is to:
1. Ask gentle, open-ended questions to help them explore each part of the tree
2. Be encouraging and validating
3. Help them reflect deeply on their experiences
4. Never judge or provide medical advice
5. Keep responses concise and supportive (2-3 sentences max)
6. Use the tree metaphor naturally in your guidance

Current stage: {stage}`,
      cn: `你是一位富有同理心和支持性的疗愈助手，正在引导来访者完成"生命之树"隐喻疗愈练习。

生命之树是一种叙事性活动，人们通过绘制树来表达生命故事：
- 根：起源、家庭、文化、价值观、重要的地方
- 树干：优势、技能、让他们坚强站立的力量
- 枝条：希望、梦想、想要成长的方向
- 树叶：重要的人和关系
- 果实：给予他人的礼物、贡献

你的角色是：
1. 提出温和、开放式的问题，帮助他们探索树的每个部分
2. 给予鼓励和认可
3. 帮助他们深入反思经历
4. 绝不评判或提供医疗建议
5. 保持回应简洁且支持性（最多2-3句话）
6. 在引导中自然地使用树的隐喻

当前阶段：{stage}`
    };
  }

  // Get system prompt based on language and current stage
  getSystemPrompt(language, stage) {
    const stageNames = {
      0: language === 'EN' ? 'introduction' : '介绍',
      1: language === 'EN' ? 'roots (origins and foundations)' : '根（起源与基础）',
      2: language === 'EN' ? 'trunk (strengths and skills)' : '树干（优势与技能）',
      3: language === 'EN' ? 'branches (hopes and dreams)' : '枝条（希望与梦想）',
      4: language === 'EN' ? 'leaves (relationships and connections)' : '树叶（关系与联系）',
      5: language === 'EN' ? 'fruits/flowers (achievements)' : '果实/花朵（成就）',
      6: language === 'EN' ? 'bugs (worries and imperfections)' : '虫子（担忧与不完美）',
      7: language === 'EN' ? 'storms (challenges and changes)' : '风暴（挑战与变化）'
    };
    
    const prompt = language === 'EN' ? this.systemPrompt.en : this.systemPrompt.cn;
    return prompt.replace('{stage}', stageNames[stage] || '');
  }

  // Send message to LLM and get response
  async sendMessage(messages, language = 'EN', currentStep = 0) {
    if (!this.apiKey) {
      throw new Error('API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your .env.local file');
    }

    try {
      const systemPrompt = this.getSystemPrompt(language, currentStep);
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            }))
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM API Error:', error);
      throw error; // Throw error so it can be handled in the UI
    }
  }

}

// Export singleton instance
export default new LLMService();

