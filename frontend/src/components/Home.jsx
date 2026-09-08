export default function Home({ setActiveView }) {
  return (
    <div style={{ maxWidth: '1000px', margin: '20px auto 40px', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <style>{`
        .home-card { transition: all 0.2s ease-in-out; cursor: pointer; border: 1px solid #E5E7EB; }
        .home-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border-color: #BFDBFE; }
        .home-card:hover h3 { color: #2563EB !important; }
        
        /* MOBILE RESPONSIVENESS */
        .home-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 768px) {
          .home-grid { grid-template-columns: 1fr; } /* Stacks cards vertically on phones */
          .home-title { font-size: 32px !important; }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h1 className="home-title" style={{ fontSize: '46px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px', fontWeight: '900', color: '#111827' }}>
          MIKROMETOXOS <span style={{ color: '#2563EB' }}>ASSISTANT</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#4B5563', fontWeight: '500', padding: '0 15px' }}>
          Institutional Quantitative Engine & Portfolio Optimization Terminal
        </p>
      </div>

      <div className="home-grid">
        <div className="panel home-card" onClick={() => setActiveView('screener')} style={{ display: 'flex', flexDirection: 'column', padding: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: '#111827', transition: 'color 0.2s' }}>Technical Analysis & Asset Charting</h3>
          <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.65', margin: 0 }}>Track Greek ATHEX and US equities in real-time with dynamic timeframe charts. Overlays algorithmic momentum signals, exponential moving averages, Bollinger bands, and institutional pivot support/resistance levels.</p>
        </div>

        <div className="panel home-card" onClick={() => setActiveView('builder')} style={{ display: 'flex', flexDirection: 'column', padding: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: '#111827', transition: 'color 0.2s' }}>Quantitative Portfolio Builder</h3>
          <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.65', margin: 0 }}>Construct mathematically optimal asset allocations using SciPy's Sequential Least Squares Programming (SLSQP). Maximizes expected Sharpe ratios while adhering to strict user-defined min/max weight constraints.</p>
        </div>

        <div className="panel home-card" onClick={() => setActiveView('backtester')} style={{ display: 'flex', flexDirection: 'column', padding: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px', color: '#111827', transition: 'color 0.2s' }}>Multi-Year Portfolio Backtesting</h3>
          <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.65', margin: 0 }}>Validate strategies through years of historical market cycles. Runs out-of-sample walk-forward simulations accounting for initial transaction drag, providing institutional tearsheets with Sharpe, Max Drawdown, and CVaR.</p>
        </div>
      </div>
    </div>
  );
}