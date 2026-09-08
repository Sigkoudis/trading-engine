export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '20px', color: '#111827' }}>Privacy Policy</h1>
      <div className="panel" style={{ padding: '35px', lineHeight: '1.7', color: '#4B5563', fontSize: '14px' }}>
        <p style={{ marginBottom: '20px' }}><strong>Last Updated: September 2026</strong></p>
        
        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>1. Data Collection and Usage</h3>
        <p style={{ marginBottom: '15px' }}>Mikrometoxos Assistant is a quantitative portfolio demonstration tool. We do not actively collect, store, sell, or monetize personally identifiable information (PII). Any ticker symbols, financial queries, or portfolio constraints entered into the terminal are processed ephemerally via our backend engine solely to return algorithmic calculations.</p>
        
        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>2. Third-Party Market Data</h3>
        <p style={{ marginBottom: '15px' }}>This application interfaces with third-party financial data providers (e.g., Yahoo Finance). By utilizing the terminal, your IP address and query requests may be temporarily processed by these external data pipelines to fetch live historical pricing.</p>

        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>3. Contact Information</h3>
        <p style={{ marginBottom: '15px' }}>As this is a professional portfolio project, inquiries regarding the architecture, data processing, or codebase can be directed to the repository owner via GitHub.</p>
      </div>
    </div>
  );
}