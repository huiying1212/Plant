// Vercel Serverless Function for Speech-to-Text using OpenAI Whisper API
// Converts audio recordings to text

export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle multipart/form-data
  },
};

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
    // For serverless function, we need to parse the multipart form data
    const formData = new FormData();
    
    // Get the audio blob from request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Honor the actual content type the browser produced (webm/opus, mp4, ...)
    // rather than hard-coding webm — Safari for example records as audio/mp4.
    const incomingType = req.headers['content-type'] || 'audio/webm';
    const extension = incomingType.includes('mp4') ? 'mp4'
      : incomingType.includes('mpeg') ? 'mp3'
      : incomingType.includes('wav') ? 'wav'
      : 'webm';

    // Create a blob and append to form data
    const audioBlob = new Blob([audioBuffer], { type: incomingType });
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('model', 'whisper-1');

    // Forward the optional language hint (?language=en|zh) to Whisper
    const language = typeof req.query?.language === 'string' ? req.query.language : '';
    if (language) {
      formData.append('language', language);
    }

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI Whisper API Error:', errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || 'OpenAI Whisper API request failed',
        details: errorData.error
      });
    }

    const data = await response.json();
    
    // Return the transcribed text
    return res.status(200).json({ text: data.text });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}









