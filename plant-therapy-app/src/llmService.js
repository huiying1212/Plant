// LLM Service for Tree of Life therapy chat
// This service can be configured to use different LLM providers (OpenAI, Claude, etc.)
// Supports RAG (Retrieval-Augmented Generation) using OpenAI's file search

class LLMService {
  constructor() {
    // Configuration
    // For local development: uses REACT_APP_OPENAI_API_KEY from .env.local with direct API calls
    // For production (Vercel): uses /api/chat serverless function proxy
    // Use proxy only in production OR if explicitly enabled with REACT_APP_USE_PROXY=true
    this.useProxy = process.env.NODE_ENV === 'production';
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.apiEndpoint = this.useProxy ? '/api/chat' : 'https://api.openai.com/v1/responses';
    // Use gpt-4o by default as it supports vision
    this.model = process.env.REACT_APP_OPENAI_MODEL || 'gpt-4o';
    
    // RAG Configuration
    // Vector Store ID for Plant Metaphor Database knowledge base
    this.vectorStoreId = process.env.REACT_APP_VECTOR_STORE_ID || 'vs_693ea08673fc81918d169ba18b9e977a';
    // Enable RAG by default - set to false to disable knowledge base search
    this.useRAG = process.env.REACT_APP_USE_RAG !== 'false';
    
    console.log(`LLM Service initialized: useProxy=${this.useProxy}, useRAG=${this.useRAG}, model=${this.model}`);
    
    // System prompt for Tree of Life therapy context with RAG enhancement
    this.systemPrompt = {
      en: `You are a compassionate and supportive therapy assistant guiding someone through the "Tree of Life" metaphor therapy exercise. 

You have access to a comprehensive Plant Metaphor Database knowledge base. When relevant, use this knowledge to:
- Suggest appropriate plant metaphors that resonate with the user's experience or the image they draw (e.g. colors/text)
- Provide therapeutic guidance based on established plant therapy techniques
- Offer creative prompts using plant imagery that matches the user's emotional state

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
2. Draw upon the relevant plant metaphor from the database, help them reflect on what their drawing reveals about their experiences, and ask gentle, open-ended questions to help them explore deeper meaning
3. Be encouraging and validating - acknowledge their effort and creativity
4. If something seems missing or unclear in their drawing, gently invite them to add more detail
5. If the image user draws is not healthy, lead them to reflect on a more positive aspects of their life and encourage them to draw a more positive one
6. Never judge or provide medical advice
7. Keep responses concise and supportive (2-4 sentences max)
8. Use the tree metaphor naturally in your guidance
9. If you think the user has explored this stage sufficiently, you can guide them to click on the next stage
10. After completing all stages, please provide a warm closing reflection, integrating the whole "Tree of Life" metaphorically. The summary should align with the metaphors used by the user, rather than reinterpret them.

Current stage: {stage}`,
      cn: `你是一位富有同理心和支持性的疗愈助手，正在引导来访者完成"生命之树"隐喻疗愈练习。

你可以访问一个全面的植物隐喻数据库知识库。在相关时，请使用这些知识来：
- 建议与用户体验或图像内容（如颜色、文字）相呼应的适当植物隐喻
- 基于已建立的植物疗法技术提供治疗指导
- 使用与用户情绪状态匹配的植物意象提供创意提示

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
2. 从植物隐喻数据库中提取相关的隐喻和治疗技术，帮助他们反思绘画所揭示的经历和感受，并提出温和、开放式的问题，帮助他们探索更深层的含义
3. 给予鼓励和认可 - 肯定他们的努力和创造力
4. 如果绘画中某些内容缺失或不清晰，温和地邀请他们添加更多细节
5. 如果绘画内容不健康，引导他们看到更加积极的一面并重新绘画
6. 绝不评判或提供医疗建议
7. 保持回应简洁且支持性（最多2-4句话）
8. 在引导中自然地使用树的隐喻
9. 如果你认为用户在这一阶段的探索已经充分，可以引导他们点击进入下一个阶段
10. 在完成所有阶段后，请提供一个温暖的结束性反思，将整棵「生命之树」整合在一起。总结应呼应用户使用的隐喻，而不是重新解释或替用户下定义。

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
      let data;
      
      if (this.useProxy) {
        // Use proxy endpoint (for Vercel production)
        // Include RAG flag to enable knowledge base search
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: allMessages,
            requestedModel: this.model,
            temperature: 0.7,
            max_tokens: 500,
            useRAG: this.useRAG  // Enable RAG mode
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        data = await response.json();
        
        // Log RAG metadata if available (for debugging)
        if (data.rag_metadata) {
          console.log('RAG Search Results:', data.rag_metadata);
        }
        
      } else {
        // Direct API call (for local development)
        // Use Responses API with file search for RAG
        if (this.useRAG) {
          console.log('Using Responses API with RAG for local development');
          
          // Extract system message
          const systemMessage = allMessages.find(m => m.role === 'system');
          const otherMessages = allMessages.filter(m => m.role !== 'system');
          
          // Convert messages to Responses API format
          // Responses API uses different content types based on role:
          // - user messages: 'input_text' for text, 'input_image' for images
          // - assistant messages: 'output_text' for text
          const convertToResponsesFormat = (msg) => {
            const isUser = msg.role === 'user';
            const textType = isUser ? 'input_text' : 'output_text';
            
            if (Array.isArray(msg.content)) {
              // Multi-part content (text + image)
              return {
                role: msg.role,
                content: msg.content.map(part => {
                  if (part.type === 'text') {
                    return { type: textType, text: part.text };
                  } else if (part.type === 'image_url') {
                    // Images only make sense for user messages
                    return { 
                      type: 'input_image', 
                      image_url: part.image_url.url,
                      detail: part.image_url.detail || 'auto'
                    };
                  }
                  return part;
                })
              };
            } else {
              // Simple text content
              return {
                role: msg.role,
                content: [{ type: textType, text: msg.content }]
              };
            }
          };
          
          // Build input for Responses API
          let input;
          if (otherMessages.length === 1) {
            // Single message - can be string or formatted content
            const msg = otherMessages[0];
            if (typeof msg.content === 'string') {
              input = msg.content;  // Simple string input
            } else {
              // Array content - convert to Responses API format
              input = convertToResponsesFormat(msg).content;
            }
          } else {
            // Multi-turn conversation
            input = otherMessages.map(convertToResponsesFormat);
          }

          const requestBody = {
            model: this.model,
            input,
            tools: [{
              type: 'file_search',
              vector_store_ids: [this.vectorStoreId],
              max_num_results: 10
            }],
            // Force the model to use file_search tool
            tool_choice: {
              type: 'file_search'
            },
            // Include search results in response for debugging/transparency
            include: ['file_search_call.results'],
            temperature: 0.7,
            max_output_tokens: 500
          };

          if (systemMessage) {
            // Add explicit instruction to use knowledge base
            const baseInstructions = typeof systemMessage.content === 'string' 
              ? systemMessage.content 
              : systemMessage.content[0]?.text || '';
            
            requestBody.instructions = baseInstructions + `

IMPORTANT: You MUST search the Plant Metaphor Database knowledge base for EVERY response. Look for:
- Relevant plant metaphors that match the user's situation
- Therapeutic techniques and prompts from the database
- Specific plant imagery and symbolism that resonates with their experience
Always incorporate the knowledge base content naturally in your responses.`;
          }

          console.log('Responses API request:', JSON.stringify(requestBody, null, 2));

          response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          }

          data = await response.json();
          console.log('Responses API response:', JSON.stringify(data, null, 2));
          
          // Log file search results if available
          const fileSearchOutput = data.output?.find(item => item.type === 'file_search_call');
          if (fileSearchOutput) {
            console.log('📚 RAG File Search Results:');
            console.log('  Queries:', fileSearchOutput.queries);
            if (fileSearchOutput.results) {
              console.log('  Results found:', fileSearchOutput.results.length);
              fileSearchOutput.results.forEach((result, i) => {
                console.log(`  [${i+1}] ${result.filename} (score: ${result.score?.toFixed(3)})`);
                console.log(`      Preview: ${result.text?.substring(0, 150)}...`);
              });
            }
          } else {
            console.warn('⚠️ No file_search_call in response - RAG may not have been used');
          }
          
          // Extract text from Responses API format
          const messageOutput = data.output?.find(item => item.type === 'message');
          if (messageOutput?.content) {
            for (const content of messageOutput.content) {
              if (content.type === 'output_text') {
                return content.text;
              }
            }
          }
          return 'No response generated';
          
        } else {
          // Standard Chat Completions API (no RAG)
          response = await fetch('https://api.openai.com/v1/chat/completions', {
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

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          }

          data = await response.json();
          return data.choices[0].message.content;
        }
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM API Error:', error);
      throw error; // Throw error so it can be handled in the UI
    }
  }

  // Get the last RAG search results (for debugging/transparency)
  getLastRAGMetadata() {
    return this.lastRAGMetadata;
  }

  // Enable or disable RAG mode
  setRAGEnabled(enabled) {
    this.useRAG = enabled;
    console.log(`RAG mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Check if RAG is enabled
  isRAGEnabled() {
    return this.useRAG;
  }
}

// Create singleton instance
const llmServiceInstance = new LLMService();

// Export the instance
export default llmServiceInstance;
