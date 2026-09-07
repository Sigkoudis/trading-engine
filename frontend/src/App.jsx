import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend, PieChart, Pie, Cell } from 'recharts'
const LINE_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#BE123C'];

const indicatorDocs = {
  Trend: "TREND (Moving Average Convergence): Evaluates the primary asset trajectory by cross-referencing short-term and long-term exponential moving averages. A BULL signal dictates strong upward momentum, validating long entries.",
  RSI: "RSI (Relative Strength Index): A 14-period momentum oscillator measuring the speed and magnitude of recent price changes. Values > 70 flag overbought conditions (sell pressure), while < 30 flag oversold conditions (buy zones).",
  Stochastic: "STOCHASTIC OSCILLATOR: Compares a particular closing price to a range of its prices over a specific period. Highly sensitive to market momentum, predicting trend reversals before they occur in sideways markets.",
  MACD: "MACD (Moving Average Convergence Divergence): A trend-following momentum indicator that shows the relationship between two moving averages. Signal line crossovers act as immediate triggers for algorithmic buy/sell executions.",
  Bollinger: "BOLLINGER BANDS: Volatility bands placed above and below a moving average. A 'squeeze' (bands narrowing tightly) indicates low volatility and mathematically precedes a massive, explosive price breakout in either direction.",
  ATR: "ATR (Average True Range): A pure metric of absolute market volatility. It decomposes the entire range of an asset price for that period, dictating dynamic stop-loss placement and risk-adjusted position sizing.",
  ROC: "ROC (Rate of Change): A pure momentum oscillator measuring the percentage change in price between the current period and a past period. Positive ROC confirms bullish momentum, while negative confirms bearish divergence."
}

