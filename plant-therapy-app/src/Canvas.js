import React, { useState, useRef, useEffect } from 'react';
import './Canvas.css';
import llmService from './llmService';

function Canvas({ language, onClose }) {
  const canvasRef = useRef(null);
  const chatMessagesEndRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen'); // pen, fill, eraser
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [currentColor, setCurrentColor] = useState('#EA5851');
  const [recentColors, setRecentColors] = useState(['#EA5851']);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showAudioInput, setShowAudioInput] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [textInputValue, setTextInputValue] = useState('');
  const [canvasTexts, setCanvasTexts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(null);
  
  // Chat-related state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLLMTyping, setIsLLMTyping] = useState(false);

  const colorPalette = [
    '#EA5851', '#FF8C42', '#FFD93D', '#6BCF7F',
    '#4ECDC4', '#45B7D1', '#2E3A87', '#9B59B6',
    '#000000', '#FFFFFF'
  ];

  const colorWheelPalette = [
    '#EA3323', '#FFFFFF', '#F09837', '#F9DA4A',
    '#9BFC59', '#AEFCDB', '#60D1FA', '#7838F5',
    '#CCCCCC'
  ];

  const steps = [
    {
      titleEN: 'Tree of Life',
      titleCN: '生命之树',
      instructionEN: "Let's start by drawing the roots of your tree.",
      instructionCN: '我们先从画出你生命之树的根开始吧。',
      descriptionEN: 'Think about your origins and foundations.\nDraw or write what has shaped you - family, culture, values, important places.',
      descriptionCN: '回想你人生的起点与支撑力量。\n可以画下或写下那些塑造你的元素——例如家庭、文化、价值观、重要的地方……'
    },
    {
      titleEN: 'Tree of Life',
      titleCN: '生命之树',
      instructionEN: 'Now draw the trunk of your tree.',
      instructionCN: '现在画出你的树干。',
      descriptionEN: 'Think about your strengths and skills.\nWhat keeps you standing strong?',
      descriptionCN: '想想你的优势和技能。\n是什么让你坚强地站立？'
    },
    {
      titleEN: 'Tree of Life',
      titleCN: '生命之树',
      instructionEN: 'Add branches to your tree.',
      instructionCN: '为你的树添加枝条。',
      descriptionEN: 'Think about your hopes and dreams.\nWhere do you want to grow?',
      descriptionCN: '想想你的希望和梦想。\n你想在哪里成长？'
    }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Initial setup
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load and draw SVG files from public/canvas/1/English
      const svgFiles = [
        'Chatbot 02 (ROOT)-01.svg',
        'Chatbot 03 (TRUNK)_画板 6.svg',
        'Chatbot 04 (BRANCH)_画板 7.svg',
        'Chatbot 05 (LEAVES)_画板 9.svg',
        'Chatbot 06 (FLOWER)_画板 9.svg',
        'Chatbot 07 (BUG)_画板 10.svg',
        'Chatbot 08 (STORM)_画板 11.svg'
      ];
      
      // Calculate position: center slightly to the left
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const offsetX = -150; // Offset to the left (negative = left)
      const startX = centerX + offsetX;
      const startY = centerY;
      
      // Load and draw each SVG
      let loadedCount = 0;
      const svgImages = [];
      let svgsDrawn = false; // Flag to ensure SVGs are only drawn once
      
      const drawSVGs = () => {
        if (svgsDrawn) return; // Don't redraw if already drawn
        
        // Check if all images are loaded
        const allLoaded = svgImages.every((img, idx) => img && img.complete);
        
        if (allLoaded && loadedCount === svgFiles.length) {
          // Draw all SVGs at the same position to form a complete tree
          const scale = 1; // Scale factor to make SVGs larger (2x = double size)
          
          svgImages.forEach((svgImg, idx) => {
            if (svgImg && svgImg.complete) {
              // Use original dimensions from viewBox (655x493) and apply scale
              const baseWidth = 655;
              const baseHeight = 493;
              const svgWidth = baseWidth * scale;
              const svgHeight = baseHeight * scale;
              
              // All SVGs at the same position (center slightly to the left)
              const x = startX - svgWidth / 2;
              const y = startY - svgHeight / 2;
              
              // Draw the SVG image with scaled size while maintaining aspect ratio
              ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
            }
          });
          
          svgsDrawn = true;
          saveToHistory();
        }
      };
      
      svgFiles.forEach((svgFile, index) => {
        const img = new Image();
        img.onload = () => {
          svgImages[index] = img;
          loadedCount++;
          drawSVGs();
        };
        img.onerror = (error) => {
          console.error(`Error loading SVG: ${svgFile}`, error);
          loadedCount++;
          if (loadedCount === svgFiles.length) {
            drawSVGs();
          }
        };
        // Use encodeURIComponent to handle special characters in filename
        img.src = `/canvas/1/English/${encodeURIComponent(svgFile)}`;
      });
      
      // Handle resize - preserve existing content
      const resizeCanvas = () => {
        const currentImage = canvas.toDataURL();
        const img = new Image();
        img.onload = () => {
          const oldWidth = canvas.width;
          const oldHeight = canvas.height;
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const newCtx = canvas.getContext('2d');
          newCtx.fillStyle = '#F5F5F5';
          newCtx.fillRect(0, 0, canvas.width, canvas.height);
          // Draw the old content
          newCtx.drawImage(img, 0, 0, oldWidth, oldHeight, 0, 0, oldWidth, oldHeight);
          saveToHistory();
        };
        img.src = currentImage;
      };
      
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, []);

  // Initialize chat with welcome message when component mounts or step changes
  useEffect(() => {
    const welcomeMessage = {
      sender: 'bot',
      text: language === 'EN' ? steps[currentStep]?.instructionEN : steps[currentStep]?.instructionCN,
      timestamp: new Date().toISOString()
    };
    setChatMessages([welcomeMessage]);
  }, [currentStep, language]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send message to LLM
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isLLMTyping) return;

    const userMessage = {
      sender: 'user',
      text: chatInput,
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsLLMTyping(true);

    try {
      // Get LLM response from GPT-5
      const llmResponse = await llmService.sendMessage(
        updatedMessages,
        language,
        currentStep
      );

      // Add LLM response to chat
      const botMessage = {
        sender: 'bot',
        text: llmResponse,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages([...updatedMessages, botMessage]);
    } catch (error) {
      console.error('Error communicating with LLM:', error);
      
      // Show user-friendly error message
      let errorText;
      if (error.message.includes('API key')) {
        errorText = language === 'EN' 
          ? "API key not configured. Please check your .env.local file."
          : "API密钥未配置。请检查您的.env.local文件。";
      } else if (error.message.includes('401')) {
        errorText = language === 'EN' 
          ? "Invalid API key. Please check your credentials."
          : "无效的API密钥。请检查您的凭证。";
      } else if (error.message.includes('429')) {
        errorText = language === 'EN' 
          ? "Rate limit reached. Please try again in a moment."
          : "已达到速率限制。请稍后重试。";
      } else {
        errorText = language === 'EN' 
          ? "I'm having trouble connecting right now. Please try again."
          : "我现在遇到连接问题。请重试。";
      }
      
      const errorMessage = {
        sender: 'bot',
        text: errorText,
        timestamp: new Date().toISOString()
      };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLLMTyping(false);
    }
  };

  // Handle Enter key press in chat input
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(canvas.toDataURL());
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = history[historyStep - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistoryStep(historyStep - 1);
      };
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = history[historyStep + 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistoryStep(historyStep + 1);
      };
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    if (currentTool === 'pen') {
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = brushOpacity / 100;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = '#F5F5F5';
      ctx.globalAlpha = 1;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const selectColor = (color) => {
    setCurrentColor(color);
    if (!recentColors.includes(color)) {
      setRecentColors([color, ...recentColors.slice(0, 7)]);
    }
  };

  const addTextToCanvas = () => {
    if (textInputValue.trim()) {
      setCanvasTexts([...canvasTexts, {
        text: textInputValue,
        x: 100,
        y: 100 + canvasTexts.length * 30
      }]);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.font = '16px Avenir, sans-serif';
      ctx.fillStyle = currentColor;
      ctx.fillText(textInputValue, 100, 100 + canvasTexts.length * 30);
      
      setTextInputValue('');
      setShowTextInput(false);
      saveToHistory();
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleSaveAndFinish = () => {
    // Save canvas and close
    onClose();
  };

  if (isCompleted) {
    return (
      <div className="canvas-container">
        <div className="completion-screen">
          <img src="/element/cheers.svg" alt="Celebration" className="cheers-icon" />
          
          <div className="completion-message">
            <h2>{language === 'EN' ? 'You Completed It!' : '你完成啦！'}</h2>
            <p>
              {language === 'EN' 
                ? 'Say aloud: "I just worked on my mental health. I\'m proud of myself."'
                : '请你大声说："我刚刚为自己的心理健康做了一件事，我为自己感到骄傲。"'}
            </p>
          </div>

          <div className="rating-section">
            <p className="rating-question">
              {language === 'EN' ? 'Do this reflection feel helpful today?' : '今天的反思对你有帮助吗？'}
            </p>
            <div className="rating-options">
              <button 
                className={`rating-card ${rating === 'yes' ? 'active' : ''}`}
                onClick={() => setRating('yes')}
              >
                {language === 'EN' ? 'YES' : '有'}
              </button>
              <button 
                className={`rating-card ${rating === 'no' ? 'active' : ''}`}
                onClick={() => setRating('no')}
              >
                {language === 'EN' ? 'NO' : '没有'}
              </button>
              <button 
                className={`rating-card ${rating === 'little' ? 'active' : ''}`}
                onClick={() => setRating('little')}
              >
                {language === 'EN' ? 'A LITTLE' : '一点点'}
              </button>
            </div>
          </div>

          <button 
            className={`save-finish-button ${rating ? 'active' : ''}`}
            onClick={handleSaveAndFinish}
            disabled={!rating}
          >
            {language === 'EN' ? 'Save & Finish' : '保存并退出'}
          </button>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep] || {};

  const sampleRoots = [
    {
      color: '#B78A60',
      entriesEN: ['Faith', 'Mom', 'Grandfather', 'Family'],
      entriesCN: ['信仰', '妈妈', '外公', '家人']
    },
    {
      color: '#F3A6C4',
      entriesEN: ['Hometown', 'Piano', 'My students'],
      entriesCN: ['家乡', '钢琴', '我的学生']
    },
    {
      color: '#F1C453',
      entriesEN: ['My 3 cats: Bella, Juniper, Kiki', 'My friend Lina'],
      entriesCN: ['我的三只猫：贝拉、杜松、琪琪', '朋友丽娜']
    }
  ];

  const renderTextWithBreaks = (text = '') => {
    const lines = text.split('\n');
    return lines.map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        {idx !== lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="canvas-container">
      {/* Top Toolbar */}
      <div className="canvas-toolbar">
        <button className="toolbar-btn home-btn" onClick={onClose}>
          <img src="/element/home.svg" alt="Home" />
        </button>
        
        <div className="toolbar-center">
          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={undo} disabled={historyStep === 0}>
              <img src="/element/undo.svg" alt="Undo" />
            </button>
            <button className="toolbar-btn" onClick={redo} disabled={historyStep === history.length - 1}>
              <img src="/element/redo.svg" alt="Redo" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="progress-indicator">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`progress-dash ${idx <= currentStep ? 'completed' : 'remaining'}`}
              />
            ))}
          </div>
        </div>

        <button 
          className={`toolbar-btn ai-btn ${chatPanelOpen ? 'active' : ''}`}
          onClick={() => setChatPanelOpen((open) => !open)}
        >
          <img src="/element/robot.svg" alt="AI" />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="canvas-main">
        {/* Left Sidebar - Vertical Sliders and Tools */}
        <div className="left-sidebar">
          <div className="vertical-slider-container">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={brushOpacity} 
              onChange={(e) => setBrushOpacity(e.target.value)}
              className="vertical-slider"
              style={{
                '--slider-value': `${brushOpacity}%`
              }}
            />
          </div>
          
          <div className="vertical-slider-container">
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={brushSize} 
              onChange={(e) => setBrushSize(e.target.value)}
              className="vertical-slider"
              style={{
                '--slider-value': `${((brushSize - 1) / (50 - 1)) * 100}%`
              }}
            />
          </div>

          <div className="vertical-tools">
            <button 
              className={`vertical-tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
              onClick={() => setCurrentTool('pen')}
            >
              <img src="/element/brush.svg" alt="Pen" />
            </button>
            <button 
              className={`vertical-tool-btn ${currentTool === 'fill' ? 'active' : ''}`}
              onClick={() => setCurrentTool('fill')}
            >
              <img src="/element/paint bucket.svg" alt="Fill" />
            </button>
            <button 
              className={`vertical-tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setCurrentTool('eraser')}
            >
              <img src="/element/eraser.svg" alt="Eraser" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="drawing-canvas"
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="bottom-toolbar">
          <div className="bottom-left">
            <button className="bottom-tool-btn">
              <img src="/element/brush.svg" alt="Brush" />
            </button>
            <button className="bottom-tool-btn" onClick={() => setShowColorWheel(true)}>
              <img src="/element/color wheel.svg" alt="Color Wheel" />
            </button>
          </div>

          <div className="bottom-center">
            <div className="brush-size-slider-container">
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={brushSize} 
                onChange={(e) => setBrushSize(e.target.value)}
                className="brush-size-slider"
              />
            </div>
            <div className="color-palette-bottom">
              {colorPalette.map((color, idx) => (
                <button
                  key={idx}
                  className={`color-swatch-bottom ${currentColor === color ? 'active' : ''} ${color === '#FFFFFF' ? 'white-color' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => selectColor(color)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Right Bottom Buttons - Above Bottom Toolbar */}
        <div className="right-bottom-buttons">
          <button className="bottom-tool-btn">
            <img src="/element/play.svg" alt="Play" />
          </button>
          <button className="bottom-tool-btn">
            <img src="/element/upload.svg" alt="Upload" />
          </button>
          <button className="bottom-tool-btn">
            <img src="/element/delete.svg" alt="Delete" />
          </button>
          <button className="bottom-tool-btn microphone-btn">
            <img src="/element/microphone.svg" alt="Microphone" />
          </button>
          <button className="bottom-tool-btn" onClick={() => setShowTextInput(true)}>
            <img src="/element/keyboard.svg" alt="Keyboard" />
          </button>
          <button className="bottom-tool-btn" onClick={() => setIsMuted(!isMuted)}>
            <img src={isMuted ? "/element/mute.svg" : "/element/unmute.svg"} alt="Mute" />
          </button>
        </div>
      </div>

      {/* Color Wheel Popup */}
      {showColorWheel && (
        <div className="modal-overlay" onClick={() => setShowColorWheel(false)}>
          <div className="color-wheel-popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowColorWheel(false)}>
              <img src="/element/wrong.svg" alt="Close" />
            </button>
            <div className="current-color" style={{ backgroundColor: currentColor }} />
            <div className="color-wheel-grid">
              {colorWheelPalette.map((color, idx) => (
                <button
                  key={idx}
                  className="wheel-color"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    selectColor(color);
                    setShowColorWheel(false);
                  }}
                />
              ))}
            </div>
            <div className="recent-colors-wheel">
              <label>{language === 'EN' ? 'Recently Selected' : '最近选择'}</label>
              <div className="recent-grid">
                {recentColors.slice(0, 9).map((color, idx) => (
                  <button
                    key={idx}
                    className="wheel-color"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      selectColor(color);
                      setShowColorWheel(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Input Popup */}
      {showTextInput && (
        <div className="modal-overlay" onClick={() => setShowTextInput(false)}>
          <div className="text-input-popup" onClick={(e) => e.stopPropagation()}>
            <div className="text-preview">
              <label>{language === 'EN' ? 'Preview' : '预览'}</label>
              <p>{textInputValue || (language === 'EN' ? 'Enter Text' : '输入文字')}</p>
            </div>
            <input
              type="text"
              placeholder={language === 'EN' ? 'Enter Text' : '输入文字'}
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              className="text-input-field"
            />
            <button 
              className={`add-text-btn ${textInputValue ? 'active' : ''}`}
              onClick={addTextToCanvas}
            >
              {language === 'EN' ? 'Add Text' : '添加文字'}
            </button>
          </div>
        </div>
      )}

      {/* Chat / Guidance Panel */}
      <aside className={`chat-panel ${chatPanelOpen ? 'open' : 'closed'}`}>
        <div className="chat-panel-header">
          <div className="chat-panel-title">
            <span className="chat-panel-step-label">
              {language === 'EN' ? 'Tree of Life' : '生命之树'}
            </span>
            <h3>
              {language === 'EN'
                ? currentStepData.instructionEN
                : currentStepData.instructionCN}
            </h3>
          </div>
          <button
            type="button"
            className="chat-panel-close-btn"
            onClick={() => setChatPanelOpen(false)}
            aria-label={language === 'EN' ? 'Hide guidance' : '收起指南'}
          >
            <img src="/element/hide.svg" alt="Hide" />
          </button>
        </div>

        <div className="chat-panel-content">
          <div className="chat-guidance-card">
            <p className="chat-guidance-heading">
              {language === 'EN'
                ? 'Think about your origins and foundations.'
                : '想一想你的起点与根基。'}
            </p>
            <p className="chat-guidance-body">
              {language === 'EN'
                ? renderTextWithBreaks(currentStepData.descriptionEN)
                : renderTextWithBreaks(currentStepData.descriptionCN)}
            </p>
          </div>

          <div className="chat-roots-board">
            <p className="chat-roots-label">
              {language === 'EN'
                ? 'Example roots you might draw'
                : '可以描绘的根部示例'}
            </p>
            <div className="chat-roots-list">
              {sampleRoots.map((root, idx) => (
                <div className="chat-root-item" key={idx}>
                  <span
                    className="chat-root-stroke"
                    style={{ backgroundColor: root.color }}
                  />
                  <div className="chat-root-text">
                    {(language === 'EN' ? root.entriesEN : root.entriesCN).map(
                      (entry, entryIdx) => (
                        <span key={entryIdx}>{entry}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.map((message, idx) => (
              <div
                key={message.timestamp || idx}
                className={`chat-message ${message.sender}`}
              >
                <div className="chat-bubble">
                  {renderTextWithBreaks(message.text)}
                </div>
                <span className="chat-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
            {isLLMTyping && (
              <div className="chat-message bot typing">
                <div className="chat-bubble typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>
        </div>

        <div className="chat-panel-footer">
          <div className="chat-input-wrapper">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyPress}
              placeholder={
                language === 'EN'
                  ? 'Ask the guide for help...'
                  : '向小助手提问或求助…'
              }
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isLLMTyping}
            >
              <img src="/element/forward.svg" alt="Send" />
            </button>
          </div>
          <div className="chat-footer-tools">
            <button type="button" className="chat-footer-btn">
              <img src="/element/microphone.svg" alt="Microphone" />
            </button>
            <button
              type="button"
              className="chat-footer-btn"
              onClick={() => setShowTextInput(true)}
            >
              <img src="/element/keyboard.svg" alt="Keyboard" />
            </button>
            <button
              type="button"
              className="chat-footer-btn"
              onClick={() => setIsMuted((prev) => !prev)}
            >
              <img
                src={isMuted ? '/element/mute.svg' : '/element/unmute.svg'}
                alt={isMuted ? 'Muted' : 'Unmuted'}
              />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Canvas;

