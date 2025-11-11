# LLM Chat Integration - Setup Guide

## 概述 Overview

Tree of Life模块现已集成LLM聊天功能，提供智能对话支持，帮助用户更好地探索和表达自己的生命故事。

The Tree of Life module now features integrated LLM chat functionality, providing intelligent conversational support to help users better explore and express their life story.

## 功能特性 Features

### 中文
- ✅ 实时对话交互
- ✅ 上下文感知的回应
- ✅ 根据不同阶段调整引导方式
- ✅ 支持中英文双语
- ✅ 打字指示器和消息动画
- ✅ 自动滚动到最新消息
- ✅ Mock模式（无需API密钥即可测试）

### English
- ✅ Real-time conversational interaction
- ✅ Context-aware responses
- ✅ Stage-specific guidance
- ✅ Bilingual support (EN/CN)
- ✅ Typing indicators and message animations
- ✅ Auto-scroll to latest messages
- ✅ Mock mode (test without API key)

## 快速开始 Quick Start

### 1. 安装依赖 Install Dependencies

```bash
cd plant-therapy-app
npm install
```

### 2. 配置API密钥 Configure API Key (Optional)

#### 方式一 Method 1: 使用环境变量 Using Environment Variables

创建 `.env.local` 文件在项目根目录：
Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

编辑 `.env.local` 并添加你的OpenAI API密钥：
Edit `.env.local` and add your OpenAI API key:

```
REACT_APP_OPENAI_API_KEY=sk-your-actual-api-key-here
```

#### 方式二 Method 2: 使用Mock模式 Using Mock Mode

如果没有API密钥，应用会自动使用Mock响应进行测试。Mock模式提供预设的对话响应，适合开发和演示。

Without an API key, the app automatically uses mock responses for testing. Mock mode provides preset conversational responses, suitable for development and demos.

### 3. 启动应用 Start the App

```bash
npm start
```

应用将在 http://localhost:3000 启动。
The app will start at http://localhost:3000.

## 使用方法 How to Use

### 中文使用指南

1. **选择模块**：在主页点击"生命之树"（Tree of Life）卡片
2. **开始绘制**：点击"开始"按钮进入画布界面
3. **查看聊天面板**：右侧面板显示LLM助手的欢迎消息
4. **互动对话**：
   - 在底部输入框输入你的想法和感受
   - 按Enter键或点击发送按钮
   - LLM会根据当前阶段提供个性化的引导和反馈
5. **继续创作**：边画边聊，深入探索你的生命故事
6. **进入下一阶段**：完成当前部分后，点击"下一步"

### English Usage Guide

1. **Select Module**: Click the "Tree of Life" card on the home page
2. **Start Drawing**: Click the "Start" button to enter the canvas interface
3. **View Chat Panel**: The right panel displays the LLM assistant's welcome message
4. **Interactive Dialogue**:
   - Type your thoughts and feelings in the input box at the bottom
   - Press Enter or click the send button
   - The LLM provides personalized guidance and feedback based on the current stage
5. **Continue Creating**: Draw and chat simultaneously to deeply explore your life story
6. **Move to Next Stage**: Click "Next Step" after completing the current section

## 技术架构 Technical Architecture

### 文件结构 File Structure

```
plant-therapy-app/
├── src/
│   ├── Canvas.js          # 主画布组件（集成聊天功能）
│   ├── Canvas.css         # 样式文件（包含聊天UI样式）
│   ├── llmService.js      # LLM服务封装
│   └── ...
├── .env.example           # 环境变量示例
└── LLM_CHAT_SETUP.md     # 本文档
```

### LLM服务 LLM Service

`llmService.js` 提供以下功能：
- OpenAI API集成
- 系统提示词管理（针对生命之树疗法定制）
- Mock响应生成（用于测试）
- 错误处理
- 支持未来的流式响应

`llmService.js` provides:
- OpenAI API integration
- System prompt management (customized for Tree of Life therapy)
- Mock response generation (for testing)
- Error handling
- Future streaming response support

### 聊天功能 Chat Features

Canvas组件中的聊天功能：
- 消息历史记录管理
- 自动阶段感知（根、树干、枝条）
- 实时打字指示器
- 双语支持
- 消息动画效果

Chat features in Canvas component:
- Message history management
- Automatic stage awareness (roots, trunk, branches)
- Real-time typing indicator
- Bilingual support
- Message animations

## 自定义配置 Customization

### 更换LLM提供商 Change LLM Provider

编辑 `src/llmService.js`：

```javascript
class LLMService {
  constructor() {
    // 更换为其他API
    this.apiEndpoint = 'https://your-llm-api-endpoint';
    this.model = 'your-model-name';
  }
}
```

### 调整系统提示词 Adjust System Prompt

在 `llmService.js` 中修改 `systemPrompt` 对象来自定义LLM的行为和回应风格：

```javascript
this.systemPrompt = {
  en: `Your custom prompt in English...`,
  cn: `你的中文提示词...`
};
```

### 修改UI样式 Modify UI Styles

在 `Canvas.css` 中自定义聊天界面的外观：
- `.chat-message.bot` - 机器人消息样式
- `.chat-message.user` - 用户消息样式
- `.chat-input` - 输入框样式
- `.typing-indicator` - 打字指示器

## 常见问题 FAQ

### Q: 为什么LLM没有响应？
**A**: 检查以下几点：
1. 确认 `.env.local` 文件中的API密钥正确
2. 检查网络连接
3. 查看浏览器控制台是否有错误信息
4. 如果没有API密钥，确认Mock模式是否正常工作

### Q: Why isn't the LLM responding?
**A**: Check the following:
1. Verify the API key in `.env.local` is correct
2. Check your network connection
3. Look for error messages in the browser console
4. If no API key, verify mock mode is working properly

### Q: 如何更改聊天语言？
**A**: 聊天语言会自动跟随应用的语言设置（右上角EN/中切换）。

### Q: How do I change the chat language?
**A**: The chat language automatically follows the app's language setting (toggle EN/中 in the top right).

### Q: Mock响应是否可以自定义？
**A**: 是的，在 `llmService.js` 的 `getMockResponse` 方法中可以修改Mock响应内容。

### Q: Can mock responses be customized?
**A**: Yes, modify the `getMockResponse` method in `llmService.js`.

## API费用说明 API Cost Information

使用OpenAI API会产生费用。请访问 [OpenAI Pricing](https://openai.com/pricing) 了解详情。

建议：
- 开发和测试时使用Mock模式
- 生产环境设置合理的使用限制
- 监控API使用量

Using the OpenAI API incurs costs. Visit [OpenAI Pricing](https://openai.com/pricing) for details.

Recommendations:
- Use mock mode for development and testing
- Set reasonable usage limits in production
- Monitor API usage

## 未来改进 Future Improvements

计划中的功能 Planned features:
- [ ] 语音输入支持
- [ ] 流式响应（实时显示LLM输出）
- [ ] 聊天历史保存
- [ ] 更多LLM提供商选项（Claude, Gemini等）
- [ ] 情感分析和反馈
- [ ] 多模态支持（图像理解）

## 技术支持 Technical Support

如有问题或建议，请联系开发团队或提交Issue。

For questions or suggestions, please contact the development team or submit an Issue.

---

**版本 Version**: 1.0.0  
**最后更新 Last Updated**: 2025-11-04


