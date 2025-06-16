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
  const systemPrompt = `You are a master of complex generative art in the style of sophisticated 3D line drawings. Study these patterns from the user's existing sketches:

SKETCH STYLE ANALYSIS:
- ORGANIC SPIRALS: Flowing helical forms, twisted ribbons, curved paths through 3D space
- GEOMETRIC CLUSTERS: Dense collections of cubes, spheres, pyramids arranged in organic patterns  
- LAYERED NETWORKS: Multiple interconnected systems at different Z-depths
- FLOWING LINES: Smooth curves that branch, merge, and flow like liquid or growth patterns
- PARTICLE SYSTEMS: Scattered points that form constellations, clouds, or cluster formations
- MATHEMATICAL FORMS: Torus knots, parametric surfaces, algorithmic patterns
- ARCHITECTURAL ELEMENTS: Building-like structures, skeletal frameworks, modular components
- NATURAL SYSTEMS: Tree-like branching, coral growth, crystalline formations

KEY PRINCIPLES:
1. ALWAYS monochromatic blue (#509EF0) - this is non-negotiable
2. CREATE 200-600+ lines for true complexity
3. USE 3D SPACE fully - vary Z coordinates from -8 to +8
4. LAYER multiple systems at different depths
5. MIX geometric primitives with organic flows
6. CREATE visual rhythm through repetition and variation
7. BALANCE dense clusters with flowing connections

CREATIVE APPROACHES BY PROMPT TYPE:

SIMPLE SHAPES → Transform into complex systems:
- "circle" → Concentric rings with radial networks, orbital systems, ripple patterns
- "square" → Cubic lattices, architectural frameworks, modular grids
- "triangle" → Crystalline growths, pyramid clusters, angular networks

ORGANIC CONCEPTS → Flowing natural systems:
- "tree" → Branching networks, root systems, fractal growth
- "wave" → Fluid dynamics, interference patterns, flowing ribbons
- "flower" → Radial symmetries, petal geometries, growth spirals

ABSTRACT CONCEPTS → Conceptual visualizations:
- "music" → Waveforms, harmonic structures, rhythmic patterns
- "data" → Network graphs, scatter formations, information flows
- "time" → Spiral progressions, circular cycles, linear sequences

TECHNICAL CONCEPTS → Sophisticated systems:
- "radar" → Concentric scanning patterns, signal networks, detection grids
- "circuit" → Connection networks, component clusters, signal paths

FOR THE PROMPT: "${userPrompt}"

Create a wildly creative interpretation that captures the essence while maintaining the sophisticated 3D line art style. Think about:
- What 3D forms could represent this concept?
- How can multiple systems layer together?
- What organic flows or geometric patterns emerge?
- How do parts connect and interact?

CONSTRAINTS:
- Color: ONLY "#509EF0" 
- Coordinates: -8 to +8 range
- Opacity: 0.2-1.0 for depth
- LineWidth: 0.5-2.5 for hierarchy
- Minimum 200 lines, target 300-600

RETURN ONLY JSON:
{
  "title": "[Creative interpretation title]",
  "description": "[Brief description of the artistic concept]",
  "complexity_level": "high",
  "lines": [
    {"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 0.8, "lineWidth": 1.5}
  ],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

Be WILDLY creative while staying true to the sophisticated 3D line art aesthetic.`;

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
            content: `Create a sophisticated 3D line art interpretation of: "${userPrompt}"

Study the style: organic spirals, geometric clusters, flowing networks, layered systems, natural growth patterns, architectural elements - all in monochromatic blue.

Be wildly creative in your interpretation while maintaining the sophisticated aesthetic. Create something unique and complex that captures the essence of "${userPrompt}" through 3D line art.

Generate 300-600 lines minimum. Use the full 3D space (-8 to +8). Layer multiple systems at different depths. Mix geometric and organic elements.

Think beyond literal representation - what visual systems, patterns, or forms could embody this concept?`
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

      // Validate structure
      if (!artData.lines || !Array.isArray(artData.lines)) {
        throw new Error('Claude did not generate valid lines array');
      }

      // Ensure monochromatic blue
      artData.lines = artData.lines.map(line => ({
        ...line,
        color: "#509EF0"
      }));

      // Set camera if missing
      if (!artData.camera) {
        artData.camera = { position: [0, 0, 12], lookAt: [0, 0, 0] };
      }

      console.log(`Claude generated ${artData.lines.length} lines`);

      // Require minimum complexity from Claude - no fallbacks
      if (artData.lines.length < 100) {
        throw new Error(`Claude generated insufficient complexity (${artData.lines.length} lines). Requesting more detailed interpretation.`);
      }

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);
    throw error; // Re-throw - no fallbacks
  }
}
