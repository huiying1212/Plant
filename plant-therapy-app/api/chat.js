// Vercel Serverless Function for proxying OpenAI API requests
// This keeps your API key secure on the server side
// Supports both Chat Completions API and Responses API with RAG (file search)

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
  const vectorStoreId = process.env.VECTOR_STORE_ID;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured in Vercel environment variables');
    return res.status(500).json({ 
      error: 'API key not configured on server. Please add OPENAI_API_KEY to Vercel environment variables.' 
    });
  }

  try {
    const { 
      messages, 
      requestedModel, 
      temperature = 0.7, 
      max_tokens = 500,
      useRAG = false  // New parameter to enable RAG mode
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || msg.content === undefined) {
        return res.status(400).json({ error: 'Invalid message format: each message needs role and content' });
      }
    }

    // Determine which API to use based on RAG mode
    if (useRAG && vectorStoreId) {
      // Use Responses API with file search for RAG
      return await handleRAGRequest(req, res, {
        apiKey,
        model: requestedModel || model,
        messages,
        temperature,
        max_tokens,
        vectorStoreId
      });
    } else {
      // Use standard Chat Completions API
      return await handleChatRequest(req, res, {
        apiKey,
        model: requestedModel || model,
        messages,
        temperature,
        max_tokens
      });
    }
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Handle standard Chat Completions API request
async function handleChatRequest(req, res, { apiKey, model, messages, temperature, max_tokens }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
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
}

// Convert Chat Completions message format to Responses API format
function convertToResponsesFormat(msg) {
  const isUser = msg.role === 'user';
  const textType = isUser ? 'input_text' : 'output_text';
  
  if (Array.isArray(msg.content)) {
    // Multi-part content (text + image)
    return {
      role: msg.role,
      content: msg.content.map(part => {
        if (part.type === 'text') {
          return { type: textType, text: part.text };
        } else if (part.type === 'image_url') {
          // Images only make sense for user messages
          return { 
            type: 'input_image', 
            image_url: part.image_url.url,
            detail: part.image_url.detail || 'auto'
          };
        }
        return part;
      })
    };
  } else {
    // Simple text content
    return {
      role: msg.role,
      content: [{ type: textType, text: msg.content }]
    };
  }
}

// Handle Responses API request with RAG (file search)
async function handleRAGRequest(req, res, { apiKey, model, messages, temperature, max_tokens, vectorStoreId }) {
  // Extract system message if present
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');
  
  // Build input for Responses API with proper format conversion
  let input;
  if (otherMessages.length === 1) {
    // Single message - can be string or formatted content
    const msg = otherMessages[0];
    if (typeof msg.content === 'string') {
      input = msg.content;  // Simple string input
    } else {
      // Array content - convert to Responses API format
      input = convertToResponsesFormat(msg).content;
    }
  } else {
    // Multi-turn conversation - convert each message
    input = otherMessages.map(convertToResponsesFormat);
  }

  const requestBody = {
    model,
    input,
    tools: [{
      type: 'file_search',
      vector_store_ids: [vectorStoreId],
      max_num_results: 5  // Reduced for faster response
    }],
    // Let model decide when to use file_search (faster than forcing)
    tool_choice: 'auto',
    temperature,
    max_output_tokens: max_tokens
  };

  // Add system instructions if present
  if (systemMessage) {
    const baseInstructions = typeof systemMessage.content === 'string' 
      ? systemMessage.content 
      : systemMessage.content[0]?.text || '';
    
    requestBody.instructions = baseInstructions + `

IMPORTANT: You MUST search the Plant Metaphor Database knowledge base for EVERY response. Look for:
- Relevant plant metaphors that match the user's situation
- Therapeutic techniques and prompts from the database
- Specific plant imagery and symbolism that resonates with their experience
Always incorporate the knowledge base content naturally in your responses.`;
  }

  console.log('RAG Request to Responses API:', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('OpenAI Responses API Error:', data);
    return res.status(response.status).json({
      error: data.error?.message || 'OpenAI Responses API request failed',
      details: data.error
    });
  }

  console.log('RAG Response:', JSON.stringify(data, null, 2));

  // Transform Responses API format to match Chat Completions format for compatibility
  const transformedResponse = transformResponsesAPIOutput(data);
  
  return res.status(200).json(transformedResponse);
}

// Transform Responses API output to Chat Completions format
function transformResponsesAPIOutput(responsesData) {
  // Find the message output from the response
  const messageOutput = responsesData.output?.find(item => item.type === 'message');
  const fileSearchOutput = responsesData.output?.find(item => item.type === 'file_search_call');
  
  // Extract text content from the message
  let textContent = '';
  let annotations = [];
  
  if (messageOutput?.content) {
    for (const content of messageOutput.content) {
      if (content.type === 'output_text') {
        textContent += content.text;
        if (content.annotations) {
          annotations.push(...content.annotations);
        }
      }
    }
  }

  // Build citations from annotations
  const citations = annotations
    .filter(a => a.type === 'file_citation')
    .map(a => ({
      filename: a.filename,
      file_id: a.file_id,
      index: a.index
    }));

  // Extract search results for context
  const searchResults = fileSearchOutput?.results || [];

  return {
    id: responsesData.id,
    object: 'chat.completion',
    created: Date.now(),
    model: responsesData.model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: textContent
      },
      finish_reason: 'stop'
    }],
    // Include RAG-specific metadata
    rag_metadata: {
      citations,
      search_results: searchResults.map(r => ({
        filename: r.filename,
        score: r.score,
        text: r.text?.substring(0, 200) + '...'  // Preview of matched content
      })),
      queries: fileSearchOutput?.queries || []
    },
    usage: responsesData.usage
  };
}
