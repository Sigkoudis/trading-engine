export default function NotFound({ setActiveView }) {
  return (
    <div style={{ maxWidth: '800px', margin: '80px auto', textAlign: 'center', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '80px', fontWeight: '900', color: '#111827', margin: '0' }}>404</h1>
      <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '15px', borderRadius: '6px', border: '1px solid #F87171', display: 'inline-block', marginBottom: '30px', fontWeight: '700', letterSpacing: '1px' }}>
        [SYSTEM FAULT]: DIRECTORY UNKNOWN OR ROUTE OFFLINE
      </div>
      <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '30px', fontFamily: 'system-ui, sans-serif' }}>
        The requested module could not be located in the terminal architecture.
      </p>
      <button 
        onClick={() => setActiveView('home')} 
        className="pro-btn" 
        style={{ backgroundColor: '#2563EB', fontFamily: 'system-ui, sans-serif' }}
      >
        RETURN TO COMMAND CENTER
      </button>
    </div>
  );
}