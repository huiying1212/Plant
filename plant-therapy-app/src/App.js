import React, { useState } from 'react';
import './App.css';

function App() {
  const [language, setLanguage] = useState('EN');
  const [activeModule, setActiveModule] = useState(null);
  const [activeNavItem, setActiveNavItem] = useState('Activity');

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? '中' : 'EN');
  };

  const therapyModules = [
    {
      id: 1,
      nameEN: 'Tree of Life',
      nameCN: '生命之树',
      time: '15min',
      timeCN: '15分钟',
      descriptionEN: 'Uses a tree\'s parts to articulate their personal histories, skills, values, and future aspirations.',
      descriptionCN: '用树的各部分表达个人经历、技能与未来愿景。'
    },
    {
      id: 2,
      nameEN: 'Self-Esteem Flower',
      nameCN: '自尊之花',
      time: '6min',
      timeCN: '6分钟',
      descriptionEN: 'Uses a flower\'s parts to represent self-worth, growth, and nurturing personal strengths.',
      descriptionCN: '用花的各部分展现自我价值与成长。'
    },
    {
      id: 3,
      nameEN: 'Seed-to-Weed',
      nameCN: '从种子出发',
      time: '10min',
      timeCN: '10分钟',
      descriptionEN: 'Uses the concept of a garden to understand and track the healing process.',
      descriptionCN: '用花园比喻记录疗愈历程。'
    },
    {
      id: 4,
      nameEN: 'Rosebush Fantasy',
      nameCN: '玫瑰幻想',
      time: '8min',
      timeCN: '8分钟',
      descriptionEN: 'Uses the metaphor of the rosebush\'s features to express emotional state and inner world.',
      descriptionCN: '用蔷薇花丛比喻表达情绪与内心世界。'
    },
    {
      id: 5,
      nameEN: 'Tree Theme Method',
      nameCN: '心灵树法',
      time: '6min',
      timeCN: '6分钟',
      descriptionEN: 'Uses tree as a metaphor for life stories to deal with depression and anxiety in daily life.',
      descriptionCN: '用树比喻生命故事，应对日常抑郁与焦虑。'
    },
    {
      id: 6,
      nameEN: 'The Garden',
      nameCN: '花园日记',
      time: '10min',
      timeCN: '10分钟',
      descriptionEN: 'Frames the life or mind as a garden, where thoughts and experiences are planted seeds.',
      descriptionCN: '把生活和心灵比作花园，种下想法与经历。'
    },
    {
      id: 7,
      nameEN: 'The Tree Me',
      nameCN: '我是树',
      time: '12min',
      timeCN: '12分钟',
      descriptionEN: 'Uses a tree as a narrative tool to explore their life story, strengths, relationships, and challenges.',
      descriptionCN: '用树探索生命故事、优势与人际挑战。'
    },
    {
      id: 8,
      nameEN: 'Seasons for Growth',
      nameCN: '成长季节',
      time: '15min',
      timeCN: '15分钟',
      descriptionEN: 'Uses the cyclical nature of the four seasons to understand and cope with change, loss, and grief.',
      descriptionCN: '以四季循环理解变化与悲伤。'
    }
  ];

  const recentlyUsed = [therapyModules[0], therapyModules[7]];

  const handleModuleClick = (moduleId) => {
    setActiveModule(activeModule === moduleId ? null : moduleId);
  };

  const handleNavClick = (navItem) => {
    setActiveNavItem(navItem);
  };

  return (
    <div className="app">
      {/* Language Toggle */}
      <div className="language-toggle">
        <span 
          className={language === 'EN' ? 'active' : ''} 
          onClick={toggleLanguage}
        >
          EN
        </span>
        <span className="separator"> </span>
        <span 
          className={language === '中' ? 'active' : ''} 
          onClick={toggleLanguage}
        >
          中
        </span>
      </div>

      <div className="main-container">
        {/* Sidebar Navigation */}
        <div className="sidebar">
          <div className="sidebar-name">Name</div>
          <nav className="sidebar-nav">
            {['Activity', 'History', 'Settings'].map((item) => (
              <div
                key={item}
                className={`nav-item ${activeNavItem === item ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                {language === 'EN' ? item : 
                  item === 'Activity' ? '活动' : 
                  item === 'History' ? '历史记录' : '设置'}
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Greeting Section */}
          <div className="greeting">
            {language === 'EN' ? 'Hello there!' : '嗨，你好！'}
          </div>

          {/* Plant Metaphor Therapy Module Title */}
          <div className="module-title">
            {language === 'EN' ? 'Plant Metaphor Therapy Module' : '植物疗愈模版'}
          </div>

          {/* Therapy Modules Grid */}
          <div className="modules-grid">
            {therapyModules.map((module) => (
              <div
                key={module.id}
                className={`module-card ${activeModule === module.id ? 'active' : ''}`}
                onClick={() => handleModuleClick(module.id)}
              >
                <div className="module-time">
                  {language === 'EN' ? module.time : module.timeCN}
                </div>
                <div className="module-name">
                  {language === 'EN' ? module.nameEN : module.nameCN}
                </div>
                <div className="module-description">
                  {language === 'EN' ? module.descriptionEN : module.descriptionCN}
                </div>
              </div>
            ))}
          </div>

          {/* Recently Used Module */}
          <div className="recently-used">
            <h3>{language === 'EN' ? 'Recently Used Module' : '最近使用'}</h3>
            <div className="recent-modules">
              {recentlyUsed.map((module) => (
                <div
                  key={`recent-${module.id}`}
                  className="module-card recent"
                  onClick={() => handleModuleClick(module.id)}
                >
                  <div className="module-time">
                    {language === 'EN' ? module.time : module.timeCN}
                  </div>
                  <div className="module-name">
                    {language === 'EN' ? module.nameEN : module.nameCN}
                  </div>
                  <div className="module-description">
                    {language === 'EN' ? module.descriptionEN : module.descriptionCN}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Random Selection */}
          <div className="random-selection">
            <button className="random-button">
              {language === 'EN' ? 'Random Selection' : '随机探索'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
