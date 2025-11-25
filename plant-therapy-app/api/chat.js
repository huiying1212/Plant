// Vercel Serverless Function for proxying OpenAI API requests
// This keeps your API key secure on the server side

export default async function handler(req, res) {
  // Enable CORS for your domain (adjust in production)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from server environment (not REACT_APP_ prefix)
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured in Vercel environment variables');
    return res.status(500).json({ 
      error: 'API key not configured on server. Please add OPENAI_API_KEY to Vercel environment variables.' 
    });
  }

  try {
    const { messages, requestedModel, temperature = 0.7, max_tokens = 500 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({ error: 'Invalid message format' });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: requestedModel || model,
        messages,
        temperature,
        max_tokens
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API Error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'OpenAI API request failed',
        details: data.error
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

