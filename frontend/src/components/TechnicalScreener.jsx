import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, Legend } from 'recharts';

const LINE_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#BE123C'];

const indicatorDocs = {
  Trend: "TREND (Moving Average Convergence): Evaluates the primary asset trajectory by cross-referencing short-term and long-term exponential moving averages. A BULL signal dictates strong upward momentum, validating long entries.",
  RSI: "RSI (Relative Strength Index): A 14-period momentum oscillator measuring the speed and magnitude of recent price changes. Values > 70 flag overbought conditions (sell pressure), while < 30 flag oversold conditions (buy zones).",
  Stochastic: "STOCHASTIC OSCILLATOR: Compares a particular closing price to a range of its prices over a specific period. Highly sensitive to market momentum, predicting trend reversals before they occur in sideways markets.",
  MACD: "MACD (Moving Average Convergence Divergence): A trend-following momentum indicator that shows the relationship between two moving averages. Signal line crossovers act as immediate triggers for algorithmic buy/sell executions.",
  Bollinger: "BOLLINGER BANDS: Volatility bands placed above and below a moving average. A 'squeeze' (bands narrowing tightly) indicates low volatility and mathematically precedes a massive, explosive price breakout in either direction.",
  ATR: "ATR (Average True Range): A pure metric of absolute market volatility. It decomposes the entire range of an asset price for that period, dictating dynamic stop-loss placement and risk-adjusted position sizing.",
  ROC: "ROC (Rate of Change): A pure momentum oscillator measuring the percentage change in price between the current period and a past period. Positive ROC confirms bullish momentum, while negative confirms bearish divergence.",
  EMA9: "EMA (9): The 'Trigger' Line. A hyper-fast Exponential Moving Average used by day traders and swing traders. Crossing above the EMA 20 often triggers immediate algorithmic buy executions.",
  EMA20: "EMA (20): The 'Fast Tracker'. An Exponential Moving Average giving more mathematical weight to recent trading days. It hugs the price tightly, making it perfect for spotting immediate, short-term momentum shifts.",
  SMA50: "SMA (50): The 'Medium-Term Trend'. A Simple Moving Average over 50 days. It acts as a dynamic floor or ceiling. Price riding above it signals a healthy uptrend; dropping below signals dying momentum.",
  SMA100: "SMA (100): The 'Conviction' Line. Sitting perfectly between the 50 and 200 SMAs, it represents medium-to-long-term institutional conviction. If a stock drops below the 50 but bounces off the 100, the macro bull trend is still alive.",
  SMA200: "SMA (200): The 'God' Line. Represents the macro, long-term trend. When the 50 SMA crosses above it (Golden Cross), it's a massive buy signal. Crossing below (Death Cross) is a massive sell signal.",
  ATH_ATL: "ALL-TIME HIGH & LOW: Absolute historical price boundaries. Crossing above ATH initiates 'blue-sky breakout' conditions where no trapped overhead resistance exists.",
  Range6M: "6-MONTH RANGE (High/Low): Medium-term cyclical envelope over the past ~126 trading days. Breakouts above the 6M High confirm multi-month institutional accumulation.",
  Range2Y: "2-YEAR RANGE (High/Low): Long-term secular boundaries over ~504 trading days. Piercing a 2Y High marks a macro structural shift from consolidation to long-term markup.",
  Pivots: "CLASSIC PIVOT POINTS: Horizontal support/resistance floors calculated as P = (H + L + C) / 3. R1 represents near-term resistance; S1 represents baseline institutional support."
};