export default function App() {
  const [activeView, setActiveView] = useState('home'); 
  const getCurrencySymbol = (ticker) => ticker.toUpperCase().endsWith('.AT') ? '€' : '$';

  // ==========================================
  // STATE: TECHNICAL SCREENER
  // ==========================================
  const [tickers, setTickers] = useState('AAPL,ETE.AT,MSFT')
  const [days, setDays] = useState(1)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeDoc, setActiveDoc] = useState(null)
  const [activeStocks, setActiveStocks] = useState([]) 
  const [latestStock, setLatestStock] = useState(null)
  const [sortByScore, setSortByScore] = useState(false)
  const [isNormalized, setIsNormalized] = useState(false)

  const handleSearch = async () => {
    setLoading(true); setError(null); setActiveDoc(null);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/screen?tickers=${tickers}&days=${days}&base_currency=EUR`)
      if (!response.ok) throw new Error('Failed to fetch data from the backend.')
      const jsonData = await response.json()
      const repairedData = jsonData.data.map(stock => ({
        ...stock, history: stock.history.map(p => ({...p, price: parseFloat(p.price)}))
      }))
      setResults(repairedData)
      const allTickers = repairedData.map(s => s.ticker)
      setActiveStocks(allTickers)
      if (allTickers.length > 0) setLatestStock(allTickers[0])
      setActiveView('screener')
    } catch (err) { setError(err.message) } 
    finally { setLoading(false) }
  }

  const toggleStock = (ticker) => {
    setActiveStocks(prev => {
      const isCurrentlyActive = prev.includes(ticker)
      if (isCurrentlyActive) {
        return prev.filter(t => t !== ticker) 
      } else {
        setLatestStock(ticker) 
        return [...prev, ticker] 
      }
    })
  }

  const handleDocToggle = (docText) => {
    setActiveDoc(prev => prev === docText ? null : docText)
  }

  const unifiedChartData = useMemo(() => {
    if (results.length === 0) return []
    const merged = {}; const basePrices = {};
    results.forEach(stock => {
      if (stock.history.length > 0) basePrices[stock.ticker] = stock.history[0].price;
      stock.history.forEach(point => {
        if (!merged[point.date]) merged[point.date] = { date: point.date }
        if (isNormalized && basePrices[stock.ticker]) {
           const base = basePrices[stock.ticker];
           merged[point.date][stock.ticker] = parseFloat((((point.price - base) / base) * 100).toFixed(2));
        } else {
           merged[point.date][stock.ticker] = point.price;
        }
      })
    })
    return Object.values(merged).sort((a, b) => {
      if (typeof a.date === 'number' && typeof b.date === 'number') return a.date - b.date;
      return String(a.date).localeCompare(String(b.date));
    })
  }, [results, isNormalized])

  const displayedSidebarStocks = useMemo(() => {
    let list = [...results];
    if (sortByScore) list.sort((a, b) => (parseFloat(b.score.toString().replace(/[^0-9.-]+/g,"")) || 0) - (parseFloat(a.score.toString().replace(/[^0-9.-]+/g,"")) || 0));
    return list;
  }, [results, sortByScore])

  const activeTA = results.find(s => s.ticker === latestStock)

  // ==========================================
  // STATE: PORTFOLIO BUILDER
  // ==========================================
  const [optTickers, setOptTickers] = useState('AAPL, MSFT, GOOG, META')
  const [maxWeight, setMaxWeight] = useState(0.40)
  const [minWeight, setMinWeight] = useState(0.00) // <-- ADDED MIN WEIGHT
  const [optResults, setOptResults] = useState(null)
  const [optLoading, setOptLoading] = useState(false)
  const [optError, setOptError] = useState(null)

  const handleOptimize = async () => {
    setOptLoading(true); 
    setOptError(null); 
    setOptResults(null); 
    try {
      // <-- INJECTED min_weight INTO THE URL BELOW
      const response = await fetch(`http://127.0.0.1:8000/api/v1/optimize?tickers=${optTickers}&max_weight=${maxWeight}&min_weight=${minWeight}&base_currency=EUR`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Optimization failed. Check your Python terminal for errors.');
      }
      
      setOptResults(await response.json());
    } catch (err) { 
      setOptError(err.message); 
    } finally { 
      setOptLoading(false); 
    }
  };

  // ==========================================
  // STATE: LAST YEAR CHECKER (BACKTEST)
  // ==========================================
  const [btTickers, setBtTickers] = useState('AAPL, MSFT, GOOG, META')
  const [btResults, setBtResults] = useState(null)
  const [btLoading, setBtLoading] = useState(false)
  const [btError, setBtError] = useState(null)

  const handleBacktest = async () => {
    setBtLoading(true); 
    setBtError(null); 
    setBtResults(null); // Wipes the old backtest graph immediately
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/backtest?tickers=${btTickers}&base_currency=EUR`)
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Backtest failed. Ensure you have enough historical data.');
      }
      setBtResults(await response.json())
    } catch (err) { 
      setBtError(err.message) 
    } finally { 
      setBtLoading(false) 
    }
  }

  // ==========================================
  // UI COMPONENTS
  // ==========================================
  const renderNavBtn = (id, label) => (
    <button onClick={() => setActiveView(id)}
      style={{
        width: '100%', textAlign: 'left', paddingTop: '12px', paddingBottom: '12px', paddingLeft: '16px', paddingRight: '16px', borderRadius: '6px', marginBottom: '8px', cursor: 'pointer',
        fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px', border: 'none', transition: 'all 0.2s',
        backgroundColor: activeView === id ? '#E5E7EB' : 'transparent',
        color: activeView === id ? '#111827' : '#4B5563'
      }}>
      {label}
    </button>
  );

  const renderTearsheet = (tearsheet) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', backgroundColor: '#F9FAFB', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '20px', paddingRight: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      {Object.entries(tearsheet).map(([key, val]) => (
        <div key={key}>
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>{key}</div>
          <div style={{ fontSize: '15px', color: '#111827', fontWeight: '800', fontFamily: 'monospace' }}>{val}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <style>{`
        :root { background-color: #F3F4F6 !important; }
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100%; min-height: 100vh; background-color: #F3F4F6 !important; }
        * { box-sizing: border-box; }
        .data-value { font-family: 'ui-monospace', 'SFMono-Regular', monospace; font-size: 13px; font-weight: 700; }
        .pro-input { background-color: #FFFFFF; color: #111827; border: 1px solid #D1D5DB; padding: 10px 14px; font-size: 14px; outline: none; border-radius: 6px; font-weight: 600; }
        .pro-input:focus { border-color: #2563EB; box-shadow: 0 0 0 1px #2563EB; }
        .pro-btn { background-color: #111827; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        .pro-btn:hover { background-color: #374151; }
        .action-btn { background-color: #F9FAFB; color: #4B5563; border: 1px solid #D1D5DB; padding: 4px 10px; font-size: 11px; cursor: pointer; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
        .action-btn.active { background-color: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
        .panel { background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); padding: 25px; }
        .stock-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin-bottom: 8px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid #E5E7EB; }
        .stock-row.on { background-color: #EFF6FF; border: 1px solid #BFDBFE; }
        .indicator-tag { background-color: transparent; border: none; color: #4B5563; padding: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: color 0.2s; margin-right: 6px; font-weight: 800; }
        .indicator-tag:hover { color: #2563EB; }
      `}</style>

      {/* --- SIDEBAR --- */}
      <div style={{ width: '260px', backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB', padding: '20px', flexShrink: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', marginBottom: '40px', marginTop: '10px', letterSpacing: '0.5px' }}>
          MIKROMETOXOS <br/><span style={{color: '#2563EB'}}>ASSISTANT</span>
        </h1>
        
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Terminal Engine</div>
        {renderNavBtn('home', 'COMMAND CENTER')}
        {renderNavBtn('screener', 'TECHNICAL SCREENER')}
        
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#9CA3AF', marginBottom: '12px', marginTop: '35px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quant Analytics</div>
        {renderNavBtn('builder', 'PORTFOLIO BUILDER')}
        {renderNavBtn('backtester', 'LAST YEAR CHECKER')}
      </div>

      {/* --- MAIN CONTENT --- */}
      <div style={{ flexGrow: 1, padding: '30px', overflowY: 'auto' }}>
        
        {/* VIEW: HOME */}
        {activeView === 'home' && (
          <div style={{ maxWidth: '800px', margin: '40px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontSize: '48px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '40px', fontWeight: '900', color: '#111827' }}>
              MIKROMETOXOS <span style={{color: '#2563EB'}}>ASSISTANT</span>
            </h1>
            <div className="panel" style={{ width: '100%', display: 'flex', gap: '15px', backgroundColor: '#FFFFFF', paddingTop: '30px', paddingBottom: '30px', paddingLeft: '30px', paddingRight: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
              <input value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="Enter Tickers (e.g., AAPL, ETE.AT, MSFT)" style={{ flexGrow: 1 }} className="pro-input" />
              <button onClick={handleSearch} className="pro-btn">{loading ? 'WAIT...' : 'LAUNCH SCREENER'}</button>
            </div>
          </div>
        )}

        {/* VIEW: PORTFOLIO BUILDER */}
        {activeView === 'builder' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '20px' }}>Portfolio Balance Builder (SLSQP)</h2>
            
            <div className="panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <input className="pro-input" value={optTickers} onChange={(e) => setOptTickers(e.target.value)} placeholder="e.g. AAPL, MSFT, GOOG" style={{ flexGrow: 1 }} />
              
              {/* --- NEW MIN WEIGHT INPUT --- */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563' }}>MIN WEIGHT:</span>
                <input type="number" step="0.01" max="1" min="0" className="pro-input" value={minWeight} onChange={(e) => setMinWeight(e.target.value)} style={{ width: '80px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563' }}>MAX WEIGHT:</span>
                <input type="number" step="0.05" max="1" min="0.1" className="pro-input" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} style={{ width: '80px' }} />
              </div>
              
              <button className="pro-btn" onClick={handleOptimize} style={{ backgroundColor: '#2563EB' }}>
                {optLoading ? 'OPTIMIZING...' : 'RUN SOLVER'}
              </button>
            </div>

            {/* --- ERROR DISPLAY ALERT --- */}
            {optError && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontWeight: '700', fontSize: '13px', border: '1px solid #F87171', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span> 
                {optError}
              </div>
            )}

            {optResults && (
              <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                <div className="panel">
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>Optimal Weights Allocation</h3>
                  <div style={{ height: '320px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(optResults.weights)
                            .filter(([_, val]) => val > 0)
                            .map(([name, value]) => ({ name, value: value * 100 }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={130}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {Object.entries(optResults.weights)
                            .filter(([_, val]) => val > 0)
                            .map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={LINE_COLORS[index % LINE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value.toFixed(1)}%`, 'Target Weight']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontWeight: 'bold', fontSize: '14px' }}
                          itemStyle={{ color: '#111827' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: '700', fontSize: '13px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* --- DISPLAY 0% ASSETS HERE --- */}
                  {Object.entries(optResults.weights).filter(([_, val]) => val === 0).length > 0 && (
                    <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px', fontWeight: '800', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '8px', borderRadius: '6px' }}>
                      🚫 ZERO ALLOCATION (REJECTED BY SOLVER): {Object.entries(optResults.weights).filter(([_, val]) => val === 0).map(e => e[0]).join(', ')}
                    </div>
                  )}

                </div>
                <div className="panel">
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>In-Sample Simulated Tearsheet (1 Year)</h3>
                  {renderTearsheet(optResults.tearsheet)}
                </div>
              </div>
            )}

        {/* VIEW: LAST YEAR CHECKER (BACKTESTER) */}
        {activeView === 'backtester' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '20px' }}>Last Year Checker (Walk-Forward Backtest)</h2>
            
            <div className="panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <input className="pro-input" value={btTickers} onChange={(e) => setBtTickers(e.target.value)} placeholder="e.g. AAPL, MSFT, GOOG" style={{ flexGrow: 1 }} />
              <button className="pro-btn" onClick={handleBacktest} style={{ backgroundColor: '#059669' }}>
                {btLoading ? 'SIMULATING...' : 'RUN OUT-OF-SAMPLE TEST'}
              </button>
            </div>
            
            {/* --- ERROR DISPLAY ALERT --- */}
            {btError && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontWeight: '700', fontSize: '13px', border: '1px solid #F87171', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span> 
                {btError}
              </div>
            )}

            {btResults && (
              <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                
                <div className="panel">
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>Out-of-Sample Performance ($10,000 Initial)</h3>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '15px' }}>Testing Period: {btResults.test_period}</div>
                  
                  <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={btResults.equity_curve}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{fontSize: 11, fill: '#6B7280'}} minTickGap={30} />
                        <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#6B7280', fontFamily: 'monospace'}} tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', paddingTop: '12px', paddingBottom: '12px', paddingLeft: '12px', paddingRight: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          itemStyle={{fontFamily:'monospace', fontWeight:700}} formatter={(val) => [`$${val}`, 'Equity']} 
                        />
                        <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel">
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>Out-of-Sample Tearsheet</h3>
                  {renderTearsheet(btResults.tearsheet)}
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW: TECHNICAL SCREENER */}
        {activeView === 'screener' && (
          <div style={{ maxWidth: '100%', paddingBottom: '60px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#111827' }}>TECHNICAL <span style={{color: '#2563EB'}}>SCREENER</span></h1>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="pro-input" value={tickers} onChange={(e) => setTickers(e.target.value)} style={{ width: '300px' }} />
                <select className="pro-input" value={days} onChange={(e) => setDays(e.target.value)} style={{ width: '80px' }}>
                  <option value={1}>1D</option>
                  <option value={7}>1W</option>
                  <option value={30}>1M</option>
                  <option value={90}>3M</option>
                  <option value={180}>6M</option>
                  <option value={365}>1Y</option>
                  <option value={1825}>5Y</option>
                </select>
                <button className="pro-btn" onClick={handleSearch}>{loading ? 'WAIT...' : 'ANALYZE'}</button>
              </div>
            </header>

            {activeTA && (
              <div className="panel" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '900' }}>{activeTA.ticker}</h2>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280' }}>ALGORITHMIC CONVICTION:</span>
                  <span className={`data-value ${activeTA.master_signal === 'BULL' ? 'text-bull' : activeTA.master_signal === 'BEAR' ? 'text-bear' : 'text-neutral'}`} style={{ fontSize: '16px' }}>
                    {activeTA.master_signal} [{activeTA.score}]
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700' }}>LATEST CLOSE</span>
                    <span className="data-value">{getCurrencySymbol(activeTA.ticker)}{activeTA.price}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.Trend)}>TREND</button>
                    <span className="data-value" style={{ color: activeTA.trend === 'BULL' ? '#059669' : '#DC2626' }}>{activeTA.trend}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.RSI)}>RSI(14)</button>
                    <span className="data-value" style={{ color: activeTA.rsi > 70 ? '#DC2626' : activeTA.rsi < 30 ? '#059669' : '#6B7280' }}>{activeTA.rsi}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.Stochastic)}>STOCH</button>
                    <span className="data-value" style={{ color: activeTA.stoch > 80 ? '#DC2626' : activeTA.stoch < 20 ? '#059669' : '#6B7280' }}>{activeTA.stoch}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.MACD)}>MACD</button>
                    <span className="data-value" style={{ color: activeTA.macd === 'BULL' ? '#059669' : '#DC2626' }}>{activeTA.macd}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.Bollinger)}>BOLLINGER</button>
                    <span className="data-value">{activeTA.bollinger}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.ATR)}>ATR</button>
                    <span className="data-value">{activeTA.atr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.ROC)}>ROC</button>
                    <span className="data-value" style={{ color: activeTA.roc.includes('+') ? '#059669' : '#DC2626' }}>{activeTA.roc}</span>
                  </div>
                </div>
                
              </div>
            )}

            {results.length > 0 && (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div className="panel" style={{ width: '220px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800' }}>ACTIVE ASSETS</span>
                    <button className={`action-btn ${sortByScore ? 'active' : ''}`} onClick={() => setSortByScore(!sortByScore)}>SORT</button>
                  </div>
                  {displayedSidebarStocks.map((stock) => {
                    const isActive = activeStocks.includes(stock.ticker)
                    const idx = results.findIndex(r => r.ticker === stock.ticker)
                    const color = LINE_COLORS[idx % LINE_COLORS.length]
                    return (
                      <div key={stock.ticker} className={`stock-row ${isActive ? 'on' : ''}`} onClick={() => toggleStock(stock.ticker)} style={{ borderLeft: isActive ? `4px solid ${color}` : '4px solid transparent' }}>
                        <span>{stock.ticker}</span>
                        <span className="data-value">{stock.score}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="panel" style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800' }}>AGGREGATE TIMELINE</span>
                    <button className={`action-btn ${isNormalized ? 'active' : ''}`} onClick={() => setIsNormalized(!isNormalized)}>
                      {isNormalized ? 'MODE: % DELTA' : 'MODE: ABSOLUTE ($/€)'}
                    </button>
                  </div>
                  <div style={{ height: '500px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={unifiedChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="date" tick={{fontSize: 11}} minTickGap={30} tickFormatter={(val) => (days == 1 || days == 7) ? new Date(val).toLocaleString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false}) : val} />
                        <YAxis domain={['auto', 'auto']} tick={{fontSize: 12}} tickFormatter={(val) => isNormalized ? `${val}%` : val} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', paddingTop: '12px', paddingBottom: '12px', paddingLeft: '12px', paddingRight: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          labelFormatter={(l) => (days == 1 || days == 7) ? new Date(l).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}) : l} 
                          formatter={(v, n) => [isNormalized ? `${v}%` : `${getCurrencySymbol(n)}${v}`, n]} 
                        />
                        <Legend verticalAlign="top" height={30} />
                        <Brush dataKey="date" height={24} stroke="#9CA3AF" />
                        {results.map((stock, i) => activeStocks.includes(stock.ticker) && (
                          <Line key={stock.ticker} type="monotone" dataKey={stock.ticker} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2.5} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {activeDoc && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100vw', backgroundColor: '#111827', color: '#F9FAFB', paddingTop: '15px', paddingBottom: '15px', paddingLeft: '30px', paddingRight: '30px', zIndex: 9999, display: 'flex', alignItems: 'center', boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.2)' }}>
          <span style={{ backgroundColor: '#374151', color: '#FFFFFF', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '10px', paddingRight: '10px', borderRadius: '4px', fontSize: '12px', fontWeight: '800', marginRight: '20px', letterSpacing: '1px', flexShrink: 0 }}>DOCS</span>
          <span style={{ fontSize: '14px', lineHeight: '1.5', width: '100%', fontWeight: 500 }}>{activeDoc}</span>
        </div>
      )}
    </div>
  )
}