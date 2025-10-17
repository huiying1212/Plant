import React, { useState } from 'react';
import './App.css';
import Canvas from './Canvas';

function App() {
  const [language, setLanguage] = useState('EN');
  const [activeModule, setActiveModule] = useState(null);
  const [activeNavItem, setActiveNavItem] = useState('Activity');
  const [showSource, setShowSource] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

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
      descriptionCN: '用树的各部分表达个人经历、技能与未来愿景。',
      icon: '/element/tree2.svg'
    },
    {
      id: 2,
      nameEN: 'Self-Esteem Flower',
      nameCN: '自尊之花',
      time: '6min',
      timeCN: '6分钟',
      descriptionEN: 'Uses a flower\'s parts to represent self-worth, growth, and nurturing personal strengths.',
      descriptionCN: '用花的各部分展现自我价值与成长。',
      icon: '/element/Self-esteem flower.svg'
    },
    {
      id: 3,
      nameEN: 'Seed-to-Weed',
      nameCN: '从种子出发',
      time: '10min',
      timeCN: '10分钟',
      descriptionEN: 'Uses the concept of a garden to understand and track the healing process.',
      descriptionCN: '用花园比喻记录疗愈历程。',
      icon: '/element/Seed-to-Weed.svg'
    },
    {
      id: 4,
      nameEN: 'Rosebush Fantasy',
      nameCN: '玫瑰幻想',
      time: '8min',
      timeCN: '8分钟',
      descriptionEN: 'Uses the metaphor of the rosebush\'s features to express emotional state and inner world.',
      descriptionCN: '用蔷薇花丛比喻表达情绪与内心世界。',
      icon: '/element/Rosebush fantasy.svg'
    },
    {
      id: 5,
      nameEN: 'Tree Theme Method',
      nameCN: '心灵树法',
      time: '6min',
      timeCN: '6分钟',
      descriptionEN: 'Uses tree as a metaphor for life stories to deal with depression and anxiety in daily life.',
      descriptionCN: '用树比喻生命故事，应对日常抑郁与焦虑。',
      icon: '/element/tree2.svg'
    },
    {
      id: 6,
      nameEN: 'The Garden',
      nameCN: '花园日记',
      time: '10min',
      timeCN: '10分钟',
      descriptionEN: 'Frames the life or mind as a garden, where thoughts and experiences are planted seeds.',
      descriptionCN: '把生活和心灵比作花园，种下想法与经历。',
      icon: '/element/The garden.svg'
    },
    {
      id: 7,
      nameEN: 'The Tree Me',
      nameCN: '我是树',
      time: '12min',
      timeCN: '12分钟',
      descriptionEN: 'Uses a tree as a narrative tool to explore their life story, strengths, relationships, and challenges.',
      descriptionCN: '用树探索生命故事、优势与人际挑战。',
      icon: '/element/The Tree Me.svg'
    },
    {
      id: 8,
      nameEN: 'Seasons for Growth',
      nameCN: '成长季节',
      time: '15min',
      timeCN: '15分钟',
      descriptionEN: 'Uses the cyclical nature of the four seasons to understand and cope with change, loss, and grief.',
      descriptionCN: '以四季循环理解变化与悲伤。',
      icon: '/element/Seasons for Growth.svg'
    }
  ];

  const recentlyUsed = [therapyModules[0], therapyModules[7]];

  const handleModuleClick = (moduleId) => {
    setActiveModule(activeModule === moduleId ? null : moduleId);
  };

  const handleNavClick = (navItem) => {
    setActiveNavItem(navItem);
  };

  const sidebarNavItems = [
    { key: 'Activity', icon: '/element/Activity.svg' },
    { key: 'History', icon: '/element/archive.svg' },
    { key: 'Settings', icon: '/element/setting.svg' }
  ];

  const sourceReferences = [
    '[Peer-reviewed] Ncube, N. (2006). The Tree of Life Project: Using Narrative Therapy with Children Affected by HIV/AIDS and Bereavement. International Journal of Narrative Therapy & Community Work.',
    '[Peer-reviewed] Denborough, D. (2008). Collective narrative practice (pp. 72-98). Adelaide: Dulwich Centre Publications.',
    'Denborough, D. (2014). Retelling the stories of our lives: Everyday narrative therapy to draw inspiration and transform experience. Norton.',
    'Ncube-Mililo, N., & Denborough, D. (2017). Tree of Life: Strengthening children and families affected by HIV and AIDS. REPSSI & Dulwich Centre.',
    '[Peer-reviewed] Shukla, M., & Luthra, A. (2020). Narrative therapy approaches with adolescent girls in India: Using the Tree of Life for resilience and re-authoring. Psychology and Developing Societies, 32(1), 59–82.',
    '[Peer-reviewed] Walsh, M., & Philipp, R. (2022). Tree of Life narrative practice with adult survivors of trauma: Applications in UK community mental health settings. British Journal of Social Work, 52(3), 1345–1362.',
    'Vetlesen, A. J. (2015). The denial of nature: Environmental philosophy in the era of global capitalism. Routledge.',
    '[Peer-reviewed] Murphy, J. Implementing the Tree of Life: A Mindfulness-Based Intervention Focusing on Positive Self-Cognitions.',
    '[Peer-reviewed] Ivanov, K. V. (2024). The cause of the current of the problem of palliative medicine in the “mirror” of shmerian-akkadian mythology. Bioethics journal, 17(2), 21-26.'
  ];

  if (showCanvas) {
    return <Canvas language={language} onClose={() => setShowCanvas(false)} />;
  }

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
            {sidebarNavItems.map((item) => (
              <div
                key={item.key}
                className={`nav-item ${activeNavItem === item.key ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
              >
                <img className="nav-icon" src={item.icon} alt={item.key} />
                <span>
                  {language === 'EN' ? item.key : 
                    item.key === 'Activity' ? '活动' : 
                    item.key === 'History' ? '历史记录' : '设置'}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {activeModule === 1 ? (
            <div className="detail-view">
              <button className="back-button" onClick={() => setActiveModule(null)}>
                <img src="/element/left.svg" alt="Back" />
                <span>{language === 'EN' ? 'Back' : '返回'}</span>
              </button>

              <div className="hero-card">
                <img className="hero-main" src="/element/Template (Tree of Life).jpg" alt="Tree of Life" />
              </div>

              <div className="detail-toolbar">
                <button className="source-button" onClick={() => setShowSource(true)}>
                  <img src="/element/notebook.svg" alt="Source" />
                  <span>{language === 'EN' ? 'Source' : '来源'}</span>
                </button>
              </div>

              <div className="detail-header">
                <div className="detail-title">
                  {language === 'EN' ? 'Tree of Life' : '生命之树'}
                </div>
                <div className="detail-time">{language === 'EN' ? '15min' : '15分钟'}</div>
              </div>

              <div className="detail-description">
                {language === 'EN'
                  ? 'The Tree of Life is a narrative-based metaphor therapy activity where a person draws a tree to represent their life story. Each part of the tree (roots, trunk, branches, leaves, fruits) symbolizes different aspects of self — such as origins, strengths, hopes, relationships, and contributions. By exploring and expanding these symbols, people can reflect on their identity, resources, and future possibilities in a safe, creative way.'
                  : '生命之树是一种叙事实践的隐喻疗愈活动，人们通过绘制一棵树来表达自己的生命故事。树的各个部分（根、树干、枝叶、果实）象征着自我的不同方面，如来源、优势、希望、关系与贡献。通过探索并延展这些象征，人们可以在安全且富有创造力的方式中反思自我身份、资源与未来可能性。'}
              </div>

              <div className="detail-prep">
                <div className="prep-title">{language === 'EN' ? 'Preparation:' : '准备：'}</div>
                <div className="prep-item">
                  <img src="/element/sofa.svg" alt="Preparation" />
                  <span>{language === 'EN' ? 'Find a quiet space to focus on your emotions.' : '找一个安静的空间，专注于你的情绪。'}</span>
                </div>
              </div>

              <div className="detail-actions">
                <button className="start-button" onClick={() => setShowCanvas(true)}>
                  {language === 'EN' ? 'Start' : '开始'}
                </button>
              </div>

              {showSource && (
                <>
                  <div className="modal-overlay" onClick={() => setShowSource(false)} />
                  <div className="modal">
                    <button className="modal-close" onClick={() => setShowSource(false)}>
                      <img src="/element/wrong.svg" alt="Close" />
                    </button>
                    <div className="modal-content">
                      {sourceReferences.map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
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
                    {module.icon && (
                      <img className="module-icon" src={module.icon} alt={language === 'EN' ? module.nameEN : module.nameCN} />
                    )}
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
                      {module.icon && (
                        <img className="module-icon" src={module.icon} alt={language === 'EN' ? module.nameEN : module.nameCN} />
                      )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
