export default function TermsAndConditions() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '20px', color: '#111827' }}>Terms & Conditions</h1>
      <div className="panel" style={{ padding: '35px', lineHeight: '1.7', color: '#4B5563', fontSize: '14px' }}>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', padding: '15px', borderRadius: '6px', marginBottom: '25px', fontWeight: '700' }}>
          DISCLAIMER: NOT FINANCIAL ADVICE.
        </div>
        
        <h3 style={{ color: '#111827', marginTop: '20px', marginBottom: '10px', fontSize: '16px' }}>1. Nature of the Service</h3>
        <p style={{ marginBottom: '15px' }}>The Mikrometoxos Assistant ("The Engine") is an educational software engineering and quantitative research project. It is not a registered broker, financial advisor, or wealth management service.</p>
        
        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>2. Accuracy of Information</h3>
        <p style={{ marginBottom: '15px' }}>While the Engine utilizes mathematical models (e.g., Markowitz SLSQP optimization, Walk-Forward backtesting) commonly used in institutional finance, the data provided is simulated and subject to latency. We make no warranties regarding the accuracy, completeness, or reliability of the technical indicators or tearsheets generated.</p>

        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>3. Risk Assumption</h3>
        <p style={{ marginBottom: '15px' }}>Algorithmic trading and equity investments carry a high degree of risk. Past performance generated in the backtester does not guarantee future results. Users assume full responsibility for any financial decisions made outside of this simulated environment.</p>
      </div>
    </div>
  );
}