// API handler for generating art using Claude
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

    // Use Claude to generate sophisticated technical diagrams
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
  const systemPrompt = `You are creating sophisticated technical line drawings. Look at these examples of the complexity I want:

  EXAMPLE 1: Radar system with 50+ concentric circles, 200+ radial lines, dense grid overlays, measurement scales, and scattered connection points.

  EXAMPLE 2: Circuit board with 80+ rectangular components, 150+ connection traces, node clusters, and coordinate grids.

  EXAMPLE 3: Scatter plot with 2000+ data points forming exponential curves, coordinate axes with tick marks, and annotation lines.

  Your task: Create DENSE, LAYERED technical visualizations with similar complexity levels.

  SIMPLE RULES:
  1. Make it DENSE - use hundreds of lines, not dozens
  2. Layer different systems on top of each other
  3. Use coordinates between -8 and +8
  4. All lines: color "#509EF0", opacity 1, lineWidth 1.5

  PATTERN TYPES TO COMBINE:
  - Dense grids (every 0.1 units)
  - Concentric circles (every 0.2 radius)
  - Radial lines (every 5 degrees)
  - Scattered points/nodes
  - Connection networks
  - Measurement scales

  FOR "${userPrompt}":
  Think about what technical systems this relates to, then CREATE MULTIPLE OVERLAPPING LAYERS of those systems. Make it as dense and complex as a real technical schematic.

  JSON FORMAT:
  {
    "title": "Brief title",
    "description": "What you created", 
    "lines": [
      {"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 1, "lineWidth": 1.5}
    ],
    "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
  }

  CREATE COMPLEXITY THROUGH QUANTITY AND LAYERING.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Create a technical diagram for: ${userPrompt}

Generate a sophisticated line-art visualization that captures the essence of this concept through technical drawing principles. Consider the underlying structure, relationships, and visual metaphors that would best represent this idea as a technical diagram.`
          }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResult = await response.json();
    const generatedText = claudeResult.content[0].text;

    // Extract JSON from Claude's response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const artData = JSON.parse(jsonMatch[0]);

      // Ensure required fields are present
      if (!artData.lines || !Array.isArray(artData.lines)) {
        throw new Error('Invalid response structure from Claude');
      }

      // Validate and sanitize the data
      artData.lines = artData.lines.filter(line =>
        line.points && Array.isArray(line.points) && line.points.length >= 2
      );

      // Set defaults if missing
      if (!artData.camera) {
        artData.camera = { position: [0, 0, 12], lookAt: [0, 0, 0] };
      }
      if (!artData.animation) {
        artData.animation = { rotate: false, speed: 0.008, axis: "z" };
      }

      // Add the raw response for debugging
      artData.rawResponse = generatedText;

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);

    // Re-throw the error with more context
    if (error.message.includes('Claude API error:')) {
      throw new Error(`Claude API failed with status ${error.message.split(':')[1]}`);
    } else if (error.message.includes('Could not parse JSON')) {
      throw new Error(`Claude returned invalid JSON. Raw response: ${generatedText || 'No response'}`);
    } else {
      throw new Error(`Claude API request failed: ${error.message}`);
    }
  }
}
