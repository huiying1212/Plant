import React, { useState, useRef, useEffect, useMemo } from 'react';
import './Canvas.css';
import llmService from './llmService';
import ttsService from './ttsService';
import sttService from './sttService';

function Canvas({ language, onClose }) {
  const canvasRef = useRef(null);  // Top layer: user drawing (erasable)
  const baseCanvasRef = useRef(null);  // Bottom layer: SVG template (non-erasable)
  const chatMessagesEndRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen'); // pen, fill, eraser, text
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [currentColor, setCurrentColor] = useState('#EA5851');
  const [baseColor, setBaseColor] = useState('#EA5851');
  const [colorBrightness, setColorBrightness] = useState(50);
  const [recentColors, setRecentColors] = useState(['#EA5851']);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [isColorPanelCollapsed, setIsColorPanelCollapsed] = useState(true);
  
  // Separate color states for pen and fill tools
  const [penColor, setPenColor] = useState('#EA5851');
  const [penBaseColor, setPenBaseColor] = useState('#EA5851');
  const [penBrightness, setPenBrightness] = useState(50);
  const [fillColor, setFillColor] = useState('#4DABF7');
  const [fillBaseColor, setFillBaseColor] = useState('#4DABF7');
  const [fillBrightness, setFillBrightness] = useState(50);
  const [showTextInput, setShowTextInput] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [textInputValue, setTextInputValue] = useState('');
  const [canvasTexts, setCanvasTexts] = useState([]);
  const [draggingTextIndex, setDraggingTextIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveringTextIndex, setHoveringTextIndex] = useState(null);
  const [tempTextIndex, setTempTextIndex] = useState(null); // Track temporary text that can be moved
  const [brushStrokes, setBrushStrokes] = useState([]); // Store brush strokes separately
  const [currentStroke, setCurrentStroke] = useState(null); // Track current stroke being drawn
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(null);
  const [hasSubmittedCurrentStep, setHasSubmittedCurrentStep] = useState(false);
  
  // Chat-related state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLLMTyping, setIsLLMTyping] = useState(false);

  const colorPalette = [
    // Row 1: Warm to cool spectrum
    '#FF6B6B', '#FF8E72', '#FFA94D', '#FFD43B', '#A9E34B', '#69DB7C', '#38D9A9', '#3BC9DB', '#4DABF7',
    // Row 2: Cool to purple + neutrals
    '#748FFC', '#9775FA', '#DA77F2', '#F783AC', '#E599F7', '#868E96', '#495057', '#000000', '#FFFFFF'
  ];

  const colorWheelPalette = [
    '#EA3323', '#FFFFFF', '#F09837', '#F9DA4A',
    '#9BFC59', '#AEFCDB', '#60D1FA', '#7838F5',
    '#CCCCCC'
  ];

  const steps = useMemo(() => {
    // Determine example image folder based on language
    const exampleFolder = language === 'EN' ? 'English' : 'Chinese';
    
    return [
      {
        stepNumber: 0,
        titleEN: 'Tree of Life',
        titleCN: '生命之树',
        instructionEN: 'Welcome to your Tree of Life journey!',
        instructionCN: '欢迎来到你的生命之树旅程！',
        descriptionEN: 'In this activity, we use the metaphor of a tree to explore your life.\n\nImagine yourself as a tree, with roots, a trunk, branches, leaves, flowers or fruits, and even bugs and storms.\n\nOn the screen, you\'ll find a tree template where you can add colors, patterns, or text to different parts of the tree. You can move your text around freely.\n\nClick "Next Step" to start your Tree of Life journey!',
        descriptionCN: '在这个活动中，我们用树的比喻来探索你的生活。\n\n想象你自己是一棵树，有根、树干、树枝、树叶、花朵或果实，甚至还有虫子和风暴。\n\n在屏幕上，你会找到一个树的模板，你可以在树的不同部分添加颜色、图案或文字。你可以自由移动你的文字。\n\n点击"下一步"，来开启你的生命之树旅程！',
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
        exampleImage: `/canvas/example/${exampleFolder}/01 ROOT eg.png`,
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
        exampleImage: `/canvas/example/${exampleFolder}/02 TRUNK eg.png`,
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
        exampleImage: `/canvas/example/${exampleFolder}/03 BRANCH eg.png`,
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
        exampleImage: `/canvas/example/${exampleFolder}/04 LEAVES eg.png`,
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
        exampleImage: `/canvas/example/${exampleFolder}/05 FLOWER eg.png`,
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
        exampleImage: `/canvas/example/${exampleFolder}/06 BUG eg.png`,
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
        exampleImage: `/canvas/example/${exampleFolder}/07 STORM eg.png`,
        svgIndex: 6
      },
      {
        stepNumber: 8,
        titleEN: 'REFLECTION',
        titleCN: '回顾总结',
        instructionEN: 'Let\'s reflect on your complete Tree of Life.',
        instructionCN: '让我们回顾你完整的生命之树。',
        descriptionEN: 'You have completed all parts of your Tree of Life. Now let\'s take a moment to see your tree as a whole and reflect on this journey.',
        descriptionCN: '你已经完成了生命之树的所有部分。现在让我们花点时间来看看你完整的树，并回顾这段旅程。',
        exampleImage: null,
        svgIndex: null,
        isSummary: true
      }
    ];
  }, [language]);

  // Store loaded SVG images in refs so they persist across re-renders
  const svgImagesSet1Ref = useRef([]);
  const svgImagesSet2Ref = useRef([]);
  const backSvgRef = useRef(null); // Store the back.svg image
  const svgsLoadedRef = useRef(false);
  
  // Store colored SVGs for each step (to preserve colors when switching steps)
  const coloredSvgsRef = useRef({});
  
  // Use ref to track if initial SVGs are drawn to avoid dependency issues
  const initialDrawnRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (canvas && baseCanvas) {
      // Initial setup with high DPI support for both canvases
      const ctx = canvas.getContext('2d');
      const baseCtx = baseCanvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Set canvas size accounting for device pixel ratio - TOP LAYER (user drawing)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Set canvas size accounting for device pixel ratio - BASE LAYER (SVG template)
      baseCanvas.width = rect.width * dpr;
      baseCanvas.height = rect.height * dpr;
      baseCtx.scale(dpr, dpr);
      baseCanvas.style.width = `${rect.width}px`;
      baseCanvas.style.height = `${rect.height}px`;
      
      // Fill base canvas with background color (SVG layer)
      baseCtx.fillStyle = '#F5F5F5';
      baseCtx.fillRect(0, 0, rect.width, rect.height);
      
      // Top layer is transparent (user drawing layer)
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Define SVG filenames for Set 2 (always English version in canvas/2)
      const svgFilesSet2 = [
        'fill (ROOT).svg',
        'fill (TRUNK).svg',
        'fill (BRANCH).svg',
        'fill (LEAVES).svg',
        'fill (FLOWER).svg',
        'fill (BUG).svg',
        'fill (STORM).svg'
      ];
      
      // Define SVG filenames for Set 1 (language-specific in canvas/1)
      const svgFilesSet1EN = [
        '01 ROOT.svg',
        '02 TRUNK.svg',
        '03 BRANCH.svg',
        '04 LEAVES.svg',
        '05 FLOWER.svg',
        '06 BUG.svg',
        '07 STORM.svg'
      ];
      
      const svgFilesSet1CN = [
        '01 ROOT.svg',
        '02 TRUNK.svg',
        '03 BRUNCH.svg',
        '04 LEAF.svg',
        '05 FLOWER.svg',
        '06 BUG.svg',
        '07 STORM.svg'
      ];
      
      // Select the appropriate file list based on language
      const svgFilesSet1 = language === 'EN' ? svgFilesSet1EN : svgFilesSet1CN;
      
      // Calculate position: center slightly to the left (using display size, not canvas size)
      const displayWidth = rect.width;
      const displayHeight = rect.height;
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const offsetX = -150; // Offset to the left (negative = left)
      const startX = centerX + offsetX;
      const startY = centerY;
      
      // Load back.svg (always at the bottom)
      const backImg = new Image();
      backImg.onload = () => {
        backSvgRef.current = backImg;
      };
      backImg.onerror = (error) => {
        console.error('Error loading back.svg:', error);
      };
      backImg.src = '/canvas/2/back.svg';
      
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
        
        if (allLoadedSet2 && loadedCountSet2 === svgFilesSet2.length) {
          // Draw all set 2 SVGs on the BASE canvas (non-erasable layer)
          const scale = 1.2; // Scale factor to make SVGs larger (2x = double size)
          
          // Enable high quality image smoothing for crisp SVG rendering
          baseCtx.imageSmoothingEnabled = true;
          baseCtx.imageSmoothingQuality = 'high';
          
          // Draw back.svg first (at the very bottom)
          if (backSvgRef.current && backSvgRef.current.complete) {
            const baseWidth = 655;
            const baseHeight = 493;
            const svgWidth = baseWidth * scale;
            const svgHeight = baseHeight * scale;
            const x = startX - svgWidth / 2;
            const y = startY - svgHeight / 2;
            baseCtx.drawImage(backSvgRef.current, x, y, svgWidth, svgHeight);
          }
          
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
              
              // Set 30% opacity for Set 2 SVGs (70% transparency)
              baseCtx.globalAlpha = 1.0;
              // Draw the SVG image with scaled size while maintaining aspect ratio
              baseCtx.drawImage(svgImg, x, y, svgWidth, svgHeight);
            }
          });
          
          // Reset transparency
          baseCtx.globalAlpha = 1.0;
          set2Drawn = true;
          initialDrawnRef.current = true;
          // Save initial state to history (combine both canvases)
          saveCanvasState();
        }
      };
      
      // Preload set 1 (for step-by-step reveal) - language specific
      const languageFolder = language === 'EN' ? 'English' : 'Chinese';
      svgFilesSet1.forEach((svgFile, index) => {
        const imgSet1 = new Image();
        imgSet1.onload = () => {
          svgImagesSet1[index] = imgSet1;
          loadedCountSet1++;
          if (loadedCountSet1 === svgFilesSet1.length) {
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
      
      // Load and draw set 2 (always uses English filenames from canvas/2)
      svgFilesSet2.forEach((svgFile, index) => {
        const imgSet2 = new Image();
        imgSet2.onload = () => {
          svgImagesSet2[index] = imgSet2;
          loadedCountSet2++;
          if (loadedCountSet2 === svgFilesSet2.length) {
            svgImagesSet2Ref.current = svgImagesSet2;
          }
          drawSet2SVGs();
        };
        imgSet2.onerror = (error) => {
          console.error(`Error loading SVG from set 2: ${svgFile}`, error);
          loadedCountSet2++;
          if (loadedCountSet2 === svgFilesSet2.length) {
            drawSet2SVGs();
          }
        };
        imgSet2.src = `/canvas/2/${encodeURIComponent(svgFile)}`;
      });
      
      // Handle resize - preserve existing content for both canvases
      const resizeCanvas = () => {
        const currentBaseImage = baseCanvas.toDataURL();
        const currentUserImage = canvas.toDataURL();
        
        const baseImg = new Image();
        const userImg = new Image();
        let loadedCount = 0;
        
        const onBothLoaded = () => {
          loadedCount++;
          if (loadedCount < 2) return;
          
          const dpr = window.devicePixelRatio || 1;
          const newRect = canvas.getBoundingClientRect();
          const oldWidth = canvas.width / dpr;
          const oldHeight = canvas.height / dpr;
          
          // Resize base canvas
          baseCanvas.width = newRect.width * dpr;
          baseCanvas.height = newRect.height * dpr;
          const newBaseCtx = baseCanvas.getContext('2d');
          newBaseCtx.scale(dpr, dpr);
          baseCanvas.style.width = `${newRect.width}px`;
          baseCanvas.style.height = `${newRect.height}px`;
          newBaseCtx.fillStyle = '#F5F5F5';
          newBaseCtx.fillRect(0, 0, newRect.width, newRect.height);
          newBaseCtx.drawImage(baseImg, 0, 0, oldWidth, oldHeight, 0, 0, oldWidth, oldHeight);
          
          // Resize user canvas
          canvas.width = newRect.width * dpr;
          canvas.height = newRect.height * dpr;
          const newCtx = canvas.getContext('2d');
          newCtx.scale(dpr, dpr);
          canvas.style.width = `${newRect.width}px`;
          canvas.style.height = `${newRect.height}px`;
          newCtx.clearRect(0, 0, newRect.width, newRect.height);
          newCtx.drawImage(userImg, 0, 0, oldWidth, oldHeight, 0, 0, oldWidth, oldHeight);
          
          // Save to history after resize
          saveCanvasState();
        };
        
        baseImg.onload = onBothLoaded;
        userImg.onload = onBothLoaded;
        baseImg.src = currentBaseImage;
        userImg.src = currentUserImage;
      };
      
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Effect to draw the appropriate SVG when step changes
  useEffect(() => {
    if (!svgsLoadedRef.current) return;
    
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (!canvas || !baseCanvas) return;
    
    const baseCtx = baseCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Reset globalAlpha to ensure SVGs are drawn with full opacity
    baseCtx.globalAlpha = 1;
    
    // Get display dimensions
    const displayWidth = baseCanvas.width / dpr;
    const displayHeight = baseCanvas.height / dpr;
    
    // Create a temporary high-resolution canvas for drawing SVGs
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = baseCanvas.width;  // Use full physical pixel width
    tempCanvas.height = baseCanvas.height; // Use full physical pixel height
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.scale(dpr, dpr); // Scale the context to work in display coordinates
    
    // Draw the background on temp canvas
    tempCtx.fillStyle = '#F5F5F5';
    tempCtx.fillRect(0, 0, displayWidth, displayHeight);
    
    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;
    const offsetX = -150;
    const startX = centerX + offsetX;
    const startY = centerY;
    
    const baseWidth = 655;
    const baseHeight = 493;
    const scale = 1.2;
    const svgWidth = baseWidth * scale;
    const svgHeight = baseHeight * scale;
    
    // Draw back.svg first (at the very bottom, always visible)
    if (backSvgRef.current && backSvgRef.current.complete) {
      const x = startX - svgWidth / 2;
      const y = startY - svgHeight / 2;
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      tempCtx.drawImage(backSvgRef.current, x, y, svgWidth, svgHeight);
    }
    
    // Get current step's SVG index
    const currentStepData = currentStep > 0 ? steps[currentStep] : null;
    const currentSvgIndex = currentStepData && currentStepData.svgIndex !== null ? currentStepData.svgIndex : -1;
    
    // Draw all SVGs from Set 2 EXCEPT the current step's SVG and bugs SVG (these go below current step's Set 1 SVG)
    const svgImagesSet2 = svgImagesSet2Ref.current;
    const bugsIndex = 5; // Bugs step SVG index
    if (svgImagesSet2 && svgImagesSet2.length > 0) {
      // Enable high quality image smoothing
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      
      svgImagesSet2.forEach((svgImg, index) => {
        // Skip current step's SVG from Set 2 (will draw it later on top)
        // Also skip bugs SVG (will draw it at the very end, just before brush strokes)
        if (index !== currentSvgIndex && index !== bugsIndex && svgImg && svgImg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          
          // Check if we have a colored version of this SVG
          const coloredSvg = coloredSvgsRef.current[index];
          if (coloredSvg && coloredSvg.complete) {
            // Use the colored version - full opacity (user's work)
            tempCtx.globalAlpha = 1.0;
            const highResScale = 4;
            const highResWidth = 655 * highResScale;
            const highResHeight = 493 * highResScale;
            tempCtx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
          } else {
            // Use the original SVG - 30% opacity (70% transparency)
            tempCtx.globalAlpha = 1.0;
            tempCtx.drawImage(svgImg, x, y, svgWidth, svgHeight);
          }
        }
      });
      // Reset transparency
      tempCtx.globalAlpha = 1.0;
    }
    
    // If we're not on step 0 (introduction), draw the current step's SVG from Set 1
    if (currentStep > 0 && currentSvgIndex >= 0) {
      const svgImg = svgImagesSet1Ref.current[currentSvgIndex];
      
      if (svgImg && svgImg.complete) {
        const x = startX - svgWidth / 2;
        const y = startY - svgHeight / 2;
        
        // Set 30% opacity for Set 1 SVG guide (70% transparency)
        tempCtx.globalAlpha = 1.0;
        // Draw the specific SVG for this step from Set 1
        tempCtx.drawImage(svgImg, x, y, svgWidth, svgHeight);
        // Reset transparency
        tempCtx.globalAlpha = 1.0;
      }
    }
    
    // Finally, draw current step's SVG from Set 2 (on top of everything)
    if (currentStep > 0 && currentSvgIndex >= 0 && svgImagesSet2 && svgImagesSet2[currentSvgIndex]) {
      // Check if we have a colored version of this SVG
      const coloredSvg = coloredSvgsRef.current[currentSvgIndex];
      
      // Enable high quality image smoothing
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      
      if (coloredSvg && coloredSvg.complete) {
        // Use the colored version - full opacity (user's work)
        tempCtx.globalAlpha = 1.0;
        const x = startX - svgWidth / 2;
        const y = startY - svgHeight / 2;
        
        // Calculate the high-res dimensions
        const highResScale = 4;
        const highResWidth = 655 * highResScale;
        const highResHeight = 493 * highResScale;
        
        // Draw from high-res source to display size
        tempCtx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
      } else {
        // Use the original SVG - 30% opacity (70% transparency)
        tempCtx.globalAlpha = 1.0;
        const svgImg = svgImagesSet2[currentSvgIndex];
        
        if (svgImg && svgImg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          tempCtx.drawImage(svgImg, x, y, svgWidth, svgHeight);
        }
      }
      // Reset transparency
      tempCtx.globalAlpha = 1.0;
    }
    
    // Draw bugs SVG on top of everything (but below brush strokes)
    // This ensures bugs are always visible above all other tree parts
    if (svgImagesSet2 && svgImagesSet2[bugsIndex]) {
      const coloredBugsSvg = coloredSvgsRef.current[bugsIndex];
      
      // Enable high quality image smoothing
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      
      if (coloredBugsSvg && coloredBugsSvg.complete) {
        // Use the colored version - full opacity (user's work)
        tempCtx.globalAlpha = 1.0;
        const x = startX - svgWidth / 2;
        const y = startY - svgHeight / 2;
        
        // Calculate the high-res dimensions
        const highResScale = 4;
        const highResWidth = 655 * highResScale;
        const highResHeight = 493 * highResScale;
        
        // Draw from high-res source to display size
        tempCtx.drawImage(coloredBugsSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
      } else {
        // Use the original SVG - 30% opacity (70% transparency)
        tempCtx.globalAlpha = 1.0;
        const bugsSvg = svgImagesSet2[bugsIndex];
        
        if (bugsSvg && bugsSvg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          tempCtx.drawImage(bugsSvg, x, y, svgWidth, svgHeight);
        }
      }
      // Reset transparency
      tempCtx.globalAlpha = 1.0;
    }
    
    // Clear the BASE canvas and draw the new SVG layer
    baseCtx.clearRect(0, 0, displayWidth, displayHeight);
    // Draw the high-res temp canvas at display size (baseCtx is already scaled)
    baseCtx.drawImage(tempCanvas, 0, 0, displayWidth, displayHeight);
    
    // Get the user canvas context for redrawing brush strokes
    const ctx = canvas.getContext('2d');
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    
    // Clear and redraw all brush strokes on the USER canvas (top layer)
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    redrawBrushStrokes(ctx);
    
    // Save combined state to history
    saveCanvasState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, steps]);

  // Initialize chat messages with first step guidance
  useEffect(() => {
    // Add initial guidance when starting or language changes
    if (currentStep === 0) {
      const initialStepData = steps[0];
      const initialText = language === 'EN'
        ? `${initialStepData.instructionEN}\n\n${initialStepData.descriptionEN}`
        : `${initialStepData.instructionCN}\n\n${initialStepData.descriptionCN}`;
      const initialMessages = [
        {
          sender: 'bot',
          text: initialText,
          timestamp: new Date().toISOString()
        }
      ];
      setChatMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Handle speaker on/off - stop audio when turned off
  useEffect(() => {
    if (!isSpeakerOn) {
      ttsService.stop();
    }
  }, [isSpeakerOn]);

  // Function to redraw brush strokes
  const redrawBrushStrokes = (ctx) => {
    brushStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      if (stroke.tool === 'pen') {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity / 100;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  };

  // Function to redraw canvas with base content, brush strokes, and texts
  const redrawCanvasWithTexts = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;
    
    // Clear the user canvas and redraw brush strokes
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    redrawBrushStrokes(ctx);
    
    // Draw all text elements on the user canvas (on top of brush strokes)
    canvasTexts.forEach((textObj) => {
      ctx.font = `${textObj.fontSize || 16}px Avenir, sans-serif`;
      ctx.fillStyle = textObj.color;
      ctx.textBaseline = 'top';
      ctx.fillText(textObj.text, textObj.x, textObj.y);
    });
  };

  // Redraw texts when canvasTexts changes or when dragging
  useEffect(() => {
    redrawCanvasWithTexts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasTexts, historyStep]);

  // Get combined canvas image (base + user layers) as data URL
  const getCombinedCanvasDataUrl = () => {
    const canvas = canvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    if (canvas && baseCanvas) {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.width / dpr;
      const displayHeight = canvas.height / dpr;
      
      // Create a temporary canvas to combine both layers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.scale(dpr, dpr);
      
      // Draw base layer first (SVG template)
      tempCtx.drawImage(baseCanvas, 0, 0, displayWidth, displayHeight);
      // Draw user layer on top
      tempCtx.drawImage(canvas, 0, 0, displayWidth, displayHeight);
      
      return tempCanvas.toDataURL('image/png');
    }
    return null;
  };

  // Save combined canvas state (base + user layers) to history
  const saveCanvasState = () => {
    const dataUrl = getCombinedCanvasDataUrl();
    if (dataUrl) {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(dataUrl);
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
  };

  const saveToHistory = () => {
    saveCanvasState();
  };

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
      // Filter out hint messages before sending to LLM
      const messagesForLLM = updatedMessages.filter(msg => msg.sender !== 'hint');
      // Get LLM response
      const llmResponse = await llmService.sendMessage(
        messagesForLLM,
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
      setIsLLMTyping(false); // Stop typing indicator immediately after message is added
      
      // If speaker is on, play the response as speech (don't block on this)
      if (isSpeakerOn) {
        // Stop any currently playing audio before playing new response
        ttsService.stop();
        ttsService.playText(llmResponse, language).catch(ttsError => {
          console.error('[Canvas] TTS Error:', ttsError);
        });
      }
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

  // Handle microphone button click for voice input
  const handleMicrophoneClick = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      console.log('[Canvas] Stopping recording...');
      setIsRecording(false);
      setIsMicrophoneOn(false);
      
      try {
        // Stop recording and get audio blob
        const audioBlob = await sttService.stopRecording();
        console.log('[Canvas] Recording stopped, transcribing...');
        
        // Show a temporary "transcribing" message
        const transcribingMessage = {
          sender: 'system',
          text: language === 'EN' ? 'Transcribing audio...' : '正在转录音频...',
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, transcribingMessage]);
        
        // Transcribe audio to text
        const transcribedText = await sttService.transcribe(audioBlob, language);
        console.log('[Canvas] Transcription result:', transcribedText);
        
        // Remove transcribing message
        setChatMessages(prev => prev.filter(msg => msg !== transcribingMessage));
        
        // Add user's voice message to chat
        const userMessage = {
          sender: 'user',
          text: transcribedText,
          timestamp: new Date().toISOString(),
          isVoiceMessage: true
        };
        
        const updatedMessages = [...chatMessages, userMessage];
        setChatMessages(updatedMessages);
        setIsLLMTyping(true);
        
        // Filter out hint messages before sending to LLM
        const messagesForLLM = updatedMessages.filter(msg => msg.sender !== 'hint');
        // Get LLM response
        const llmResponse = await llmService.sendMessage(
          messagesForLLM,
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
        setIsLLMTyping(false);
        
        // If speaker is on, play the response as speech
        if (isSpeakerOn) {
          ttsService.stop();
          ttsService.playText(llmResponse, language).catch(ttsError => {
            console.error('[Canvas] TTS Error:', ttsError);
          });
        }
      } catch (error) {
        console.error('[Canvas] Voice input error:', error);
        setIsRecording(false);
        setIsMicrophoneOn(false);
        
        // Show error message
        let errorText;
        if (error.message.includes('API key')) {
          errorText = language === 'EN' 
            ? "API key not configured. Please check your .env.local file."
            : "API密钥未配置。请检查您的.env.local文件。";
        } else if (error.message.includes('No active recording')) {
          errorText = language === 'EN' 
            ? "Recording not started properly. Please try again."
            : "录音未正确启动。请重试。";
        } else if (error.name === 'NotAllowedError') {
          errorText = language === 'EN' 
            ? "Microphone access denied. Please allow microphone access in your browser settings."
            : "麦克风访问被拒绝。请在浏览器设置中允许麦克风访问。";
        } else {
          errorText = language === 'EN' 
            ? "Voice input failed. Please try again."
            : "语音输入失败。请重试。";
        }
        
        const errorMessage = {
          sender: 'bot',
          text: errorText,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // Start recording
      console.log('[Canvas] Starting recording...');
      try {
        await sttService.startRecording();
        setIsRecording(true);
        setIsMicrophoneOn(true);
        console.log('[Canvas] Recording started');
      } catch (error) {
        console.error('[Canvas] Error starting recording:', error);
        
        let errorText;
        if (error.name === 'NotAllowedError') {
          errorText = language === 'EN' 
            ? "Microphone access denied. Please allow microphone access in your browser settings."
            : "麦克风访问被拒绝。请在浏览器设置中允许麦克风访问。";
        } else if (error.name === 'NotFoundError') {
          errorText = language === 'EN' 
            ? "No microphone found. Please connect a microphone and try again."
            : "未找到麦克风。请连接麦克风后重试。";
        } else {
          errorText = language === 'EN' 
            ? "Failed to start recording. Please try again."
            : "启动录音失败。请重试。";
        }
        
        const errorMessage = {
          sender: 'bot',
          text: errorText,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      // The useEffect watching historyStep will handle redrawing
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      // The useEffect watching historyStep will handle redrawing
    }
  };

  // Fill current step's SVG with selected color (from Set 2)
  const fillCurrentStepSvg = (fillColor) => {
    // Skip if on introduction step (no SVG to fill)
    if (currentStep === 0) return;
    
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    
    const ctx = baseCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = baseCanvas.width / dpr;
    const displayHeight = baseCanvas.height / dpr;
    
    // Reset globalAlpha to ensure SVGs are drawn with full opacity
    ctx.globalAlpha = 1;
    
    // Clear base canvas and redraw base tree except for the current step's SVG
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // Get the current step's SVG index
    const currentStepData = steps[currentStep];
    if (!currentStepData || currentStepData.svgIndex === null) return;
    
    const currentSvgIndex = currentStepData.svgIndex;
    
    // Draw back.svg first (at the very bottom, always visible)
    if (backSvgRef.current && backSvgRef.current.complete) {
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const offsetX = -150;
      const startX = centerX + offsetX;
      const startY = centerY;
      const baseWidth = 655;
      const baseHeight = 493;
      const scale = 1.2;
      const svgWidth = baseWidth * scale;
      const svgHeight = baseHeight * scale;
      const x = startX - svgWidth / 2;
      const y = startY - svgHeight / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(backSvgRef.current, x, y, svgWidth, svgHeight);
    }
    
    // Draw all SVGs from Set 2 EXCEPT the current step's SVG and bugs SVG (these go below current step's Set 1 SVG)
    const svgImagesSet2 = svgImagesSet2Ref.current;
    const bugsIndex = 5; // Bugs step SVG index
    if (svgImagesSet2 && svgImagesSet2.length > 0) {
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
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
      
      // Draw all SVGs from Set 2 except the current step's SVG and bugs SVG
      svgImagesSet2.forEach((svgImg, index) => {
        if (index !== currentSvgIndex && index !== bugsIndex && svgImg && svgImg.complete) {
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          
          // Check if we have a colored version of this SVG
          const coloredSvg = coloredSvgsRef.current[index];
          if (coloredSvg && coloredSvg.complete) {
            // Use the colored version - full opacity (user's work)
            ctx.globalAlpha = 1.0;
            const highResScale = 4;
            const highResWidth = 655 * highResScale;
            const highResHeight = 493 * highResScale;
            ctx.drawImage(coloredSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
          } else {
            // Use the original SVG - 30% opacity (70% transparency)
            ctx.globalAlpha = 1.0;
            ctx.drawImage(svgImg, x, y, svgWidth, svgHeight);
          }
        }
      });
      // Reset transparency
      ctx.globalAlpha = 1.0;
    }
    
    // Draw the current step's SVG from Set 1
    const svgImagesSet1 = svgImagesSet1Ref.current;
    if (svgImagesSet1 && svgImagesSet1.length > 0) {
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
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
        // Set 30% opacity for Set 1 SVG guide (70% transparency)
        ctx.globalAlpha = 1.0;
        ctx.drawImage(svgImagesSet1[currentSvgIndex], x, y, svgWidth, svgHeight);
        // Reset transparency
        ctx.globalAlpha = 1.0;
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
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
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
      
      // Full opacity for colored version (user's work)
      ctx.globalAlpha = 1.0;
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
      
      // Draw bugs SVG on top of everything (but below brush strokes)
      if (svgImagesSet2 && svgImagesSet2[bugsIndex]) {
        const centerX = displayWidth / 2;
        const centerY = displayHeight / 2;
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
        
        // If we just filled the bugs SVG (current step is bugs), draw directly from tempCanvas
        if (currentSvgIndex === bugsIndex) {
          // Full opacity for colored version (user's work)
          ctx.globalAlpha = 1.0;
          const x = startX - svgWidth / 2;
          const y = startY - svgHeight / 2;
          
          // Calculate the high-res dimensions
          const highResScale = 4;
          const highResWidth = 655 * highResScale;
          const highResHeight = 493 * highResScale;
          
          // Draw from high-res tempCanvas to display size
          ctx.drawImage(tempCanvas, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
        } else {
          // For other steps, check if we have a colored bugs SVG from previous fills
          const coloredBugsSvg = coloredSvgsRef.current[bugsIndex];
          
          if (coloredBugsSvg && coloredBugsSvg.complete) {
            // Use the colored version - full opacity (user's work)
            ctx.globalAlpha = 1.0;
            const x = startX - svgWidth / 2;
            const y = startY - svgHeight / 2;
            
            // Calculate the high-res dimensions
            const highResScale = 4;
            const highResWidth = 655 * highResScale;
            const highResHeight = 493 * highResScale;
            
            // Draw from high-res source to display size
            ctx.drawImage(coloredBugsSvg, 0, 0, highResWidth, highResHeight, x, y, svgWidth, svgHeight);
          } else {
            // Use the original SVG - 30% opacity (70% transparency)
            ctx.globalAlpha = 1.0;
            const bugsSvg = svgImagesSet2[bugsIndex];
            
            if (bugsSvg && bugsSvg.complete) {
              const x = startX - svgWidth / 2;
              const y = startY - svgHeight / 2;
              ctx.drawImage(bugsSvg, x, y, svgWidth, svgHeight);
            }
          }
        }
        // Reset transparency
        ctx.globalAlpha = 1.0;
      }
      
      // Redraw brush strokes on the USER canvas (top layer)
      const userCanvas = canvasRef.current;
      if (userCanvas) {
        const userCtx = userCanvas.getContext('2d');
        userCtx.clearRect(0, 0, displayWidth, displayHeight);
        redrawBrushStrokes(userCtx);
      }
      
      saveToHistory();
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a text element for dragging
    const ctx = canvas.getContext('2d');
    let clickedTextIndex = -1;
    
    for (let i = canvasTexts.length - 1; i >= 0; i--) {
      const textObj = canvasTexts[i];
      ctx.font = `${textObj.fontSize || 16}px Avenir, sans-serif`;
      const metrics = ctx.measureText(textObj.text);
      const textWidth = metrics.width;
      const textHeight = textObj.fontSize || 16;
      
      if (x >= textObj.x && x <= textObj.x + textWidth &&
          y >= textObj.y && y <= textObj.y + textHeight) {
        clickedTextIndex = i;
        break;
      }
    }
    
    if (clickedTextIndex !== -1) {
      // Only allow dragging temporary text
      if (canvasTexts[clickedTextIndex].isTemporary) {
        setDraggingTextIndex(clickedTextIndex);
        setDragOffset({
          x: x - canvasTexts[clickedTextIndex].x,
          y: y - canvasTexts[clickedTextIndex].y
        });
      }
      return;
    }
    
    // If using text tool, don't draw - only allow moving text labels
    if (currentTool === 'text') {
      return;
    }
    
    // If using fill tool, fill the current step's SVG and return
    if (currentTool === 'fill') {
      fillCurrentStepSvg(fillColor);
      return;
    }
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Start capturing the stroke
    const newStroke = {
      tool: currentTool,
      color: penColor,
      size: brushSize,
      opacity: brushOpacity,
      points: [{ x, y }]
    };
    setCurrentStroke(newStroke);
    
    if (currentTool === 'pen') {
      ctx.strokeStyle = penColor;
      ctx.globalAlpha = brushOpacity / 100;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    } else if (currentTool === 'eraser') {
      // Use destination-out to erase content
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle text dragging
    if (draggingTextIndex !== null) {
      const newTexts = [...canvasTexts];
      newTexts[draggingTextIndex] = {
        ...newTexts[draggingTextIndex],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      setCanvasTexts(newTexts);
      return;
    }
    
    // Check if hovering over text (when not drawing)
    if (!isDrawing) {
      const ctx = canvas.getContext('2d');
      let hoveredTextIndex = null;
      
      for (let i = canvasTexts.length - 1; i >= 0; i--) {
        const textObj = canvasTexts[i];
        // Only allow hovering on temporary text
        if (!textObj.isTemporary) continue;
        
        ctx.font = `${textObj.fontSize || 16}px Avenir, sans-serif`;
        const metrics = ctx.measureText(textObj.text);
        const textWidth = metrics.width;
        const textHeight = textObj.fontSize || 16;
        
        if (x >= textObj.x && x <= textObj.x + textWidth &&
            y >= textObj.y && y <= textObj.y + textHeight) {
          hoveredTextIndex = i;
          break;
        }
      }
      
      if (hoveredTextIndex !== hoveringTextIndex) {
        setHoveringTextIndex(hoveredTextIndex);
      }
      return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Add point to current stroke
    if (currentStroke) {
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, { x, y }]
      });
    }
  };

  const stopDrawing = () => {
    // Handle end of text dragging - don't save to history
    if (draggingTextIndex !== null) {
      setDraggingTextIndex(null);
      return;
    }
    
    if (isDrawing) {
      setIsDrawing(false);
      
      // Save the completed stroke
      if (currentStroke && currentStroke.points.length > 0) {
        setBrushStrokes([...brushStrokes, currentStroke]);
        setCurrentStroke(null);
      }
      
      // Reset drawing context to default state
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over'; // Reset to normal drawing mode
      }
      
      saveToHistory();
    }
  };

  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // Convert RGB to hex
  const rgbToHex = (r, g, b) => {
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  };

  // Adjust brightness of a color (0 = black, 50 = original, 100 = white)
  const adjustBrightness = (color, brightness) => {
    const [r, g, b] = hexToRgb(color);
    const factor = brightness / 50; // 50 is the middle point (original color)
    
    let newR, newG, newB;
    
    if (factor <= 1) {
      // Darken the color (0-50 range)
      newR = r * factor;
      newG = g * factor;
      newB = b * factor;
    } else {
      // Lighten the color (50-100 range)
      const lightenFactor = factor - 1;
      newR = r + (255 - r) * lightenFactor;
      newG = g + (255 - g) * lightenFactor;
      newB = b + (255 - b) * lightenFactor;
    }
    
    return rgbToHex(newR, newG, newB);
  };

  const selectColor = (color, tool = currentTool) => {
    setCurrentColor(color);
    setBaseColor(color);
    setColorBrightness(50); // Reset brightness to middle when selecting new color
    
    // Update tool-specific color state
    if (tool === 'pen') {
      setPenColor(color);
      setPenBaseColor(color);
      setPenBrightness(50);
    } else if (tool === 'fill') {
      setFillColor(color);
      setFillBaseColor(color);
      setFillBrightness(50);
    }
    
    if (!recentColors.includes(color)) {
      setRecentColors([color, ...recentColors.slice(0, 7)]);
    }
  };

  const handleBrightnessChange = (brightness, tool = currentTool) => {
    setColorBrightness(brightness);
    
    if (tool === 'pen') {
      setPenBrightness(brightness);
      const adjustedColor = adjustBrightness(penBaseColor, brightness);
      setPenColor(adjustedColor);
      setCurrentColor(adjustedColor);
    } else if (tool === 'fill') {
      setFillBrightness(brightness);
      const adjustedColor = adjustBrightness(fillBaseColor, brightness);
      setFillColor(adjustedColor);
      setCurrentColor(adjustedColor);
    } else {
      const adjustedColor = adjustBrightness(baseColor, brightness);
      setCurrentColor(adjustedColor);
    }
  };

  const addTextToCanvas = () => {
    if (textInputValue.trim()) {
      const canvas = canvasRef.current;
      
      // Add text in the left-center area (SVG display area) with small random offset to avoid overlap
      const randomOffsetX = (Math.random() - 0.5) * 60;  // -30 to +30 pixels
      const randomOffsetY = (Math.random() - 0.5) * 60;  // -30 to +30 pixels
      
      const newText = {
        text: textInputValue,
        x: canvas.width * 0.35 + randomOffsetX,  // Shifted left to SVG area center
        y: canvas.height / 2 + randomOffsetY,
        color: '#000000', // Fixed black color for all text labels
        fontSize: 16,
        isTemporary: true // Mark as temporary until user confirms
      };
      
      const newTexts = [...canvasTexts, newText];
      setCanvasTexts(newTexts);
      setTempTextIndex(newTexts.length - 1); // Set as the current temporary text
      
      // Switch to text tool so user can move the text without accidentally drawing
      setCurrentTool('text');
      
      setTextInputValue('');
      setShowTextInput(false);
    }
  };

  const confirmTextPlacement = () => {
    if (tempTextIndex !== null) {
      const newTexts = [...canvasTexts];
      newTexts[tempTextIndex] = {
        ...newTexts[tempTextIndex],
        isTemporary: false
      };
      setCanvasTexts(newTexts);
      setTempTextIndex(null);
      setCurrentTool('pen'); // Reset tool to pen after confirming text
      saveToHistory();
    }
  };

  const cancelTextPlacement = () => {
    if (tempTextIndex !== null) {
      const newTexts = canvasTexts.filter((_, index) => index !== tempTextIndex);
      setCanvasTexts(newTexts);
      setTempTextIndex(null);
      setCurrentTool('pen'); // Reset tool to pen after canceling text
    }
  };

  const nextStep = async () => {
    // Skip introduction step (step 0) - no submission needed
    if (currentStep === 0) {
      const nextStepIndex = currentStep + 1;
      const nextStepData = steps[nextStepIndex];
      
      const stepTransitionMessage = {
        sender: 'system',
        text: language === 'EN' 
          ? `━━━ ${nextStepData.titleEN} ━━━`
          : `━━━ ${nextStepData.titleCN} ━━━`,
        timestamp: new Date().toISOString()
      };
      
      const instructionMessage = {
        sender: 'bot',
        text: language === 'EN'
          ? `${nextStepData.instructionEN}\n\n${nextStepData.descriptionEN}`
          : `${nextStepData.instructionCN}\n\n${nextStepData.descriptionCN}`,
        timestamp: new Date().toISOString()
      };
      
      const messages = [stepTransitionMessage, instructionMessage];
      
      if (nextStepData.exampleImage) {
        const exampleMessage = {
          sender: 'bot',
          text: language === 'EN' ? 'Example:' : '示例：',
          timestamp: new Date().toISOString(),
          image: nextStepData.exampleImage
        };
        messages.push(exampleMessage);
        
        // Add hint message after example
        const exampleHintMessage = {
          sender: 'hint',
          text: language === 'EN' 
            ? 'Feel free to create in your own way—you don\'t need to follow the example strictly.'
            : '你可以自由发挥创作，不需要严格按照示例来绘画。',
          timestamp: new Date().toISOString()
        };
        messages.push(exampleHintMessage);
      }
      
      setChatMessages(prevMessages => [...prevMessages, ...messages]);
      setCurrentStep(currentStep + 1);
      setHasSubmittedCurrentStep(false);
      
      // If speaker is on, play the instruction as speech (don't block on this)
      if (isSpeakerOn) {
        // Stop any currently playing audio before playing new instruction
        ttsService.stop();
        const instructionText = language === 'EN'
          ? `${nextStepData.instructionEN}\n\n${nextStepData.descriptionEN}`
          : `${nextStepData.instructionCN}\n\n${nextStepData.descriptionCN}`;
        ttsService.playText(instructionText, language).catch(ttsError => {
          console.error('[Canvas] TTS Error:', ttsError);
        });
      }
      return;
    }
    
    // For drawing steps (1-7), require submission before proceeding
    if (!hasSubmittedCurrentStep && currentStep > 0) {
      // First click: Save and submit drawing to GPT
      // Get combined canvas (base SVG + user drawing) for submission
      const canvasDataUrl = getCombinedCanvasDataUrl();
      if (canvasDataUrl) {
        // Create a message with the canvas image
        const currentStepData = steps[currentStep];
        const userSubmissionMessage = {
          sender: 'user',
          text: language === 'EN' 
            ? `Here is my drawing for ${currentStepData.titleEN}`
            : `这是我的${currentStepData.titleCN}绘画`,
          timestamp: new Date().toISOString(),
          image: canvasDataUrl
        };
        
        // Add user's submission to chat
        const updatedMessages = [...chatMessages, userSubmissionMessage];
        setChatMessages(updatedMessages);
        setIsLLMTyping(true);
        
        try {
          // Filter out hint messages before sending to LLM
          const messagesForLLM = updatedMessages.filter(msg => msg.sender !== 'hint');
          // Get LLM response about the drawing
          const llmResponse = await llmService.sendMessage(
            messagesForLLM,
            language,
            currentStep
          );
          
          const botMessage = {
            sender: 'bot',
            text: llmResponse,
            timestamp: new Date().toISOString()
          };
          
          // Add a hint message after the bot response
          const hintMessage = {
            sender: 'hint',
            text: language === 'EN' 
              ? 'You can click “Next Step” at any time to end the current stage and enter the next one.'
              : '你可以随时点击“下一步”，结束当前阶段的探索并进入下一阶段。',
            timestamp: new Date().toISOString()
          };
          
          setChatMessages([...updatedMessages, botMessage, hintMessage]);
          setIsLLMTyping(false); // Stop typing indicator immediately after message is added
          
          // If speaker is on, play the response as speech (don't block on this)
          if (isSpeakerOn) {
            // Stop any currently playing audio before playing new response
            ttsService.stop();
            ttsService.playText(llmResponse, language).catch(ttsError => {
              console.error('[Canvas] TTS Error:', ttsError);
            });
          }
        } catch (error) {
          console.error('Error communicating with LLM:', error);
          
          let errorText = language === 'EN' 
            ? "I'm having trouble connecting right now. You can still continue to the next step."
            : "我现在遇到连接问题。你可以继续下一步。";
          
          const errorMessage = {
            sender: 'bot',
            text: errorText,
            timestamp: new Date().toISOString()
          };
          setChatMessages([...updatedMessages, errorMessage]);
          setIsLLMTyping(false);
        }
        
        // Mark current step as submitted
        setHasSubmittedCurrentStep(true);
      }
    } else {
      // Second click: Proceed to next step
      if (currentStep < steps.length - 1) {
        const nextStepIndex = currentStep + 1;
        const nextStepData = steps[nextStepIndex];
        
        const stepTransitionMessage = {
          sender: 'system',
          text: language === 'EN' 
            ? `━━━ ${nextStepData.titleEN} ━━━`
            : `━━━ ${nextStepData.titleCN} ━━━`,
          timestamp: new Date().toISOString()
        };
        
        // Check if this is the summary step
        if (nextStepData.isSummary) {
          // Summary step: Request LLM to generate closing reflection
          const canvasDataUrl = getCombinedCanvasDataUrl();
          
          const summaryRequestMessage = {
            sender: 'user',
            text: language === 'EN' 
              ? 'I have completed my Tree of Life. '
              : '我已经完成了我的生命之树。',
            timestamp: new Date().toISOString(),
            image: canvasDataUrl
          };
          
          const updatedMessages = [...chatMessages, stepTransitionMessage, summaryRequestMessage];
          setChatMessages(updatedMessages);
          setCurrentStep(currentStep + 1);
          setHasSubmittedCurrentStep(true); // Mark as submitted since we're requesting summary
          setIsLLMTyping(true);
          
          try {
            // Filter out hint messages before sending to LLM
            const messagesForLLM = updatedMessages.filter(msg => msg.sender !== 'hint');
            // Get LLM summary response
            const llmResponse = await llmService.sendMessage(
              messagesForLLM,
              language,
              nextStepIndex // Use the summary step index
            );
            
            const botMessage = {
              sender: 'bot',
              text: llmResponse,
              timestamp: new Date().toISOString()
            };
            
            setChatMessages([...updatedMessages, botMessage]);
            setIsLLMTyping(false);
            
            // If speaker is on, play the response as speech
            if (isSpeakerOn) {
              ttsService.stop();
              ttsService.playText(llmResponse, language).catch(ttsError => {
                console.error('[Canvas] TTS Error:', ttsError);
              });
            }
          } catch (error) {
            console.error('Error getting summary from LLM:', error);
            
            const errorMessage = {
              sender: 'bot',
              text: language === 'EN' 
                ? "I wasn't able to generate a reflection, but congratulations on completing your Tree of Life! Take a moment to appreciate the tree you've created."
                : "我无法生成反思，但恭喜你完成了生命之树！花点时间欣赏你创造的这棵树吧。",
              timestamp: new Date().toISOString()
            };
            setChatMessages([...updatedMessages, errorMessage]);
            setIsLLMTyping(false);
          }
        } else {
          // Regular drawing step
          const instructionMessage = {
            sender: 'bot',
            text: language === 'EN'
              ? `${nextStepData.instructionEN}\n\n${nextStepData.descriptionEN}`
              : `${nextStepData.instructionCN}\n\n${nextStepData.descriptionCN}`,
            timestamp: new Date().toISOString()
          };
          
          const messages = [stepTransitionMessage, instructionMessage];
          
          if (nextStepData.exampleImage) {
            const exampleMessage = {
              sender: 'bot',
              text: language === 'EN' ? 'Example:' : '示例：',
              timestamp: new Date().toISOString(),
              image: nextStepData.exampleImage
            };
            messages.push(exampleMessage);
            
            // Add hint message after example
            const exampleHintMessage = {
              sender: 'hint',
              text: language === 'EN' 
                ? 'Feel free to create in your own way—you don\'t need to follow the example strictly.'
                : '你可以自由发挥创作，不需要严格按照示例来绘画。',
              timestamp: new Date().toISOString()
            };
            messages.push(exampleHintMessage);
          }
          
          setChatMessages(prevMessages => [...prevMessages, ...messages]);
          setCurrentStep(currentStep + 1);
          setHasSubmittedCurrentStep(false);
          
          // If speaker is on, play the instruction as speech (don't block on this)
          if (isSpeakerOn) {
            // Stop any currently playing audio before playing new instruction
            ttsService.stop();
            const instructionText = language === 'EN'
              ? `${nextStepData.instructionEN}\n\n${nextStepData.descriptionEN}`
              : `${nextStepData.instructionCN}\n\n${nextStepData.descriptionCN}`;
            ttsService.playText(instructionText, language).catch(ttsError => {
              console.error('[Canvas] TTS Error:', ttsError);
            });
          }
        }
      } else {
        setIsCompleted(true);
      }
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
          {/* Brush Size Slider */}
          <div className="slider-group">
            <div className="slider-icon" title={language === 'EN' ? 'Brush Size' : '笔刷大小'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r={Math.max(3, brushSize / 5)} fill="currentColor" />
              </svg>
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
          </div>
          
          {/* Opacity Slider */}
          <div className="slider-group">
            <div className="slider-icon" title={language === 'EN' ? 'Opacity' : '透明度'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor" fillOpacity={brushOpacity / 100} />
              </svg>
            </div>
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
          </div>

          <div className="sidebar-divider"></div>

          <div className="vertical-tools">
            {/* Pen Tool with Color Indicator */}
            <div className="tool-with-color">
              <button 
                className={`vertical-tool-btn pen-btn ${currentTool === 'pen' ? 'active' : ''}`}
                onClick={() => {
                  // Toggle color panel only when pen is already selected
                  if (currentTool === 'pen') {
                    setIsColorPanelCollapsed(!isColorPanelCollapsed);
                  } else {
                    // Switch to pen and close any open panel
                    setCurrentTool('pen');
                    setIsColorPanelCollapsed(true);
                  }
                }}
                title={language === 'EN' ? 'Pen (click again to choose color)' : '画笔（再次点击选择颜色）'}
              >
                <img src="/element/brush.svg" alt="Pen" />
                <div 
                  className="color-indicator" 
                  style={{ backgroundColor: penColor }}
                ></div>
              </button>
              
              {/* Color Panel - Expands from pen button */}
              {!isColorPanelCollapsed && currentTool === 'pen' && (
                <div className="pen-color-panel">
                  {/* Brightness Slider */}
                  <div className="pen-brightness">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={penBrightness} 
                      onChange={(e) => handleBrightnessChange(e.target.value, 'pen')}
                      className="horizontal-brightness-slider"
                      style={{
                        background: `linear-gradient(to right, #1a1a1a, ${penBaseColor}, #ffffff)`
                      }}
                    />
                  </div>
                  
                  {/* Color Grid */}
                  <div className="pen-color-grid">
                    {colorPalette.map((color, idx) => (
                      <button
                        key={idx}
                        className={`pen-color-dot ${penColor === color ? 'active' : ''} ${color === '#FFFFFF' ? 'white-dot' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => selectColor(color, 'pen')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fill Tool with Color Indicator */}
            <div className="tool-with-color">
              <button 
                className={`vertical-tool-btn fill-btn ${currentTool === 'fill' ? 'active' : ''}`}
                onClick={() => {
                  // Toggle color panel only when fill is already selected
                  if (currentTool === 'fill') {
                    setIsColorPanelCollapsed(!isColorPanelCollapsed);
                  } else {
                    // Switch to fill and close any open panel
                    setCurrentTool('fill');
                    setIsColorPanelCollapsed(true);
                  }
                }}
                title={language === 'EN' ? 'Fill (click again to choose color)' : '填充（再次点击选择颜色）'}
              >
                <img src="/element/paint bucket.svg" alt="Fill" />
                <div 
                  className="color-indicator" 
                  style={{ backgroundColor: fillColor }}
                ></div>
              </button>
              
              {/* Color Panel - Expands from fill button */}
              {!isColorPanelCollapsed && currentTool === 'fill' && (
                <div className="pen-color-panel">
                  {/* Brightness Slider */}
                  <div className="pen-brightness">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={fillBrightness} 
                      onChange={(e) => handleBrightnessChange(e.target.value, 'fill')}
                      className="horizontal-brightness-slider"
                      style={{
                        background: `linear-gradient(to right, #1a1a1a, ${fillBaseColor}, #ffffff)`
                      }}
                    />
                  </div>
                  
                  {/* Color Grid */}
                  <div className="pen-color-grid">
                    {colorPalette.map((color, idx) => (
                      <button
                        key={idx}
                        className={`pen-color-dot ${fillColor === color ? 'active' : ''} ${color === '#FFFFFF' ? 'white-dot' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => selectColor(color, 'fill')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              className={`vertical-tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTool('eraser');
                setIsColorPanelCollapsed(true);
              }}
            >
              <img src="/element/eraser.svg" alt="Eraser" />
            </button>
            <button 
              className={`vertical-tool-btn ${currentTool === 'text' ? 'active' : ''}`}
              onClick={() => {
                setCurrentTool('text');
                setShowTextInput(true);
                setIsColorPanelCollapsed(true);
              }}
            >
              <img src="/element/keyboard.svg" alt="Text" />
            </button>
          </div>
        </div>

        {/* Canvas - Dual Layer Structure */}
        <div className="canvas-wrapper">
          {/* Base Layer: SVG Template (non-erasable) */}
          <canvas
            ref={baseCanvasRef}
            className="base-canvas"
          />
          {/* Top Layer: User Drawing (erasable) */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="drawing-canvas"
            style={{ 
              cursor: draggingTextIndex !== null ? 'grabbing' : 
                     hoveringTextIndex !== null ? 'grab' : 
                     currentTool === 'text' ? 'default' :
                     'crosshair' 
            }}
          />
          
          {/* Text Confirmation Buttons - shown next to temporary text */}
          {tempTextIndex !== null && canvasTexts[tempTextIndex] && (
            <div 
              className="text-action-buttons"
              style={{
                left: `${canvasTexts[tempTextIndex].x}px`,
                top: `${canvasTexts[tempTextIndex].y - 45}px`
              }}
            >
              <button 
                className="text-action-btn cancel-btn"
                onClick={cancelTextPlacement}
                title={language === 'EN' ? 'Cancel' : '取消'}
              >
                <img src="/element/wrong.svg" alt="Cancel" />
              </button>
              <button 
                className="text-action-btn confirm-btn"
                onClick={confirmTextPlacement}
                title={language === 'EN' ? 'Confirm' : '确定'}
              >
                <img src="/element/correct.svg" alt="Confirm" />
              </button>
            </div>
          )}
        </div>


        {/* Right Bottom Buttons - Above Bottom Toolbar */}
        <div className="right-bottom-buttons">
          {/* Re-edit Button - shown when drawing is submitted (not on summary step) */}
          {hasSubmittedCurrentStep && currentStep > 0 && !steps[currentStep]?.isSummary && (
            <button 
              type="button"
              className="next-step-btn-floating reedit-btn"
              onClick={() => {
                setHasSubmittedCurrentStep(false);
                // Add a message to chat informing the user they can now re-edit
                const reeditMessage = {
                  sender: 'bot',
                  text: language === 'EN' 
                    ? 'Feel free to continue editing your drawing. Click "Submit Drawing" again when you\'re ready.'
                    : '请继续编辑你的绘画。完成后再次点击"提交绘画"。',
                  timestamp: new Date().toISOString()
                };
                setChatMessages(prevMessages => [...prevMessages, reeditMessage]);
              }}
            >
              {language === 'EN' ? 'Re-edit' : '重新编辑'}
            </button>
          )}
          
          {/* Next Step Button */}
          {currentStep < steps.length - 1 && (
            <button 
              type="button"
              className={`next-step-btn-floating ${isLLMTyping ? 'loading' : ''}`}
              onClick={nextStep}
              disabled={isLLMTyping}
            >
              {isLLMTyping && !hasSubmittedCurrentStep ? (
                <>
                  <span className="spinner"></span>
                  {language === 'EN' ? 'Processing...' : '处理中...'}
                </>
              ) : currentStep === 0 ? (
                language === 'EN' ? 'Next Step' : '下一步'
              ) : !hasSubmittedCurrentStep ? (
                language === 'EN' ? 'Submit Drawing' : '提交绘画'
              ) : (
                language === 'EN' ? 'Next Step' : '下一步'
              )}
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <button 
              type="button"
              className={`next-step-btn-floating complete-btn ${isLLMTyping ? 'loading' : ''}`}
              onClick={nextStep}
              disabled={isLLMTyping}
            >
              {isLLMTyping ? (
                <>
                  <span className="spinner"></span>
                  {language === 'EN' ? 'Processing...' : '处理中...'}
                </>
              ) : steps[currentStep]?.isSummary ? (
                language === 'EN' ? 'Complete' : '完成'
              ) : !hasSubmittedCurrentStep ? (
                language === 'EN' ? 'Submit Drawing' : '提交绘画'
              ) : (
                language === 'EN' ? 'Complete' : '完成'
              )}
            </button>
          )}
          
          <button 
            className={`bottom-tool-btn microphone-btn ${isRecording ? 'active recording' : ''}`}
            onClick={handleMicrophoneClick}
            title={language === 'EN' 
              ? (isRecording ? 'Stop recording' : 'Start voice input') 
              : (isRecording ? '停止录音' : '开始语音输入')}
          >
            <img src="/element/microphone.svg" alt="Microphone" />
            {isRecording && (
              <span className="recording-indicator">●</span>
            )}
          </button>
          <button 
            className={`bottom-tool-btn speaker-btn ${isSpeakerOn ? 'active' : ''}`}
            onClick={() => {
              const newState = !isSpeakerOn;
              console.log('[Canvas] Speaker button clicked. New state:', newState);
              setIsSpeakerOn(newState);
            }}
          >
            <img src="/element/unmute.svg" alt="Speaker" />
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
              className="add-text-btn active"
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
          <div className="chat-messages">
            {chatMessages.map((message, idx) => (
              <div
                key={`${message.timestamp}-${idx}-${message.sender}`}
                className={`chat-message ${message.sender}`}
              >
                <div className="chat-bubble">
                  {renderTextWithBreaks(message.text)}
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt={message.text}
                      className="chat-message-image"
                    />
                  )}
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
        </div>
      </aside>
    </div>
  );
}

export default Canvas;


