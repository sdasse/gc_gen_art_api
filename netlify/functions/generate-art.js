
// API handler for generating complex artistic systems using Claude
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    let prompt = '';

    // Parse request body
    try {
      const body = JSON.parse(event.body || '{}');
      prompt = body.prompt || '';
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    if (!prompt || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    console.log('Processing prompt:', prompt);

    // Check if Claude API key is available
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;

    if (!claudeApiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable.' 
        })
      };
    }

    // Use Claude to generate complex artistic systems
    const artData = await generateWithClaude(prompt.trim(), claudeApiKey);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(artData)
    };

  } catch (error) {
    console.error('Generation error:', error);

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: `Generation failed: ${error.message}`,
        details: error.stack || 'No additional details available'
      })
    };
  }
};

async function generateWithClaude(userPrompt, apiKey) {
  // Add request validation
  if (!userPrompt || userPrompt.trim().length === 0) {
    throw new Error('User prompt is required');
  }
  
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key is required');
  }
  
  // Validate prompt length to avoid token issues
  if (userPrompt.length > 500) {
    console.warn('User prompt is very long, truncating to avoid token limits');
    userPrompt = userPrompt.substring(0, 500);
  }

  // Optimized system prompt for Claude 3.5 Sonnet
  const systemPrompt = `You are a sophisticated 3D line art generator. Create complex, artistic line drawings in monochromatic blue (#509EF0).

REQUIREMENTS:
- Generate 200-500 lines using coordinates from -8 to +8
- Use any creative approach: organic forms, geometric structures, networks, patterns, technical diagrams, or abstract compositions
- Layer multiple visual systems for complexity and depth
- All lines must use color "#509EF0", opacity 1.0, lineWidth 1.5

OUTPUT FORMAT:
Return ONLY valid JSON in this exact structure:
{
  "title": "Creative title",
  "description": "Brief description", 
  "complexity_level": "high",
  "lines": [{"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 1.0, "lineWidth": 1.5}],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

Do not include any explanatory text, code blocks, or markdown. Return only the JSON object.`;

  try {
    console.log('Making Claude API request for prompt:', userPrompt.substring(0, 100));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: `Create 3D line art for: "${userPrompt}"`
          }
        ],
        system: systemPrompt
      })
    });

    console.log('Claude API response status:', response.status);
    console.log('Claude API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);
      
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }
      
      throw new Error(`Claude API error (${response.status}): ${errorDetails}`);
    }

    const claudeResult = await response.json();
    console.log('Claude result received');
    console.log('Response structure:', Object.keys(claudeResult));
    console.log('Content length:', claudeResult.content?.[0]?.text?.length);
    console.log('Usage:', claudeResult.usage);

    // Validate Claude response structure
    if (!claudeResult.content || !Array.isArray(claudeResult.content) || claudeResult.content.length === 0) {
      console.error('Invalid Claude response structure:', claudeResult);
      throw new Error('Claude returned invalid response structure');
    }
    
    const generatedText = claudeResult.content[0].text;
    
    // Validate response size
    if (!generatedText || generatedText.trim().length === 0) {
      throw new Error('Claude returned empty response');
    }
    
    if (generatedText.length > 50000) {
      console.warn('Claude response is very large:', generatedText.length, 'characters');
    }
    
    console.log('Raw Claude response preview:', generatedText.substring(0, 200));

    // Extract JSON from Claude's response with better parsing
    let artData;
    try {
      // Try multiple extraction methods
      let jsonString = null;
      
      // Method 1: Look for complete JSON objects with proper nesting
      const jsonRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/g;
      const matches = generatedText.match(jsonRegex);
      
      if (matches) {
        // Find the largest JSON object (likely the complete response)
        jsonString = matches.reduce((prev, current) => 
          current.length > prev.length ? current : prev
        );
      }
      
      // Method 2: Look for JSON between code blocks
      if (!jsonString) {
        const codeBlockMatch = generatedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
        }
      }
      
      // Method 3: Find JSON after specific markers
      if (!jsonString) {
        const markerPatterns = [
          /(?:return|output|result|json)[\s:]*(\{[\s\S]*?\})/i,
          /(\{[\s\S]*"lines"[\s\S]*?\})/
        ];
        
        for (const pattern of markerPatterns) {
          const match = generatedText.match(pattern);
          if (match) {
            jsonString = match[1];
            break;
          }
        }
      }
      
      if (!jsonString) {
        throw new Error('No valid JSON structure found in response');
      }
      
      // Clean up the JSON string
      jsonString = jsonString.trim();
      
      // Parse the JSON
      artData = JSON.parse(jsonString);
      
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error(`Failed to parse JSON from Claude response: ${parseError.message}. Raw response: ${generatedText.substring(0, 500)}...`);
    }

      // Validate structure
      if (!artData.lines || !Array.isArray(artData.lines)) {
        throw new Error('Claude did not generate valid lines array');
      }

      // Ensure monochromatic blue and clean up any malformed lines
      artData.lines = artData.lines.filter(line => 
        line.points && Array.isArray(line.points) && line.points.length >= 2
      ).map(line => ({
        ...line,
        color: "#509EF0"
      }));

      // Set camera if missing
      if (!artData.camera) {
        artData.camera = { position: [0, 0, 12], lookAt: [0, 0, 0] };
      }

      console.log(`Generated ${artData.lines.length} lines`);

      // Add response validation and debugging info
      console.log(`Successfully parsed ${artData.lines.length} lines`);
      console.log('Camera settings:', artData.camera);
      console.log('Sample line structure:', artData.lines[0]);
      
      // Validate minimum complexity but be more flexible
      if (artData.lines.length < 30) {
        console.warn(`Low complexity generated (${artData.lines.length} lines), but proceeding`);
      }
      
      // Add metadata for debugging
      artData.metadata = {
        generated_at: new Date().toISOString(),
        prompt: userPrompt,
        lines_count: artData.lines.length,
        response_length: generatedText.length
      };

      return artData;
    } else {
      console.error('Could not extract JSON from response:', generatedText);
      throw new Error(`Could not parse JSON from Claude response. Response: ${generatedText.substring(0, 500)}...`);
    }

  } catch (error) {
    console.error('Claude API error details:', error);
    console.error('Error stack:', error.stack);

    // Preserve original error context while providing helpful information
    if (error.message.includes('fetch') || error.name === 'TypeError') {
      throw new Error(`Network error connecting to Claude API: ${error.message}. Check internet connection and API endpoint.`);
    } else if (error.message.includes('JSON') || error.name === 'SyntaxError') {
      throw new Error(`Claude returned malformed JSON: ${error.message}. This may indicate a token limit or formatting issue.`);
    } else if (error.message.includes('Claude API error')) {
      // Re-throw Claude API errors with full context
      throw error;
    } else if (error.message.includes('No valid JSON structure found')) {
      throw new Error(`Claude response parsing failed: ${error.message}. The AI may have returned explanatory text instead of pure JSON.`);
    } else {
      throw new Error(`Unexpected error during Claude API call: ${error.message}. Full error: ${error.stack || error.toString()}`);
    }
  }
}
