import { useState, useEffect } from 'react';

export default function TickerTape() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('https://trading-engine-zvhw.onrender.com/api/v1/ticker-tape')
      .then(res => res.json())
      .then(data => { if (data.data) setItems(data.data); })
      .catch(err => console.error("Failed to load ticker tape", err));
  }, []);

  if (items.length === 0) return null;

  // Quadruple the array to ensure continuous, gapless circular scrolling on all screen sizes
  const loopedItems = [...items, ...items, ...items, ...items];

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      backgroundColor: '#02161A',
      borderBottom: '1px solid #1F2937',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes marqueeLoop {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: marqueeLoop 100s linear infinite;
          will-change: transform;
        }  
        .ticker-track:hover {
          animation-play-state: paused;
        }
        .ticker-node {
          display: flex;
          align-items: center;
          font-size: 13px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 700;
          padding: 10px 0;
          white-space: nowrap;
        }
      `}</style>
      <div className="ticker-track">
        {loopedItems.map((item, index) => (
          <div key={index} className="ticker-node">
            <span style={{ color: '#E5E7EB', marginRight: '6px' }}>{item.ticker}</span>
            <span style={{ color: '#D1D5DB', marginRight: '8px' }}>
              {item.ticker === 'BTC-USD' || item.price > 100 ? item.price.toLocaleString() : item.price}
            </span>
            <span style={{ color: item.change >= 0 ? '#10B981' : '#EF4444' }}>
              {item.change >= 0 ? `+${item.change}%` : `${item.change}%`}
            </span>
            <span style={{ color: '#374151', margin: '0 16px', fontWeight: 400 }}>|</span>
          </div>
        ))}
      </div>
    </div>
  );
}