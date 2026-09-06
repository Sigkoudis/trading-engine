import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend } from 'recharts'

const LINE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#e11d48'];

// Expanded documentation to take up the full bottom space
const indicatorDocs = {
  Trend: "TREND: General asset direction based on moving averages. BULL indicates upward momentum, BEAR indicates downward momentum. Used to establish the primary directional bias for trading strategies.",
  RSI: "RSI (Relative Strength Index): A 14-period momentum oscillator. Values > 70 indicate overbought conditions (potential reversal down), while < 30 indicates oversold conditions (potential reversal up).",
  Stochastic: "STOCHASTIC: Compares the closing price to its historical range to predict trend reversals. Highly effective in sideways or range-bound markets to find local tops and bottoms.",
  MACD: "MACD: Trend-following momentum indicator. A BULL signal triggers when the short-term average crosses above the long-term average, indicating accelerating market momentum.",
  Bollinger: "BOLLINGER BANDS: Standard deviation volatility bands. A 'squeeze' (bands narrowing) indicates extreme low volatility and almost always precedes a major price breakout in either direction.",
  ATR: "ATR (Average True Range): Raw metric of absolute market volatility. A higher value indicates larger intraday price swings, which is mathematically crucial for setting dynamic stop-loss levels.",
  ROC: "ROC (Rate of Change): Pure momentum oscillator measuring the percentage change in price between the current period and a past period. Positive values confirm upward momentum."
}

