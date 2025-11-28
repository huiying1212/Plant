// Vercel Serverless Function for Text-to-Speech using OpenAI TTS API
// Converts LLM text responses to audio using gpt-4o-mini-tts or tts-1

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

  // Get API key from server environment
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured in Vercel environment variables');
    return res.status(500).json({ 
      error: 'API key not configured on server. Please add OPENAI_API_KEY to Vercel environment variables.' 
    });
  }

  try {
    const { text, voice = 'alloy', model = 'gpt-4o-mini-tts' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Invalid request: text is required' });
    }

    // Validate voice option
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return res.status(400).json({ error: `Invalid voice. Must be one of: ${validVoices.join(', ')}` });
    }

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: text,
        voice: voice,
        response_format: 'mp3', // or 'opus', 'aac', 'flac'
        speed: 1.0 // 0.25 to 4.0
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI TTS API Error:', errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || 'OpenAI TTS API request failed',
        details: errorData.error
      });
    }

    // Get the audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Set proper headers for audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    
    // Send the audio data
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}


