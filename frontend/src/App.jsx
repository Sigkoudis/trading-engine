import { useState } from 'react';
import TechnicalScreener from './components/TechnicalScreener';
import PortfolioBuilder from './components/PortfolioBuilder';
import Backtester from './components/Backtester';
import TickerTape from './components/TickerTape';
import Home from './components/Home';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import CookiePolicy from './components/CookiePolicy';
import NotFound from './components/NotFound';

// Pure SVG Logo - Zero load time, infinite scaling
const LogoIcon = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M3.2 28.8V3.2L16 14.4L28.8 3.2V28.8H22.4V12.8L16 18.4L9.6 12.8V28.8H3.2Z" fill="#111827"/>
    <path d="M16 18.4L28.8 7.2V28.8H22.4V12.8L16 18.4Z" fill="#2563EB"/>
  </svg>
);

export default function App() {
  const [activeView, setActiveView] = useState('home'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  const validViews = ['home', 'screener', 'builder', 'backtester', 'privacy', 'terms', 'cookies'];
  const is404 = !validViews.includes(activeView);

  const handleNavClick = (id) => {
    setActiveView(id);
    setIsMobileMenuOpen(false); 
  };

  const renderNavBtn = (id, label) => (
    <button 
      onClick={() => handleNavClick(id)}
      aria-current={activeView === id ? "page" : undefined}
      className={`nav-btn ${activeView === id ? 'active' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', width: '100vw', maxWidth: '100vw', overflowX: 'hidden', backgroundColor: '#F3F4F6', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <style>{`
        :root { background-color: #F3F4F6 !important; }
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100%; max-width: 100%; min-height: 100vh; overflow-x: hidden !important; }
        * { box-sizing: border-box; }
        *:focus-visible { outline: 2px solid #2563EB; outline-offset: 2px; }
        
        .data-value { font-family: 'ui-monospace', 'SFMono-Regular', monospace; font-size: 13px; font-weight: 700; }
        .pro-input { background-color: #FFFFFF; color: #111827; border: 1px solid #D1D5DB; padding: 10px 14px; font-size: 14px; outline: none; border-radius: 6px; font-weight: 600; width: 100%; max-width: 100%; }
        .pro-input:focus { border-color: #2563EB; box-shadow: 0 0 0 1px #2563EB; }
        .pro-btn { background-color: #111827; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        .pro-btn:hover { background-color: #374151; }
        .panel { background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); padding: 25px; }
        
        .nav-btn { width: 100%; text-align: left; padding: 12px 16px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border: none; transition: all 0.2s; background-color: transparent; color: #4B5563; }
        .nav-btn:hover { background-color: #F3F4F6; color: #111827; }
        .nav-btn.active { background-color: #E5E7EB; color: #111827; }
        .legal-link { background: none; border: none; color: #6B7280; font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
        .legal-link:hover { color: #111827; background-color: #E5E7EB; }

        /* --- MOBILE LAYOUT OVERRIDES --- */
        .mobile-header { display: none; }
        .sidebar { width: 260px; min-width: 260px; border-right: 1px solid #E5E7EB; padding: 20px; background: #FFF; z-index: 10; }
        .main-workspace { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; width: calc(100vw - 260px); overflow-x: hidden; }
        
        @media (max-width: 768px) {
          .app-container { flex-direction: column !important; }
          .mobile-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background-color: #FFFFFF; border-bottom: 1px solid #E5E7EB; }
          .sidebar { width: 100%; min-width: 100%; border-right: none; border-bottom: 1px solid #E5E7EB; display: ${isMobileMenuOpen ? 'block' : 'none'}; }
          .main-workspace { width: 100vw; }
          .desktop-logo-wrapper { display: none !important; }
        }
      `}</style>

      {/* --- MOBILE HEADER --- */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LogoIcon />
          <h1 style={{ fontSize: '16px', fontWeight: '900', color: '#111827', margin: 0, lineHeight: '1.2' }}>
            MIKROMETOXOS <br/><span style={{color: '#2563EB'}}>ASSISTANT</span>
          </h1>
        </div>
        <button className="pro-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ padding: '8px 12px' }}>
          {isMobileMenuOpen ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* --- SIDEBAR --- */}
      <nav aria-label="Main Navigation" className="sidebar">
        
        <div className="desktop-logo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', marginTop: '10px' }}>
          <LogoIcon />
          <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '0.5px', lineHeight: '1.1' }}>
            MIKROMETOXOS <br/><span style={{color: '#2563EB'}}>ASSISTANT</span>
          </h1>
        </div>
        
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Terminal Engine</div>
        {renderNavBtn('home', 'COMMAND CENTER')}
        {renderNavBtn('screener', 'TECHNICAL SCREENER')}
        
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', marginBottom: '12px', marginTop: '35px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quant Analytics</div>
        {renderNavBtn('builder', 'PORTFOLIO BUILDER')}
        {renderNavBtn('backtester', 'LAST YEAR CHECKER')}
      </nav>

      {/* --- MAIN WORKSPACE --- */}
      <main role="main" className="main-workspace">
        <div aria-hidden="true"><TickerTape /></div>
        
        <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexGrow: 1 }}>
            {activeView === 'home' && <Home setActiveView={setActiveView} />}
            {activeView === 'screener' && <TechnicalScreener />}
            {activeView === 'builder' && <PortfolioBuilder />}
            {activeView === 'backtester' && <Backtester />}
            
            {activeView === 'privacy' && <PrivacyPolicy />}
            {activeView === 'terms' && <TermsAndConditions />}
            {activeView === 'cookies' && <CookiePolicy />}
            {is404 && <NotFound setActiveView={setActiveView} />}
          </div>

          <footer style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #D1D5DB', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <button onClick={() => handleNavClick('terms')} className="legal-link">Terms & Conditions</button>
            <button onClick={() => handleNavClick('privacy')} className="legal-link">Privacy Policy</button>
            <button onClick={() => handleNavClick('cookies')} className="legal-link">Cookie Policy</button>
            <span style={{ color: '#9CA3AF', fontSize: '12px', padding: '4px 8px', width: '100%', textAlign: 'center' }}>© 2026 Mikrometoxos Engine</span>
          </footer>
        </div>
      </main>
    </div>
  );
}