export default function CookiePolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '20px', color: '#111827' }}>Cookie Policy</h1>
      <div className="panel" style={{ padding: '35px', lineHeight: '1.7', color: '#4B5563', fontSize: '14px' }}>
        <p style={{ marginBottom: '20px' }}><strong>Last Updated: September 2026</strong></p>
        
        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>What are cookies?</h3>
        <p style={{ marginBottom: '15px' }}>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make web applications work more efficiently.</p>
        
        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>How we use cookies</h3>
        <p style={{ marginBottom: '15px' }}>Currently, Mikrometoxos Assistant relies exclusively on <strong>Strictly Necessary local states</strong> (via React) to manage your active session and navigation routing. We do not currently deploy cross-site tracking cookies, advertising pixels, or persistent third-party marketing scripts.</p>

        <h3 style={{ color: '#111827', marginTop: '25px', marginBottom: '10px', fontSize: '16px' }}>Future Deployments</h3>
        <p style={{ marginBottom: '15px' }}>If future versions of this Engine incorporate persistent user accounts, saved portfolios, or encrypted API keys, strictly necessary session cookies or browser LocalStorage will be utilized to maintain your security authorizations.</p>
      </div>
    </div>
  );
}