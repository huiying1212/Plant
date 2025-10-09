import React, { useState, useRef, useEffect } from 'react';
import './Canvas.css';

function Canvas({ language, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen'); // pen, fill, eraser
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [currentColor, setCurrentColor] = useState('#333333');
  const [recentColors, setRecentColors] = useState(['#333333']);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showAudioInput, setShowAudioInput] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [textInputValue, setTextInputValue] = useState('');
  const [canvasTexts, setCanvasTexts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(null);

  const colorPalette = [
    '#EA5851', '#D42E4C', '#EF9537', '#EB5A29',
    '#F7D548', '#F1A23B', '#7EDF71', '#4CA765',
    '#3C87D8', '#2A639D', '#93278F', '#662D91'
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

  const chatMessages = [
    {
      sender: 'bot',
      textEN: steps[currentStep]?.instructionEN || '',
      textCN: steps[currentStep]?.instructionCN || ''
    }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }
  }, []);

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
      ctx.strokeStyle = '#FFFFFF';
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

  return (
    <div className="canvas-container">
      {/* Top Toolbar */}
      <div className="canvas-toolbar">
        <button className="toolbar-btn" onClick={onClose}>
          <img src="/element/home.svg" alt="Home" />
        </button>
        
        <div className="toolbar-actions">
          <button className="toolbar-btn" onClick={undo} disabled={historyStep === 0}>
            <img src="/element/undo.svg" alt="Undo" />
          </button>
          <button className="toolbar-btn" onClick={redo} disabled={historyStep === history.length - 1}>
            <img src="/element/forward.svg" alt="Redo" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`progress-dot ${idx <= currentStep ? 'completed' : 'remaining'}`}
            />
          ))}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="canvas-main">
        {/* Drawing Tools Panel */}
        <div className="tools-panel">
          <div className="tool-section">
            <label>{language === 'EN' ? 'Transparency' : '透明度'}</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={brushOpacity} 
              onChange={(e) => setBrushOpacity(e.target.value)}
              className="slider"
            />
            <span>{brushOpacity}%</span>
          </div>

          <div className="tool-section">
            <label>{language === 'EN' ? 'Size' : '大小'}</label>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={brushSize} 
              onChange={(e) => setBrushSize(e.target.value)}
              className="slider"
            />
            <span>{brushSize}px</span>
          </div>

          <div className="tool-buttons">
            <button 
              className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
              onClick={() => setCurrentTool('pen')}
            >
              <img src="/element/edit.svg" alt="Pen" />
            </button>
            <button 
              className={`tool-btn ${currentTool === 'fill' ? 'active' : ''}`}
              onClick={() => setCurrentTool('fill')}
            >
              <img src="/element/paint bucket.svg" alt="Fill" />
            </button>
            <button 
              className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setCurrentTool('eraser')}
            >
              <img src="/element/eraser.svg" alt="Eraser" />
            </button>
          </div>

          {/* Color Tools */}
          <div className="color-section">
            <button className="tool-btn" onClick={() => setShowColorWheel(true)}>
              <img src="/element/color-picker.svg" alt="Color Picker" />
            </button>
            <button className="tool-btn">
              <img src="/element/color wheel.svg" alt="Color Wheel" />
            </button>
          </div>

          {/* Color Palette */}
          <div className="color-palette">
            {colorPalette.map((color, idx) => (
              <button
                key={idx}
                className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => selectColor(color)}
              />
            ))}
          </div>

          {/* Recent Colors */}
          <div className="recent-colors">
            <label>{language === 'EN' ? 'Recent' : '最近使用'}</label>
            <div className="color-palette">
              {recentColors.slice(0, 8).map((color, idx) => (
                <button
                  key={idx}
                  className="color-swatch"
                  style={{ backgroundColor: color }}
                  onClick={() => selectColor(color)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="drawing-canvas"
          />
          
          <button className="next-step-btn" onClick={nextStep}>
            {language === 'EN' ? 'Next Step' : '下一步'} →
          </button>
        </div>

        {/* Chat Panel */}
        <div className={`chat-panel ${chatPanelOpen ? 'open' : 'closed'}`}>
          <button 
            className="panel-toggle" 
            onClick={() => setChatPanelOpen(!chatPanelOpen)}
          >
            <img src="/element/sidebar collapse.svg" alt="Toggle" />
          </button>

          {chatPanelOpen && (
            <>
              <div className="module-info">
                <h3 className="module-title">
                  {language === 'EN' ? steps[currentStep].titleEN : steps[currentStep].titleCN}
                </h3>
                <p className="module-instruction">
                  {language === 'EN' ? steps[currentStep].descriptionEN : steps[currentStep].descriptionCN}
                </p>
              </div>

              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="chat-message bot">
                    {language === 'EN' ? msg.textEN : msg.textCN}
                  </div>
                ))}
              </div>

              <div className="chat-controls">
                <button 
                  className={`control-btn ${showAudioInput ? 'active' : ''}`}
                  onClick={() => setShowAudioInput(!showAudioInput)}
                >
                  <img src="/element/microphone.svg" alt="Audio" />
                </button>
                <button 
                  className="control-btn"
                  onClick={() => setShowTextInput(true)}
                >
                  <img src="/element/keyboard.svg" alt="Text" />
                </button>
                <button 
                  className={`control-btn ${isMuted ? 'active' : ''}`}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  <img src={isMuted ? "/element/mute.svg" : "/element/unmute.svg"} alt="Mute" />
                </button>
              </div>
            </>
          )}
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
    </div>
  );
}

export default Canvas;

