// LLM Service for Tree of Life therapy chat
// This service can be configured to use different LLM providers (OpenAI, Claude, etc.)

class LLMService {
  constructor() {
    // Configuration
    // For local development: uses REACT_APP_OPENAI_API_KEY from .env.local
    // For production (Vercel): uses /api/chat serverless function proxy
    this.useProxy = process.env.NODE_ENV === 'production' || process.env.REACT_APP_USE_PROXY === 'true';
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.apiEndpoint = this.useProxy ? '/api/chat' : 'https://api.openai.com/v1/chat/completions';
    // Use gpt-4o by default as it supports vision
    this.model = process.env.REACT_APP_OPENAI_MODEL || 'gpt-4o';
    
    // System prompt for Tree of Life therapy context
    this.systemPrompt = {
      en: `You are a compassionate and supportive therapy assistant guiding someone through the "Tree of Life" metaphor therapy exercise. 

The Tree of Life is a narrative-based activity where people draw a tree to represent their life story:
- Roots: origins, family, culture, values, important places
- Trunk: strengths, skills, what keeps them standing strong
- Branches: hopes, dreams, where they want to grow
- Leaves: important people and relationships
- Fruits/Flowers: achievements, accomplishments, what they're proud of
- Bugs: worries, anxieties, imperfections
- Storms: challenges, major life changes

Your role is to:
1. When you receive a drawing, observe and comment on what you see - colors used, symbols drawn, text added, overall feeling
2. Ask gentle, open-ended questions to help them explore deeper meaning
3. Be encouraging and validating - acknowledge their effort and creativity
4. Help them reflect on what their drawing reveals about their experiences
5. If something seems missing or unclear in their drawing, gently invite them to add more detail
6. Never judge or provide medical advice
7. Keep responses concise and supportive (2-4 sentences max)
8. Use the tree metaphor naturally in your guidance

Current stage: {stage}`,
      cn: `你是一位富有同理心和支持性的疗愈助手，正在引导来访者完成"生命之树"隐喻疗愈练习。

生命之树是一种叙事性活动，人们通过绘制树来表达生命故事：
- 根：起源、家庭、文化、价值观、重要的地方
- 树干：优势、技能、让他们坚强站立的力量
- 枝条：希望、梦想、想要成长的方向
- 树叶：重要的人和关系
- 果实/花朵：成就、成果、感到自豪的事情
- 虫子：担忧、焦虑、不完美之处
- 风暴：挑战、重大生活变化

你的角色是：
1. 当收到绘画时，观察并评论你看到的内容 - 使用的颜色、绘制的符号、添加的文字、整体感觉
2. 提出温和、开放式的问题，帮助他们探索更深层的含义
3. 给予鼓励和认可 - 肯定他们的努力和创造力
4. 帮助他们反思绘画所揭示的经历和感受
5. 如果绘画中某些内容缺失或不清晰，温和地邀请他们添加更多细节
6. 绝不评判或提供医疗建议
7. 保持回应简洁且支持性（最多2-4句话）
8. 在引导中自然地使用树的隐喻

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
    // Check API key only if not using proxy
    if (!this.useProxy && !this.apiKey) {
      throw new Error('API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your .env.local file');
    }

    try {
      const systemPrompt = this.getSystemPrompt(language, currentStep);
      
      // Prepare messages
      const allMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => {
          const role = msg.sender === 'user' ? 'user' : 'assistant';
          
          // If message has an image, format for vision API
          if (msg.image && msg.sender === 'user') {
            return {
              role: role,
              content: [
                {
                  type: 'text',
                  text: msg.text
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: msg.image,
                    detail: 'high'
                  }
                }
              ]
            };
          }
          
          // Regular text message
          return {
            role: role,
            content: msg.text
          };
        })
      ];

      let response;
      
      if (this.useProxy) {
        // Use proxy endpoint (for Vercel production)
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: allMessages,
            requestedModel: this.model,
            temperature: 0.7,
            max_tokens: 500
          })
        });
      } else {
        // Direct API call (for local development)
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: allMessages,
            temperature: 0.7,
            max_tokens: 500
          })
        });
      }

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

// Create singleton instance
const llmServiceInstance = new LLMService();

// Export the instance
export default llmServiceInstance;

