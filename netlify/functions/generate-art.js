// API handler for generating art using Claude with varied composition approach
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

    // Use Claude to generate truly varied visualizations
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
  const systemPrompt = `You are a generative technical artist creating varied line-art visualizations. Your goal is to create compositions that are as visually diverse as possible while maintaining technical aesthetics.

CRITICAL: Do NOT use repetitive templates. Each visualization should have a completely different composition approach based on the prompt content.

COMPOSITION VARIETY EXAMPLES:
- Radial/circular patterns for cosmic, atomic, or cyclical themes
- Scattered point clouds for data or particle themes  
- Flowing organic curves for biological or fluid themes
- Geometric grids ONLY when specifically relevant (circuit boards, architecture)
- Vertical/horizontal linear patterns for sound waves, frequencies
- Triangular/angular compositions for crystalline, architectural themes
- Sparse minimal layouts for conceptual or abstract themes
- Dense technical schematics for mechanical or engineering themes

PROMPT ANALYSIS: "${userPrompt}"
Based on this prompt, determine:
1. What VISUAL METAPHOR best represents this concept?
2. What COMPOSITION STRUCTURE fits the theme? (radial, linear, scattered, organic, geometric, etc.)
3. What DENSITY LEVEL matches the concept? (minimal, moderate, dense, extremely dense)
4. Should there be background elements or pure focus on main forms?

RULES:
- NO default grid backgrounds unless specifically relevant
- Match composition to content (molecular = cluster, sound = waves, network = connections)
- Vary line arrangements: some curved, some straight, some chaotic, some ordered
- Use coordinates -8 to +8
- All lines: color "#509EF0", opacity 0.3-1.0, lineWidth 1.5
- Create 50-500+ lines depending on concept needs

RETURN FORMAT:
{
  "title": "Descriptive title",
  "description": "What visual approach you chose and why",
  "composition_type": "radial|linear|scattered|organic|geometric|minimal|dense",
  "lines": [
    {"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 0.7, "lineWidth": 1.5}
  ],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

Focus on creating something that visually MATCHES the prompt rather than forcing it into a generic template.`;

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
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `Create a unique line-art visualization for: "${userPrompt}"

Analyze what this prompt represents and create a composition that visually matches its essence. Avoid generic grid templates - make something that authentically represents the concept.`
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

      // Add the raw response for debugging
      artData.rawResponse = generatedText;

      // Validate that we have lines
      if (!artData.lines || !Array.isArray(artData.lines)) {
        artData.lines = generateFallbackPattern(userPrompt);
      }

      console.log(`Generated ${artData.lines.length} lines with composition: ${artData.composition_type || 'unknown'}`);

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error(`Claude API request failed: ${error.message}`);
  }
}

function generateFallbackPattern(prompt) {
  // Create varied fallback patterns based on prompt keywords
  const lines = [];
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('wave') || lowerPrompt.includes('sound') || lowerPrompt.includes('frequency')) {
    // Wave pattern
    for (let i = 0; i < 20; i++) {
      const points = [];
      const amplitude = 1 + Math.random() * 3;
      const frequency = 0.5 + Math.random() * 2;
      const yOffset = -6 + (i / 20) * 12;

      for (let x = -8; x <= 8; x += 0.2) {
        const y = yOffset + amplitude * Math.sin(frequency * x);
        points.push([x, y, 0]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.4 + Math.random() * 0.4,
        lineWidth: 1.5
      });
    }
  } else if (lowerPrompt.includes('radial') || lowerPrompt.includes('circle') || lowerPrompt.includes('atomic')) {
    // Radial pattern
    for (let r = 1; r <= 6; r++) {
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        points.push([
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          0
        ]);
      }
      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.6 - r * 0.08,
        lineWidth: 1.5
      });
    }

    // Add radial spokes
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      lines.push({
        points: [
          [0, 0, 0],
          [Math.cos(angle) * 6, Math.sin(angle) * 6, 0]
        ],
        color: "#509EF0",
        opacity: 0.4,
        lineWidth: 1.5
      });
    }
  } else {
    // Default minimal pattern - just a few key lines
    lines.push({
      points: [[-6, 0, 0], [6, 0, 0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
    lines.push({
      points: [[0, -6, 0], [0, 6, 0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });

    // Add some scattered elements
    for (let i = 0; i < 15; i++) {
      const x = -4 + Math.random() * 8;
      const y = -4 + Math.random() * 8;
      const size = 0.3 + Math.random() * 0.7;

      lines.push({
        points: [
          [x - size, y - size, 0],
          [x + size, y - size, 0],
          [x + size, y + size, 0],
          [x - size, y + size, 0],
          [x - size, y - size, 0]
        ],
        color: "#509EF0",
        opacity: 0.5 + Math.random() * 0.3,
        lineWidth: 1.5
      });
    }
  }

  return lines;
}
