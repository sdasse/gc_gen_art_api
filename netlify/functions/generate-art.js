
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
  const systemPrompt = `Create sophisticated 3D line art in blue (#509EF0). Generate 200-500 lines using coordinates -8 to +8. Be wildly creative - use any visual approach that captures the concept: organic forms, geometric structures, networks, patterns, technical diagrams, or abstract compositions. Layer multiple systems for complexity.

Return ONLY this JSON:
{
  "title": "Creative title",
  "description": "Brief description", 
  "complexity_level": "high",
  "lines": [{"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 1.0, "lineWidth": 1.5}],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}`;

  try {
    console.log('Making Claude API request...');

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const claudeResult = await response.json();
    console.log('Claude result received, content length:', claudeResult.content?.[0]?.text?.length);

    const generatedText = claudeResult.content[0].text;

    // Extract JSON from Claude's response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const artData = JSON.parse(jsonMatch[0]);

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

      // Only require reasonable complexity - let Claude be creative
      if (artData.lines.length < 50) {
        throw new Error(`Insufficient complexity generated (${artData.lines.length} lines). Please try again.`);
      }

      return artData;
    } else {
      console.error('Could not extract JSON from response:', generatedText);
      throw new Error(`Could not parse JSON from Claude response. Response: ${generatedText.substring(0, 500)}...`);
    }

  } catch (error) {
    console.error('Claude API error details:', error);

    // Provide detailed error information
    if (error.message.includes('fetch')) {
      throw new Error(`Network error connecting to Claude API: ${error.message}`);
    } else if (error.message.includes('JSON')) {
      throw new Error(`Claude returned malformed response: ${error.message}`);
    } else {
      throw new Error(`Claude API error: ${error.message}`);
    }
  }
}
