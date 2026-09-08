import { useState } from 'react';

export default function Tearsheet({ data }) {
  const [activeKey, setActiveKey] = useState(null);

  const getTearsheetDoc = (key) => {
    const k = key.toLowerCase();
    if (k.includes('return')) return "The geometric average amount of money earned by the portfolio each year.";
    if (k.includes('volatility')) return "The annualized standard deviation of returns. Measures how wildly the portfolio swings up and down. Lower is generally safer.";
    if (k.includes('sharpe')) return "Measures return generated per unit of total risk. A Sharpe ratio > 1.0 is considered good, > 2.0 is excellent.";
    if (k.includes('sortino')) return "Measures return generated per unit of downside risk. It ignores 'good' upside volatility and only penalizes downside drops.";
    if (k.includes('calmar')) return "Measures return relative to the Maximum Drawdown risk. Higher values mean you got good returns without suffering massive historic drops.";
    if (k.includes('drawdown')) return "The single largest drop in portfolio value from a peak to a trough. Represents the worst-case historical loss.";
    if (k.includes('cvar') || k.includes('shortfall')) return "Conditional Value at Risk. The average loss during the absolute worst 5% of trading days. Answers: 'When a crash happens, how bad is the crash?'";
    if (k.includes('var')) return "Value at Risk. The maximum daily loss you can expect to see with 95% confidence. Only 5% of the time will daily losses exceed this number.";
    return "Quantitative metric definition not available.";
  };

  return (
    <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        {Object.entries(data).map(([key, val]) => {
          const isActive = activeKey === key;
          return (
            <div key={key} onClick={() => setActiveKey(isActive ? null : key)}
              style={{ cursor: 'pointer', padding: '10px', borderRadius: '6px', transition: 'all 0.2s', backgroundColor: isActive ? '#EFF6FF' : 'transparent', border: isActive ? '1px solid #BFDBFE' : '1px solid transparent' }}>
              <div style={{ fontSize: '11px', color: isActive ? '#1D4ED8' : '#6B7280', fontWeight: '800', textTransform: 'uppercase', marginBottom: '5px', transition: 'color 0.2s' }}>
                {key} <span style={{ fontSize: '12px' }}>ⓘ</span>
              </div>
              <div style={{ fontSize: '15px', color: '#111827', fontWeight: '800', fontFamily: 'monospace' }}>{val}</div>
            </div>
          );
        })}
      </div>
      {activeKey && (
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #D1D5DB', color: '#374151', fontSize: '13px', lineHeight: '1.5' }}>
          <strong style={{ color: '#111827' }}>{activeKey}:</strong> {getTearsheetDoc(activeKey)}
        </div>
      )}
    </div>
  );
}