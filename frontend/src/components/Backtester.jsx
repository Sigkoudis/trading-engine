import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Tearsheet from './Tearsheet';

export default function Backtester() {
  const [btTickers, setBtTickers] = useState('AAPL, MSFT, GOOG, META');
  const [btStartDate, setBtStartDate] = useState('2024-01-01');
  const [btEndDate, setBtEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [btResults, setBtResults] = useState(null);
  const [btLoading, setBtLoading] = useState(false);
  const [btError, setBtError] = useState(null);

  const handleBacktest = async () => {
    setBtLoading(true); setBtError(null); setBtResults(null); 
    try {
        const response = await fetch(`https://trading-engine-zvhw.onrender.com/api/v1/backtest?tickers=${btTickers}&base_currency=EUR&start_date=${btStartDate}&end_date=${btEndDate}`);      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Backtest failed. Ensure you have enough historical data for this date range.');
      }
      setBtResults(await response.json());
    } catch (err) { setBtError(err.message); } 
    finally { setBtLoading(false); }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '20px' }}>Historical Checker (Walk-Forward Backtest)</h2>
      <div className="panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input className="pro-input" value={btTickers} onChange={(e) => setBtTickers(e.target.value)} placeholder="e.g. AAPL, MSFT, GOOG" style={{ flexGrow: 1, minWidth: '250px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563' }}>START:</span>
          <input type="date" className="pro-input" value={btStartDate} onChange={(e) => setBtStartDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563' }}>END:</span>
          <input type="date" className="pro-input" value={btEndDate} onChange={(e) => setBtEndDate(e.target.value)} />
        </div>
        <button className="pro-btn" onClick={handleBacktest} style={{ backgroundColor: '#059669' }}>
          {btLoading ? 'SIMULATING...' : 'RUN OUT-OF-SAMPLE TEST'}
        </button>
      </div>
      
      {btError && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontWeight: '700', fontSize: '13px', border: '1px solid #F87171', display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span> {btError}
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
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{fontFamily:'monospace', fontWeight:700}} formatter={(val) => [`$${val}`, 'Equity']} />
                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>Out-of-Sample Tearsheet</h3>
            <Tearsheet data={btResults.tearsheet} />
          </div>
        </div>
      )}
    </div>
  );
}