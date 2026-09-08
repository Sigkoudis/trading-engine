import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Tearsheet from './Tearsheet';

const LINE_COLORS = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#BE123C'];

export default function PortfolioBuilder() {
  const [optTickers, setOptTickers] = useState('AAPL, MSFT, GOOG, META');
  const [maxWeight, setMaxWeight] = useState(0.40);
  const [minWeight, setMinWeight] = useState(0.00);
  const [optResults, setOptResults] = useState(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState(null);

  const handleOptimize = async () => {
    setOptLoading(true); setOptError(null); setOptResults(null); 
    try {
      const response = await fetch(`https://trading-engine-zvhw.onrender.com/api/v1/optimize?tickers=${optTickers}&max_weight=${maxWeight}&min_weight=${minWeight}&base_currency=EUR`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Optimization failed. Check your Python terminal for errors.');
      }
      setOptResults(await response.json());
    } catch (err) { setOptError(err.message); } 
    finally { setOptLoading(false); }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '20px' }}>Portfolio Balance Builder (SLSQP)</h2>
      <div className="panel" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <input className="pro-input" value={optTickers} onChange={(e) => setOptTickers(e.target.value)} placeholder="e.g. AAPL, MSFT, GOOG" style={{ flexGrow: 1 }} />
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

      {optError && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontWeight: '700', fontSize: '13px', border: '1px solid #F87171', display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span> {optError}
        </div>
      )}

      {optResults && (
        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
          <div className="panel">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>Optimal Weights Allocation</h3>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#EFF6FF', padding: '10px 14px', borderRadius: '6px', border: '1px solid #BFDBFE', marginBottom: '20px' }}>
              <span style={{ fontSize: '18px', marginRight: '10px' }}>🧠</span>
              <div style={{ fontSize: '12.5px', color: '#1D4ED8', lineHeight: '1.5' }}>
                <strong style={{ fontWeight: '800' }}>Algorithmic Alpha Overlay Active:</strong> This allocation isn't just historical. The solver mathematically boosted expected returns based on real-time Technical Analysis momentum prior to executing Markowitz risk optimization.
              </div>
            </div>
            <div style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(optResults.weights).filter(([_, val]) => val > 0).map(([name, value]) => ({ name, value: value * 100 }))}
                    cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={3} dataKey="value"
                  >
                    {Object.entries(optResults.weights).filter(([_, val]) => val > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={LINE_COLORS[index % LINE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Target Weight']} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontWeight: 'bold', fontSize: '14px' }} itemStyle={{ color: '#111827' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: '700', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {Object.entries(optResults.weights).filter(([_, val]) => val === 0).length > 0 && (
              <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px', fontWeight: '800', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '8px', borderRadius: '6px' }}>
                🚫 ZERO ALLOCATION (REJECTED BY SOLVER): {Object.entries(optResults.weights).filter(([_, val]) => val === 0).map(e => e[0]).join(', ')}
              </div>
            )}
          </div>
          <div className="panel">
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '800' }}>In-Sample Simulated Tearsheet (1 Year)</h3>
            <Tearsheet data={optResults.tearsheet} />
          </div>
        </div>
      )}
    </div>
  );
}