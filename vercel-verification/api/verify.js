module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, verificationId } = req.body;

  if (!token || !verificationId) {
    return res.status(400).json({ error: 'Token and verification ID required' });
  }

  try {
    // Call your bot's webhook to complete verification
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL;
    
    if (!botWebhookUrl) {
      return res.status(500).json({ error: 'Bot webhook URL not configured' });
    }

    const response = await fetch(botWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, verificationId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: errorText || 'Verification failed' 
      });
    }

    const data = await response.json();
    
    if (data.success) {
      return res.json({ success: true, message: 'Verification completed successfully!' });
    } else {
      return res.status(400).json({ error: data.error || 'Verification failed' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