export default function TechnicalScreener() {
  const getCurrencySymbol = (ticker) => ticker.toUpperCase().endsWith('.AT') ? '€' : '$';

  const [tickers, setTickers] = useState('AAPL,ETE.AT,MSFT');
  const [days, setDays] = useState(365);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeStocks, setActiveStocks] = useState([]);
  const [latestStock, setLatestStock] = useState(null);
  const [sortByScore, setSortByScore] = useState(false);
  const [isNormalized, setIsNormalized] = useState(false);
  
  // Toggles
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA20, setShowEMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA100, setShowSMA100] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showATH, setShowATH] = useState(false);
  const [show6M, setShow6M] = useState(false);
  const [show2Y, setShow2Y] = useState(false);
  const [showPivots, setShowPivots] = useState(false);

  const handleSearch = async () => {
    setLoading(true); setError(null); setActiveDoc(null);
    try {
      const response = await fetch(`https://trading-engine-zvhw.onrender.com/api/v1/screen?tickers=${tickers}&days=${days}&base_currency=EUR`);
      if (!response.ok) throw new Error('Failed to fetch data from the backend.');
      const jsonData = await response.json();
      const repairedData = jsonData.data.map(stock => ({
        ...stock, history: stock.history.map(p => ({...p, price: parseFloat(p.price)}))
      }));
      setResults(repairedData);
      const allTickers = repairedData.map(s => s.ticker);
      setActiveStocks(allTickers);
      if (allTickers.length > 0) setLatestStock(allTickers[0]);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const toggleStock = (ticker) => {
    setActiveStocks(prev => prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]);
    setLatestStock(ticker);
  };

  const handleDocToggle = (docText) => setActiveDoc(prev => prev === docText ? null : docText);

  const unifiedChartData = useMemo(() => {
    if (results.length === 0) return [];
    const merged = {}; const basePrices = {};
    results.forEach(stock => {
      if (stock.history.length > 0) basePrices[stock.ticker] = stock.history[0].price;
      stock.history.forEach(point => {
        if (!merged[point.date]) merged[point.date] = { date: point.date };
        if (isNormalized && basePrices[stock.ticker]) {
           const base = basePrices[stock.ticker];
           merged[point.date][stock.ticker] = parseFloat((((point.price - base) / base) * 100).toFixed(2));
        } else {
           merged[point.date][stock.ticker] = point.price;
           if (point.ema_9) merged[point.date][`${stock.ticker}_EMA9`] = point.ema_9;
           if (point.ema_20) merged[point.date][`${stock.ticker}_EMA20`] = point.ema_20;
           if (point.sma_50) merged[point.date][`${stock.ticker}_SMA50`] = point.sma_50;
           if (point.sma_100) merged[point.date][`${stock.ticker}_SMA100`] = point.sma_100;
           if (point.sma_200) merged[point.date][`${stock.ticker}_SMA200`] = point.sma_200;
           if (point.upper_band) merged[point.date][`${stock.ticker}_Upper`] = point.upper_band;
           if (point.lower_band) merged[point.date][`${stock.ticker}_Lower`] = point.lower_band;
           if (point.ath) merged[point.date][`${stock.ticker}_ATH`] = point.ath;
           if (point.atl) merged[point.date][`${stock.ticker}_ATL`] = point.atl;
           if (point.h_6m) merged[point.date][`${stock.ticker}_H6M`] = point.h_6m;
           if (point.l_6m) merged[point.date][`${stock.ticker}_L6M`] = point.l_6m;
           if (point.h_2y) merged[point.date][`${stock.ticker}_H2Y`] = point.h_2y;
           if (point.l_2y) merged[point.date][`${stock.ticker}_L2Y`] = point.l_2y;
           if (point.pivot) merged[point.date][`${stock.ticker}_PIVOT`] = point.pivot;
           if (point.r1) merged[point.date][`${stock.ticker}_R1`] = point.r1;
           if (point.s1) merged[point.date][`${stock.ticker}_S1`] = point.s1;
        }
      });
    });
    return Object.values(merged).sort((a, b) => (typeof a.date === 'number' && typeof b.date === 'number') ? a.date - b.date : String(a.date).localeCompare(String(b.date)));
  }, [results, isNormalized]);

  const displayedSidebarStocks = useMemo(() => {
    let list = [...results];
    if (sortByScore) list.sort((a, b) => (parseFloat(b.score.toString().replace(/[^0-9.-]+/g,"")) || 0) - (parseFloat(a.score.toString().replace(/[^0-9.-]+/g,"")) || 0));
    return list;
  }, [results, sortByScore]);

  const activeTA = results.find(s => s.ticker === latestStock);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: '0', fontSize: '22px', fontWeight: '900', color: '#111827' }}>TECHNICAL <span style={{color: '#2563EB'}}>SCREENER</span></h1>
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

      {error && <div style={{ color: '#B91C1C', marginBottom: '20px' }}>⚠️ {error}</div>}

      {activeTA && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline', marginBottom: '20px' }}>
            <h2 style={{ margin: '0', fontSize: '28px', fontWeight: '900' }}>{activeTA.ticker}</h2>
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
              const isActive = activeStocks.includes(stock.ticker);
              const idx = results.findIndex(r => r.ticker === stock.ticker);
              const color = LINE_COLORS[idx % LINE_COLORS.length];
              return (
                <div key={stock.ticker} className={`stock-row ${isActive ? 'on' : ''}`} onClick={() => toggleStock(stock.ticker)} style={{ borderLeft: isActive ? `4px solid ${color}` : '4px solid transparent' }}>
                  <span>{stock.ticker}</span>
                  <span className="data-value">{stock.score}</span>
                </div>
              );
            })}
          </div>

          <div className="panel" style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', alignSelf: 'center' }}>AGGREGATE TIMELINE</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button className={`action-btn ${showATH && !isNormalized ? 'active' : ''}`} onClick={() => { setShowATH(!showATH); if (!showATH) setActiveDoc(indicatorDocs.ATH_ATL); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>ATH / ATL</button>
                <button className={`action-btn ${show6M && !isNormalized ? 'active' : ''}`} onClick={() => { setShow6M(!show6M); if (!show6M) setActiveDoc(indicatorDocs.Range6M); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>6M H/L</button>
                <button className={`action-btn ${show2Y && !isNormalized ? 'active' : ''}`} onClick={() => { setShow2Y(!show2Y); if (!show2Y) setActiveDoc(indicatorDocs.Range2Y); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>2Y H/L</button>
                <button className={`action-btn ${showPivots && !isNormalized ? 'active' : ''}`} onClick={() => { setShowPivots(!showPivots); if (!showPivots) setActiveDoc(indicatorDocs.Pivots); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>PIVOTS</button>
                <button className={`action-btn ${showEMA9 && !isNormalized ? 'active' : ''}`} onClick={() => { setShowEMA9(!showEMA9); if (!showEMA9) setActiveDoc(indicatorDocs.EMA9); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>EMA (9)</button>
                <button className={`action-btn ${showEMA20 && !isNormalized ? 'active' : ''}`} onClick={() => { setShowEMA20(!showEMA20); if (!showEMA20) setActiveDoc(indicatorDocs.EMA20); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>EMA (20)</button>
                <button className={`action-btn ${showSMA50 && !isNormalized ? 'active' : ''}`} onClick={() => { setShowSMA50(!showSMA50); if (!showSMA50) setActiveDoc(indicatorDocs.SMA50); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>SMA (50)</button>
                <button className={`action-btn ${showSMA100 && !isNormalized ? 'active' : ''}`} onClick={() => { setShowSMA100(!showSMA100); if (!showSMA100) setActiveDoc(indicatorDocs.SMA100); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>SMA (100)</button>
                <button className={`action-btn ${showSMA200 && !isNormalized ? 'active' : ''}`} onClick={() => { setShowSMA200(!showSMA200); if (!showSMA200) setActiveDoc(indicatorDocs.SMA200); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>SMA (200)</button>
                <button className={`action-btn ${showBollinger && !isNormalized ? 'active' : ''}`} onClick={() => { setShowBollinger(!showBollinger); if (!showBollinger) setActiveDoc(indicatorDocs.Bollinger); }} disabled={isNormalized} style={{ opacity: isNormalized ? 0.5 : 1 }}>BOLL</button>
                <button className={`action-btn ${isNormalized ? 'active' : ''}`} onClick={() => setIsNormalized(!isNormalized)} style={{ marginLeft: '6px' }}>{isNormalized ? '% DELTA' : 'ABSOLUTE'}</button>
              </div>
            </div>

            <div style={{ height: '500px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={unifiedChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{fontSize: 11}} minTickGap={30} tickFormatter={(val) => (days == 1 || days == 7) ? new Date(val).toLocaleString('en-US', {hour:'2-digit', minute:'2-digit', hour12:false}) : val} />
                  <YAxis domain={['auto', 'auto']} tick={{fontSize: 12}} tickFormatter={(val) => isNormalized ? `${val}%` : val} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    labelFormatter={(l) => (days == 1 || days == 7) ? new Date(l).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}) : l} 
                    formatter={(v, n) => {
                      if (typeof n === 'string' && (n.includes('_SMA') || n.includes('_EMA') || n.includes('_Upper') || n.includes('_Lower') || n.includes('_ATH') || n.includes('_ATL') || n.includes('_H6M') || n.includes('_L6M') || n.includes('_H2Y') || n.includes('_L2Y') || n.includes('_PIVOT') || n.includes('_R1') || n.includes('_S1'))) return [v.toFixed(2), n.split('_')[1]];
                      return [isNormalized ? `${v}%` : `${getCurrencySymbol(n)}${v}`, n];
                    }} 
                  />
                  <Legend verticalAlign="top" height={30} />
                  <Brush dataKey="date" height={24} stroke="#9CA3AF" />
                  
                  {results.flatMap((stock, i) => {
                    if (!activeStocks.includes(stock.ticker)) return [];
                    const color = LINE_COLORS[i % LINE_COLORS.length];
                    const lines = [ <Line key={stock.ticker} type="monotone" dataKey={stock.ticker} stroke={color} strokeWidth={2.5} dot={false} /> ];
                    
                    if (showATH && !isNormalized) {
                      lines.push(<Line key={`${stock.ticker}_ATH`} type="monotone" dataKey={`${stock.ticker}_ATH`} stroke="#DC2626" strokeWidth={2} dot={false} strokeDasharray="8 4" name={`${stock.ticker} ATH`} />);
                      lines.push(<Line key={`${stock.ticker}_ATL`} type="monotone" dataKey={`${stock.ticker}_ATL`} stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="8 4" name={`${stock.ticker} ATL`} />);
                    }
                    if (show6M && !isNormalized) {
                      lines.push(<Line key={`${stock.ticker}_H6M`} type="monotone" dataKey={`${stock.ticker}_H6M`} stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name={`${stock.ticker} 6M High`} />);
                      lines.push(<Line key={`${stock.ticker}_L6M`} type="monotone" dataKey={`${stock.ticker}_L6M`} stroke="#0284C7" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name={`${stock.ticker} 6M Low`} />);
                    }
                    if (show2Y && !isNormalized) {
                      lines.push(<Line key={`${stock.ticker}_H2Y`} type="monotone" dataKey={`${stock.ticker}_H2Y`} stroke="#B91C1C" strokeWidth={2} dot={false} strokeDasharray="6 6" name={`${stock.ticker} 2Y High`} />);
                      lines.push(<Line key={`${stock.ticker}_L2Y`} type="monotone" dataKey={`${stock.ticker}_L2Y`} stroke="#047857" strokeWidth={2} dot={false} strokeDasharray="6 6" name={`${stock.ticker} 2Y Low`} />);
                    }
                    if (showPivots && !isNormalized) {
                      lines.push(<Line key={`${stock.ticker}_PIVOT`} type="monotone" dataKey={`${stock.ticker}_PIVOT`} stroke="#8B5CF6" strokeWidth={2} dot={false} strokeDasharray="3 3" name={`${stock.ticker} Pivot (P)`} />);
                      lines.push(<Line key={`${stock.ticker}_R1`} type="monotone" dataKey={`${stock.ticker}_R1`} stroke="#EF4444" strokeWidth={1.5} dot={false} strokeDasharray="2 2" name={`${stock.ticker} R1 Resistance`} />);
                      lines.push(<Line key={`${stock.ticker}_S1`} type="monotone" dataKey={`${stock.ticker}_S1`} stroke="#10B981" strokeWidth={1.5} dot={false} strokeDasharray="2 2" name={`${stock.ticker} S1 Support`} />);
                    }
                    if (showEMA9 && !isNormalized) { lines.push(<Line key={`${stock.ticker}_EMA9`} type="monotone" dataKey={`${stock.ticker}_EMA9`} stroke="#14B8A6" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name={`${stock.ticker} EMA9`} />); }
                    if (showEMA20 && !isNormalized) { lines.push(<Line key={`${stock.ticker}_EMA20`} type="monotone" dataKey={`${stock.ticker}_EMA20`} stroke="#BE123C" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name={`${stock.ticker} EMA20`} />); }
                    if (showSMA50 && !isNormalized) { lines.push(<Line key={`${stock.ticker}_SMA50`} type="monotone" dataKey={`${stock.ticker}_SMA50`} stroke="#D97706" strokeWidth={2} dot={false} strokeDasharray="5 5" name={`${stock.ticker} SMA50`} />); }
                    if (showSMA100 && !isNormalized) { lines.push(<Line key={`${stock.ticker}_SMA100`} type="monotone" dataKey={`${stock.ticker}_SMA100`} stroke="#0369A1" strokeWidth={2.5} dot={false} strokeDasharray="6 6" name={`${stock.ticker} SMA100`} />); }
                    if (showSMA200 && !isNormalized) { lines.push(<Line key={`${stock.ticker}_SMA200`} type="monotone" dataKey={`${stock.ticker}_SMA200`} stroke="#7C3AED" strokeWidth={3} dot={false} strokeDasharray="8 8" name={`${stock.ticker} SMA200`} />); }
                    if (showBollinger && !isNormalized) {
                      lines.push(<Line key={`${stock.ticker}_Upper`} type="monotone" dataKey={`${stock.ticker}_Upper`} stroke="#9CA3AF" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name={`${stock.ticker} Upper`} />);
                      lines.push(<Line key={`${stock.ticker}_Lower`} type="monotone" dataKey={`${stock.ticker}_Lower`} stroke="#9CA3AF" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name={`${stock.ticker} Lower`} />);
                    }
                    return lines;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Floating Documentation Footer */}
      {activeDoc && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100vw', backgroundColor: '#111827', color: '#F9FAFB', paddingTop: '15px', paddingBottom: '15px', paddingLeft: '30px', paddingRight: '30px', zIndex: 9999, display: 'flex', alignItems: 'center', boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.2)' }}>
          <span style={{ backgroundColor: '#374151', color: '#FFFFFF', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '10px', paddingRight: '10px', borderRadius: '4px', fontSize: '12px', fontWeight: '800', marginRight: '20px', letterSpacing: '1px', flexShrink: 0 }}>DOCS</span>
          <span style={{ fontSize: '14px', lineHeight: '1.5', width: '100%', fontWeight: 500 }}>{activeDoc}</span>
        </div>
      )}
    </div>
  );
}