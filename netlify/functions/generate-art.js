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
  const systemPrompt = `You are a technical diagram generator. Create complex line-art visualizations with EXACTLY these specifications:

MANDATORY REQUIREMENTS:
- MINIMUM 100 separate line elements
- ALL lines: lineWidth 1.5, color "#509EF0", opacity 1.0
- Coordinate range: -8 to +8 
- Complex curves: 20+ points each for smooth precision

CREATE COMPLEX TECHNICAL DIAGRAMS LIKE:
- Networks with 60 traces and connection points
- Astronomical charts with coordinate grids and star positions  
- Molecular structures with intricate bond networks
- Radar displays with overlapping sweep patterns and measurement scales

REQUIRED ELEMENTS (INCLUDE ALL):
1. Grid system
2. Primary structure/framework
3. Secondary detail patterns
4. Measurement marks and annotations
5. Randomization and variation

MATHEMATICAL PRECISION:
- Use parametric equations for curves: x=r*cos(t), y=r*sin(t)
- Create logarithmic spirals, sine waves, geometric progressions
- Apply golden ratio (1.618) for proportional spacing
- Generate fractal-like recursive patterns

QUALITY CHECK:
Count your lines before responding. If you have fewer than 40 separate line elements, ADD MORE. Create layered, interconnected systems that demonstrate true technical complexity.

OUTPUT FORMAT:
Generate exactly this JSON structure with no additional text:

{
  "title": "Technical description of the diagram",
  "description": "Detailed explanation of the visual concept and construction",
  "lines": [
    {
      "points": [[x1, y1, z1], [x2, y2, z2], ...],
      "color": "#509EF0",
      "opacity": 1,
      "lineWidth": 1.5
    }
  ],
  "camera": {
    "position": [x, y, z],
    "lookAt": [x, y, z]
  },
  "animation": {
    "rotate": true/false,
    "speed": 0.005-0.02,
    "axis": "x"/"y"/"z"/"xyz"
  }
}

DESIGN PROCESS:
1. Analyze the user's concept and determine the most appropriate technical domain
2. Consider the underlying structure and technical relationships
3. Plan the composition with primary, secondary, and tertiary elements following visual hierarchy
4. Create detailed coordinate calculations for precise geometry using mathematical relationships
5. Apply visual hierarchy through systematic line weight and opacity assignments
6. Add technical details like grids, annotations, or measurement marks that serve the concept
7. Set appropriate camera position to enhance the technical aesthetic

Remember: Create sophisticated, technically precise diagrams that could belong in an engineering textbook, scientific paper, or architectural blueprint. Avoid simple geometric shapes - instead create complex, meaningful technical visualizations that demonstrate systematic precision over random complexity.`;

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
