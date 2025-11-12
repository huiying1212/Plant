import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const [isMuted, setIsMuted] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
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

  const steps = useMemo(() => [
    {
      stepNumber: 0,
      titleEN: 'Tree of Life',
      titleCN: '生命之树',
      instructionEN: 'Welcome to your Tree of Life journey!',
      instructionCN: '欢迎来到你的生命之树旅程！',
      descriptionEN: 'In this activity, we use the metaphor of a tree to explore your life.\n\nImagine yourself as a tree, with roots, a trunk, branches, leaves, flowers or fruits, and even bugs and storms.\n\nOn the screen, you\'ll find a tree template where you can add colors, patterns, or text to different parts of the tree. You can move your text around freely.',
      descriptionCN: '在这个活动中，我们用树的比喻来探索你的生活。\n\n想象你自己是一棵树，有根、树干、树枝、树叶、花朵或果实，甚至还有虫子和风暴。\n\n在屏幕上，你会找到一个树的模板，你可以在树的不同部分添加颜色、图案或文字。你可以自由移动你的文字。',
      exampleImage: null,
      svgIndex: null
    },
    {
      stepNumber: 1,
      titleEN: 'ROOT',
      titleCN: '根',
      instructionEN: 'The roots represent the foundation of your life.',
      instructionCN: '根代表你生命的基础。',
      descriptionEN: 'What has shaped and supported you to get to where you are now?\n\nThink about things like family, home, culture, traditions, or beliefs.',
      descriptionCN: '是什么塑造并支持你走到今天？\n\n想想家庭、家乡、文化、传统或信仰等事物。',
      exampleImage: '/canvas/example/01 ROOT.png',
      svgIndex: 0
    },
    {
      stepNumber: 2,
      titleEN: 'TRUNK',
      titleCN: '树干',
      instructionEN: 'The trunk represents your inner strength and qualities.',
      instructionCN: '树干代表你的内在力量和品质。',
      descriptionEN: 'What skills, character traits, or values help you stay strong and move forward?\n\nConsider things like discipline, creativity, bravery, kindness, things that help you overcome obstacles.',
      descriptionCN: '什么技能、性格特质或价值观帮助你保持坚强并继续前进？\n\n想想纪律、创造力、勇敢、善良等帮助你克服障碍的东西。',
      exampleImage: '/canvas/example/02 TRUNK.png',
      svgIndex: 1
    },
    {
      stepNumber: 3,
      titleEN: 'BRANCHES',
      titleCN: '树枝',
      instructionEN: 'The branches reach outward, representing your hopes and goals.',
      instructionCN: '树枝向外延伸，代表你的希望和目标。',
      descriptionEN: 'What goals, wishes, or dreams do you have?\n\nMaybe things like building healthy habits, traveling, exploring new hobbies, or forming deeper friendships.',
      descriptionCN: '你有什么目标、愿望或梦想？\n\n也许是建立健康的习惯、旅行、探索新爱好或建立更深的友谊。',
      exampleImage: '/canvas/example/03 BRANCH.png',
      svgIndex: 2
    },
    {
      stepNumber: 4,
      titleEN: 'LEAVES',
      titleCN: '树叶',
      instructionEN: 'The leaves represent the relationships and connections that support you.',
      instructionCN: '树叶代表支持你的关系和联系。',
      descriptionEN: 'Who are the people, pets, or mentors who bring you joy and light?\n\nThink of those who make you feel supported and loved.',
      descriptionCN: '谁是给你带来快乐和光明的人、宠物或导师？\n\n想想那些让你感到被支持和被爱的人。',
      exampleImage: '/canvas/example/04 LEAVES.png',
      svgIndex: 3
    },
    {
      stepNumber: 5,
      titleEN: 'FRUITS/FLOWERS',
      titleCN: '果实/花朵',
      instructionEN: 'The fruits and flowers represent the achievements in your life.',
      instructionCN: '果实和花朵代表你生命中的成就。',
      descriptionEN: 'What are the accomplishments you\'re most proud of?\n\nIt could be learning a new skill, being there for a friend in need, or creating something meaningful.',
      descriptionCN: '你最自豪的成就是什么？\n\n可能是学习一项新技能、在朋友需要时陪伴他们，或创造一些有意义的东西。',
      exampleImage: '/canvas/example/05 FLOWER.png',
      svgIndex: 4
    },
    {
      stepNumber: 6,
      titleEN: 'BUGS',
      titleCN: '虫子',
      instructionEN: 'The bugs represent the imperfections and worries in life.',
      instructionCN: '虫子代表生活中的不完美和担忧。',
      descriptionEN: 'What small things cause you anxiety or unease?\n\nIt might be self-doubt, procrastination, or fear of failure.',
      descriptionCN: '什么小事让你感到焦虑或不安？\n\n可能是自我怀疑、拖延或对失败的恐惧。',
      exampleImage: '/canvas/example/06 BUG.png',
      svgIndex: 5
    },
    {
      stepNumber: 7,
      titleEN: 'STORMS',
      titleCN: '风暴',
      instructionEN: 'The storms represent life\'s challenges and changes.',
      instructionCN: '风暴代表生活中的挑战和变化。',
      descriptionEN: 'What challenges or major changes have shaken your life recently?\n\nThink about things like financial stress, balancing work and life, or the loss of a loved one.',
      descriptionCN: '最近有什么挑战或重大变化动摇了你的生活？\n\n想想财务压力、平衡工作和生活，或失去亲人等事情。',
      exampleImage: '/canvas/example/07 STORM.png',
      svgIndex: 6
    }
  ], []);

  // Store loaded SVG images in refs so they persist across re-renders
  const svgImagesSet1Ref = useRef([]);
  const svgImagesSet2Ref = useRef([]);
  const svgsLoadedRef = useRef(false);
  
  // Store colored SVGs for each step (to preserve colors when switching steps)
  const coloredSvgsRef = useRef({});

  // Define saveToHistory function before useEffect hooks
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(canvas.toDataURL());
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
  }, [history, historyStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Initial setup
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Define SVG filenames shared by both sets
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
      
      // Preload set 1 (public/canvas/1/English) for step-by-step reveal
      let loadedCountSet1 = 0;
      const svgImagesSet1 = [];
      
      // Load and draw set 2 (public/canvas/2) at the same position
      let loadedCountSet2 = 0;
      const svgImagesSet2 = [];
      let set2Drawn = false; // Ensure we only draw once
      
      const drawSet2SVGs = () => {
        if (set2Drawn) return;
        
        // Ensure all set 2 images are loaded
        const allLoadedSet2 = svgImagesSet2.every((img) => img && img.complete);
        
        if (allLoadedSet2 && loadedCountSet2 === svgFiles.length) {
          // Draw all set 2 SVGs at the same position to form a complete tree
          const scale = 1.2; // Scale factor to make SVGs larger (2x = double size)
          
          svgImagesSet2.forEach((svgImg) => {
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
          
          set2Drawn = true;
          saveToHistory();
        }
      };
      
      // Preload set 1 (for step-by-step reveal)
      // Note: If Chinese SVGs are not available, fallback to English
      const languageFolder = language === 'EN' ? 'English' : 'English'; // TODO: Change to 'Chinese' when Chinese SVGs are available
      svgFiles.forEach((svgFile, index) => {
        const imgSet1 = new Image();
        imgSet1.onload = () => {
          svgImagesSet1[index] = imgSet1;
          loadedCountSet1++;
          if (loadedCountSet1 === svgFiles.length) {
            svgImagesSet1Ref.current = svgImagesSet1;
            svgsLoadedRef.current = true;
          }
        };
        imgSet1.onerror = (error) => {
          console.error(`Error loading SVG from set 1: ${svgFile}`, error);
          loadedCountSet1++;
        };
        imgSet1.src = `/canvas/1/${languageFolder}/${encodeURIComponent(svgFile)}`;
      });
      
      // Load and draw set 2
      svgFiles.forEach((svgFile, index) => {
        const imgSet2 = new Image();
        imgSet2.onload = () => {
          svgImagesSet2[index] = imgSet2;
          loadedCountSet2++;
          if (loadedCountSet2 === svgFiles.length) {
            svgImagesSet2Ref.current = svgImagesSet2;
          }
          drawSet2SVGs();
        };
        imgSet2.onerror = (error) => {
          console.error(`Error loading SVG from set 2: ${svgFile}`, error);
          loadedCountSet2++;
          if (loadedCountSet2 === svgFiles.length) {
            drawSet2SVGs();
          }
        };
        imgSet2.src = `/canvas/2/${encodeURIComponent(svgFile)}`;
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
  }, [language, saveToHistory]);

  // Effect to draw the appropriate SVG when step changes
  useEffect(() => {
    if (!svgsLoadedRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // First, redraw the base canvas with the background
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = -150;
    const startX = centerX + offsetX;
    const startY = centerY;
    
    const baseWidth = 655;
    const baseHeight = 493;
    const scale = 1.2;
    const svgWidth = baseWidth * scale;
    const svgHeight = baseHeight * scale;
    
    // Get current step's SVG index
    const currentStepData = currentStep > 0 ? steps[currentStep] : null;
    const currentSvgIndex = currentStepData && currentStepData.svgIndex !== null ? currentStepData.svgIndex : -1;
    
    // Draw all SVGs from Set 2 EXCEPT the current step's SVG (these go below current step's Set 1 SVG)
    const svgImagesSet2 = svgImagesSet2Ref.current;
    if (svgImagesSet2 && svgImagesSet2.length > 0) {
      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      svgImagesSet2.forEach((svgImg, index) => {
        // Skip current step's SVG from Set 2 (will draw it later on top)
        if (index !== currentSvgIndex && svgImg && svgImg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          
          // Check if we have a colored version of this SVG
          const coloredSvg = coloredSvgsRef.current[index];
          if (coloredSvg && coloredSvg.complete) {
            // Use the colored version with high-res dimensions
            const highResScale = 4;
            const highResWidth = 655 * highResScale;
            const highResHeight = 493 * highResScale;
            ctx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
          } else {
            // Use the original SVG
            ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
          }
        }
      });
    }
    
    // If we're not on step 0 (introduction), draw the current step's SVG from Set 1
    if (currentStep > 0 && currentSvgIndex >= 0) {
      const svgImg = svgImagesSet1Ref.current[currentSvgIndex];
      
      if (svgImg && svgImg.complete) {
        const x = startX - svgWidth / 2;
        const y = startY - svgHeight / 2;
        
        // Draw the specific SVG for this step from Set 1
        ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
      }
    }
    
    // Finally, draw current step's SVG from Set 2 (on top of everything)
    if (currentStep > 0 && currentSvgIndex >= 0 && svgImagesSet2 && svgImagesSet2[currentSvgIndex]) {
      // Check if we have a colored version of this SVG
      const coloredSvg = coloredSvgsRef.current[currentSvgIndex];
      
      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      if (coloredSvg && coloredSvg.complete) {
        // Use the colored version
        const x = startX - svgWidth / 2;
        const y = startY - svgHeight / 2;
        
        // Calculate the high-res dimensions
        const highResScale = 4;
        const highResWidth = 655 * highResScale;
        const highResHeight = 493 * highResScale;
        
        // Draw from high-res source to display size
        ctx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
      } else {
        // Use the original SVG
        const svgImg = svgImagesSet2[currentSvgIndex];
        
        if (svgImg && svgImg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
        }
      }
    }
    
    saveToHistory();
  }, [currentStep, saveToHistory, steps]);

  // Initialize chat messages - empty array so no welcome message repeats the title
  useEffect(() => {
    setChatMessages([]);
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

  // Fill current step's SVG with selected color (from Set 2)
  const fillCurrentStepSvg = (fillColor) => {
    // Skip if on introduction step (no SVG to fill)
    if (currentStep === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and redraw base tree except for the current step's SVG
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get the current step's SVG index
    const currentStepData = steps[currentStep];
    if (!currentStepData || currentStepData.svgIndex === null) return;
    
    const currentSvgIndex = currentStepData.svgIndex;
    
    // Draw all SVGs from Set 2 EXCEPT the current step's SVG (these go below current step's Set 1 SVG)
    const svgImagesSet2 = svgImagesSet2Ref.current;
    if (svgImagesSet2 && svgImagesSet2.length > 0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const offsetX = -150;
      const startX = centerX + offsetX;
      const startY = centerY;
      
      const baseWidth = 655;
      const baseHeight = 493;
      const scale = 1.2;
      const svgWidth = baseWidth * scale;
      const svgHeight = baseHeight * scale;
      
      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw all SVGs from Set 2 except the current step's SVG
      svgImagesSet2.forEach((svgImg, index) => {
        if (index !== currentSvgIndex && svgImg && svgImg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          
          // Check if we have a colored version of this SVG
          const coloredSvg = coloredSvgsRef.current[index];
          if (coloredSvg && coloredSvg.complete) {
            // Use the colored version with high-res dimensions
            const highResScale = 4;
            const highResWidth = 655 * highResScale;
            const highResHeight = 493 * highResScale;
            ctx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
          } else {
            // Use the original SVG
            ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
          }
        }
      });
    }
    
    // Draw the current step's SVG from Set 1
    const svgImagesSet1 = svgImagesSet1Ref.current;
    if (svgImagesSet1 && svgImagesSet1.length > 0) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const offsetX = -150;
      const startX = centerX + offsetX;
      const startY = centerY;
      
      const baseWidth = 655;
      const baseHeight = 493;
      const scale = 1.2;
      const svgWidth = baseWidth * scale;
      const svgHeight = baseHeight * scale;
      
      // Only draw the current step's SVG from Set 1
      if (currentStep > 0 && svgImagesSet1[currentSvgIndex] && svgImagesSet1[currentSvgIndex].complete) {
        const x = startX - svgWidth / 2;
        const y = startY - svgHeight / 2;
        ctx.drawImage(svgImagesSet1[currentSvgIndex], x, y, svgWidth, svgHeight);
      }
    }
    
    // Get the current step's SVG from Set 2
    const svgImg = svgImagesSet2Ref.current[currentSvgIndex];
    
    if (svgImg && svgImg.complete) {
      // Use higher resolution for better quality
      const scale = 1.2;
      const baseWidth = 655;
      const baseHeight = 493;
      const highResScale = 4; // Use 4x resolution for better quality
      
      // Create a temporary canvas to modify the SVG with high resolution
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { alpha: true });
      
      // Set high resolution canvas size
      tempCanvas.width = baseWidth * highResScale;
      tempCanvas.height = baseHeight * highResScale;
      
      // Enable image smoothing for better quality
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      
      // Draw the SVG on the temporary canvas at high resolution
      tempCtx.drawImage(svgImg, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Get image data
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      // Convert fillColor from hex to rgba
      const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };
      
      const fillRgb = hexToRgb(fillColor);
      const fillR = fillRgb[0];
      const fillG = fillRgb[1];
      const fillB = fillRgb[2];
      
      // Modify non-transparent pixels (only change color, keep alpha)
      for (let i = 0; i < data.length; i += 4) {
        // Only modify pixels that are not transparent (alpha > 0)
        if (data[i + 3] > 0) {
          // Keep the original alpha value for smooth edges
          const originalAlpha = data[i + 3];
          data[i] = fillR;
          data[i + 1] = fillG;
          data[i + 2] = fillB;
          data[i + 3] = originalAlpha; // Preserve original transparency
        }
      }
      
      // Update the temporary canvas with the modified image
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw the modified SVG on the main canvas (on top of everything)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const offsetX = -150;
      const startX = centerX + offsetX;
      const startY = centerY;
      
      const svgWidth = baseWidth * scale;
      const svgHeight = baseHeight * scale;
      
      const x = startX - svgWidth / 2;
      const y = startY - svgHeight / 2;
      
      // Enable image smoothing on main canvas for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 
                   x, y, svgWidth, svgHeight);
      
      // Store the colored SVG for this step at high resolution
      const coloredSvg = new Image();
      coloredSvg.onload = () => {
        // Image is loaded and ready to use
      };
      // Use high quality PNG format
      coloredSvg.src = tempCanvas.toDataURL('image/png', 1.0);
      coloredSvgsRef.current[currentSvgIndex] = coloredSvg;
      
      saveToHistory();
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If using fill tool, fill the current step's SVG and return
    if (currentTool === 'fill') {
      fillCurrentStepSvg(currentColor);
      return;
    }
    
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
      // Eraser should not erase SVGs, so we need to redraw everything first
      // Save current position
      const currentX = x;
      const currentY = y;
      
      // Stop drawing temporarily
      setIsDrawing(false);
      
      // Redraw base canvas and SVGs
      const redrawCanvas = () => {
        // Clear canvas
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const offsetX = -150;
        const startX = centerX + offsetX;
        const startY = centerY;
        
        const baseWidth = 655;
        const baseHeight = 493;
        const scale = 1.2;
        const svgWidth = baseWidth * scale;
        const svgHeight = baseHeight * scale;
        
        // Get current step's SVG index
        const currentStepData = currentStep > 0 ? steps[currentStep] : null;
        const currentSvgIndex = currentStepData && currentStepData.svgIndex !== null ? currentStepData.svgIndex : -1;
        
        // Draw all SVGs from Set 2 EXCEPT the current step's SVG (these go below current step's Set 1 SVG)
        const svgImagesSet2 = svgImagesSet2Ref.current;
        if (svgImagesSet2 && svgImagesSet2.length > 0) {
          // Enable high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          svgImagesSet2.forEach((svgImg, index) => {
            // Skip current step's SVG from Set 2 (will draw it later on top)
            if (index !== currentSvgIndex && svgImg && svgImg.complete) {
              const x = startX - svgWidth / 2;
              const y = startY - svgHeight / 2;
              
              // Check if we have a colored version of this SVG
              const coloredSvg = coloredSvgsRef.current[index];
              if (coloredSvg && coloredSvg.complete) {
                // Use the colored version with high-res dimensions
                const highResScale = 4;
                const highResWidth = 655 * highResScale;
                const highResHeight = 493 * highResScale;
                ctx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
              } else {
                // Use the original SVG
                ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
              }
            }
          });
        }
        
        // If we're not on step 0 (introduction), draw the current step's SVG from Set 1
        if (currentStep > 0 && currentSvgIndex >= 0) {
          const svgImg = svgImagesSet1Ref.current[currentSvgIndex];
          
          if (svgImg && svgImg.complete) {
            const x = startX - svgWidth / 2;
            const y = startY - svgHeight / 2;
            
            // Draw the specific SVG for this step from Set 1
            ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
          }
        }
        
        // Finally, draw current step's SVG from Set 2 (on top of everything)
        if (currentStep > 0 && currentSvgIndex >= 0 && svgImagesSet2 && svgImagesSet2[currentSvgIndex]) {
          // Check if we have a colored version of this SVG
          const coloredSvg = coloredSvgsRef.current[currentSvgIndex];
          
          // Enable high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          if (coloredSvg && coloredSvg.complete) {
            // Use the colored version with high-res dimensions
            const x = startX - svgWidth / 2;
            const y = startY - svgHeight / 2;
            
            const highResScale = 4;
            const highResWidth = 655 * highResScale;
            const highResHeight = 493 * highResScale;
            
            ctx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
          } else {
            // Use the original SVG
            const svgImg = svgImagesSet2[currentSvgIndex];
            
            if (svgImg && svgImg.complete) {
              const x = startX - svgWidth / 2;
              const y = startY - svgHeight / 2;
              ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
            }
          }
        }
      };
      
      // Redraw everything except user drawings
      redrawCanvas();
      
      // Resume drawing with eraser
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      
      // Set eraser properties
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
      
      // If we were using the eraser, make sure SVGs are redrawn
      if (currentTool === 'eraser') {
        // We don't need to do anything special here since SVGs are protected
        // by the redrawCanvas function in startDrawing
      }
      
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

        {!chatPanelOpen && (
        <button 
            className="toolbar-btn ai-btn"
            onClick={() => setChatPanelOpen(true)}
        >
          <img src="/element/robot.svg" alt="AI" />
        </button>
        )}
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
              {language === 'EN' ? currentStepData.titleEN : currentStepData.titleCN}
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
            <p className="chat-guidance-body">
              {language === 'EN'
                ? renderTextWithBreaks(currentStepData.descriptionEN)
                : renderTextWithBreaks(currentStepData.descriptionCN)}
            </p>
          </div>

          {/* Show example image if available */}
          {currentStepData.exampleImage && (
            <div className="chat-example-image">
              <p className="chat-example-label">
                {language === 'EN' ? 'Example:' : '示例：'}
              </p>
              <img 
                src={currentStepData.exampleImage} 
                alt={language === 'EN' ? 'Example' : '示例'}
                className="example-image"
              />
                  </div>
          )}

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
          {/* Next Step Button */}
          {currentStep < steps.length - 1 && (
            <button 
              type="button"
              className="next-step-btn"
              onClick={nextStep}
            >
              {language === 'EN' ? 'Next Step' : '下一步'}
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <button 
              type="button"
              className="next-step-btn complete-btn"
              onClick={nextStep}
            >
              {language === 'EN' ? 'Complete' : '完成'}
            </button>
          )}
          
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