function App() {
  const [tickers, setTickers] = useState('AAPL,ETE.AT,MSFT')
  const [days, setDays] = useState(365)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [activeDoc, setActiveDoc] = useState(null)
  const [activeStocks, setActiveStocks] = useState([]) 
  const [latestStock, setLatestStock] = useState(null)

  const [sortByScore, setSortByScore] = useState(false)
  const [isNormalized, setIsNormalized] = useState(false)

  const getCurrencySymbol = (ticker) => ticker.toUpperCase().endsWith('.AT') ? '€' : '$';

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setActiveDoc(null)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/screen?tickers=${tickers}&days=${days}`)
      if (!response.ok) throw new Error('Failed to fetch data from the backend')
      
      const jsonData = await response.json()
      
      const repairedData = jsonData.data.map(stock => ({
        ...stock,
        history: stock.history.map(point => ({
          ...point,
          price: parseFloat(point.price) 
        }))
      }))

      setResults(repairedData)
      
      const allTickers = repairedData.map(s => s.ticker)
      setActiveStocks(allTickers)
      if (allTickers.length > 0) setLatestStock(allTickers[0])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  // Toggle info footer: if clicking the same indicator, turn it off. Otherwise, turn it on.
  const handleDocToggle = (docText) => {
    setActiveDoc(prev => prev === docText ? null : docText)
  }

  const unifiedChartData = useMemo(() => {
    if (results.length === 0) return []
    const merged = {}
    const basePrices = {} 
    
    results.forEach(stock => {
      if (stock.history.length > 0) {
        basePrices[stock.ticker] = stock.history[0].price;
      }
      
      stock.history.forEach(point => {
        if (!merged[point.date]) merged[point.date] = { date: point.date }
        
        if (isNormalized && basePrices[stock.ticker]) {
           const base = basePrices[stock.ticker];
           const percentChange = ((point.price - base) / base) * 100;
           merged[point.date][stock.ticker] = parseFloat(percentChange.toFixed(2));
        } else {
           merged[point.date][stock.ticker] = point.price;
        }
      })
    })

    // Sort chronologically (handling both numbers and strings)
    return Object.values(merged).sort((a, b) => {
      if (typeof a.date === 'number' && typeof b.date === 'number') return a.date - b.date;
      return String(a.date).localeCompare(String(b.date));
    })
  }, [results, isNormalized])

  const displayedSidebarStocks = useMemo(() => {
    let list = [...results];
    if (sortByScore) {
      list.sort((a, b) => {
        const scoreA = parseFloat(a.score.toString().replace(/[^0-9.-]+/g,"")) || 0;
        const scoreB = parseFloat(b.score.toString().replace(/[^0-9.-]+/g,"")) || 0;
        return scoreB - scoreA;
      });
    }
    return list;
  }, [results, sortByScore])

  const activeTA = results.find(s => s.ticker === latestStock)

  return (
    // Changed padding to hug the edges of the screen and max-width to 100%
    <div style={{ backgroundColor: '#0b0f19', color: '#e2e8f0', padding: '15px', paddingBottom: '80px', fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh' }}>
      
      <style>{`
        body { margin: 0; background-color: #0b0f19; }
        .data-value { font-family: 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', monospace; font-size: 13px; font-weight: 600; }
        
        .pro-input { background-color: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 6px 10px; font-size: 13px; outline: none; border-radius: 3px; }
        .pro-input:focus { border-color: #3b82f6; }
        
        .pro-btn { background-color: #2563eb; color: white; border: none; padding: 6px 16px; font-size: 12px; font-weight: bold; border-radius: 3px; cursor: pointer; transition: background 0.2s; letter-spacing: 0.5px; }
        .pro-btn:hover { background-color: #1d4ed8; }
        
        .action-btn { background-color: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 4px 8px; font-size: 11px; cursor: pointer; border-radius: 3px; font-weight: bold; transition: all 0.2s; text-transform: uppercase; }
        .action-btn:hover { background-color: #334155; color: white; }
        .action-btn.active { background-color: #cbd5e1; color: #0f172a; border-color: #cbd5e1; }

        .indicator-tag { background-color: transparent; border: 1px solid #334155; color: #94a3b8; padding: 2px 6px; border-radius: 3px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s; margin-right: 6px; }
        .indicator-tag:hover { background-color: #334155; color: white; border-color: #475569; }

        .stock-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; margin-bottom: 4px; border-radius: 3px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; background-color: #111827; color: #64748b; }
        .stock-row:hover { background-color: #1e293b; color: #94a3b8; }
        .stock-row.on { background-color: #1e293b; color: #f8fafc; border: 1px solid #334155; }
        
        .text-bull { color: #22c55e; }
        .text-bear { color: #ef4444; }
        .text-neutral { color: #94a3b8; }
        
        .panel { background-color: #111827; border: 1px solid #1e293b; border-radius: 4px; }
        
        /* Dense Grid for Top Panel */
        .ta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 20px; }
        .ta-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 4px; }
      `}</style>

      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '18px', letterSpacing: '1px', textTransform: 'uppercase', color: '#f8fafc' }}>Quant<span style={{color: '#3b82f6'}}>Terminal</span></h1>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="pro-input"
              value={tickers} onChange={(e) => setTickers(e.target.value)}
              placeholder="Tickers (e.g., AAPL, TSLA)"
              style={{ width: '300px' }}
            />
            {/* Expanded Timeframe Dropdown without the word "days" */}
            <select className="pro-input" value={days} onChange={(e) => setDays(e.target.value)} style={{ cursor: 'pointer', width: '70px' }}>
              <option value={1}>1D</option>
              <option value={7}>1W</option>
              <option value={30}>1M</option>
              <option value={90}>3M</option>
              <option value={180}>6M</option>
              <option value={365}>1Y</option>
              <option value={1825}>5Y</option>
            </select>
            <button className="pro-btn" onClick={handleSearch}>
              {loading ? 'PROCESSING...' : 'ANALYZE'}
            </button>
          </div>
        </header>
        
        {error && <div style={{ backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '8px', borderRadius: '3px', marginBottom: '15px', fontSize: '12px', border: '1px solid #b91c1c' }}>{error}</div>}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* 1. TOP PANEL: Full-Width Technical Analysis Grid (2 lines, 4 items each) */}
            {activeTA && (
              <div className="panel" style={{ padding: '10px 15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>{activeTA.ticker}</h2>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>ALGORITHMIC CONVICTION:</span>
                    <span className={`data-value ${activeTA.master_signal === 'BULL' ? 'text-bull' : activeTA.master_signal === 'BEAR' ? 'text-bear' : 'text-neutral'}`} style={{ fontSize: '14px' }}>
                      {activeTA.master_signal} [{activeTA.score}]
                    </span>
                  </div>
                </div>
                
                <div className="ta-grid">
                  {/* Row 1 */}
                  <div className="ta-item">
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>LATEST CLOSE</span>
                    <span className="data-value" style={{ color: '#f8fafc' }}>{getCurrencySymbol(activeTA.ticker)}{activeTA.price}</span>
                  </div>
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.Trend)}>TREND</button>
                    <span className="data-value" style={{ color: activeTA.trend === 'BULL' ? '#22c55e' : '#ef4444' }}>{activeTA.trend}</span>
                  </div>
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.RSI)}>RSI(14)</button>
                    <span className="data-value" style={{ color: activeTA.rsi > 70 ? '#ef4444' : activeTA.rsi < 30 ? '#22c55e' : '#94a3b8' }}>{activeTA.rsi}</span>
                  </div>
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.Stochastic)}>STOCH</button>
                    <span className="data-value" style={{ color: activeTA.stoch > 80 ? '#ef4444' : activeTA.stoch < 20 ? '#22c55e' : '#94a3b8' }}>{activeTA.stoch}</span>
                  </div>
                  
                  {/* Row 2 */}
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.MACD)}>MACD</button>
                    <span className="data-value" style={{ color: activeTA.macd === 'BULL' ? '#22c55e' : '#ef4444' }}>{activeTA.macd}</span>
                  </div>
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.Bollinger)}>BOLLINGER</button>
                    <span className="data-value" style={{ color: '#f8fafc' }}>{activeTA.bollinger}</span>
                  </div>
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.ATR)}>ATR</button>
                    <span className="data-value" style={{ color: '#f8fafc' }}>{activeTA.atr}</span>
                  </div>
                  <div className="ta-item">
                    <button className="indicator-tag" onClick={() => handleDocToggle(indicatorDocs.ROC)}>ROC</button>
                    <span className="data-value" style={{ color: activeTA.roc.includes('+') ? '#22c55e' : '#ef4444' }}>{activeTA.roc}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              
              {/* 2. PORTFOLIO SIDEBAR (Shrunk to 180px, tighter paddings) */}
              <div className="panel" style={{ width: '180px', flexShrink: 0, padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>ACTIVE ASSETS</span>
                  <button 
                    className={`action-btn ${sortByScore ? 'active' : ''}`} 
                    onClick={() => setSortByScore(!sortByScore)}
                  >
                    SORT
                  </button>
                </div>
                
                {displayedSidebarStocks.map((stock) => {
                  const isActive = activeStocks.includes(stock.ticker)
                  const originalIndex = results.findIndex(r => r.ticker === stock.ticker)
                  const color = LINE_COLORS[originalIndex % LINE_COLORS.length]
                  const signalClass = stock.master_signal === 'BULL' ? 'text-bull' : stock.master_signal === 'BEAR' ? 'text-bear' : 'text-neutral';
                  
                  return (
                    <div 
                      key={stock.ticker}
                      className={`stock-row ${isActive ? 'on' : ''}`}
                      onClick={() => toggleStock(stock.ticker)}
                      style={isActive ? { borderLeft: `3px solid ${color}` } : { borderLeft: '3px solid transparent' }}
                    >
                      <span>{stock.ticker}</span>
                      <span className={`data-value ${signalClass}`}>{stock.score}</span>
                    </div>
                  )
                })}
              </div>

              {/* 3. MAIN TERMINAL CHART */}
              <div className="panel" style={{ flexGrow: 1, minWidth: 0, padding: '10px 10px 5px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingLeft: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>AGGREGATE TIMELINE</span>
                  <button 
                    className={`action-btn ${isNormalized ? 'active' : ''}`}
                    onClick={() => setIsNormalized(!isNormalized)}
                  >
                    {isNormalized ? 'MODE: % DELTA' : 'MODE: ABSOLUTE ($/€)'}
                  </button>
                </div>

                <div style={{ height: '480px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={unifiedChartData}>
                      <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#1e293b" />
                      
                      {/* Dynamically switch between Number Timeline (1D/1W) and Category Strings (1M+) */}
                      <XAxis 
                        dataKey="date" 
                        type={days == 1 || days == 7 ? "number" : "category"}
                        domain={days == 1 || days == 7 ? ['dataMin', 'dataMax'] : ['auto', 'auto']}
                        tick={{fontSize: 10, fill: '#64748b'}} 
                        minTickGap={30} 
                        stroke="#334155"
                        tickFormatter={(val) => {
                          if (days != 1 && days != 7) return val; // Standard Day String
                          // Force Greek Time formatting for Intraday timestamps
                          const d = new Date(val);
                          const options = { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', hour12: false };
                          if (days == 7) { options.month = 'short'; options.day = 'numeric'; }
                          return d.toLocaleString('en-US', options);
                        }} 
                      />
                      
                      <YAxis 
                        type="number" 
                        domain={['auto', 'auto']} 
                        tick={{fontSize: 10, fill: '#64748b', fontFamily: 'monospace'}} 
                        stroke="#334155"
                        tickFormatter={(val) => isNormalized ? `${val}%` : val} 
                      />
                      
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '3px', fontSize: '11px', padding: '6px' }}
                        itemStyle={{ fontFamily: 'monospace' }}
                        labelFormatter={(label) => {
                          if (days != 1 && days != 7) return label;
                          const d = new Date(label);
                          return d.toLocaleString('en-US', { timeZone: 'Europe/Athens', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                        }}
                        formatter={(value, name) => [isNormalized ? `${value}%` : `${getCurrencySymbol(name)}${value}`, name]} 
                      />
                      
                      <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      <Brush dataKey="date" height={20} stroke="#334155" fill="#0b0f19" tickFormatter={() => ''} />
                      
                      {results.map((stock, index) => (
                        activeStocks.includes(stock.ticker) && (
                          <Line 
                            key={stock.ticker} type="monotone" dataKey={stock.ticker} 
                            stroke={LINE_COLORS[index % LINE_COLORS.length]} 
                            strokeWidth={1.5} dot={unifiedChartData.length <= 15 ? { r: 3 } : false} activeDot={{ r: 4 }} 
                          />
                        )
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Toggleable Terminal Info Bar spanning the whole bottom screen */}
      {activeDoc && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100vw', backgroundColor: '#0f172a', borderTop: '2px solid #3b82f6', color: '#e2e8f0', padding: '15px 30px', zIndex: 1000, display: 'flex', alignItems: 'center', boxShadow: '0 -4px 12px rgba(0,0,0,0.5)' }}>
          <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '3px 10px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold', marginRight: '20px', letterSpacing: '1px' }}>DOCS</span>
          <span style={{ fontSize: '13px', lineHeight: '1.5', width: '100%' }}>{activeDoc}</span>
        </div>
      )}
    </div>
  )
}

export default App