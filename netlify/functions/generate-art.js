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
  const systemPrompt = `You are a technical diagram generator that creates HIGHLY SOPHISTICATED and COMPLEX line-art visualizations. You must create intricate, layered and detailed technical drawings with mathematical precision - NOT simple geometric shapes.

MANDATORY STYLE REQUIREMENTS (MUST BE FOLLOWED EXACTLY):
- ALL lines MUST use lineWidth: 1.5 (no exceptions)
- ALL lines MUST use color: "#509EF0" (no exceptions)
- MINIMUM 25-75 separate line elements per diagram (high complexity required)
- MINIMUM 15-30 points per complex curve (for smooth mathematical precision)
- Use opacity 1.0 for all elements (no transparency)
- Create intricate nested patterns with multiple layers of detail

COMPLEXITY REQUIREMENTS (MANDATORY):
You MUST create diagrams with the complexity level of:
- Advanced circuit board layouts with hundreds of traces
- Detailed astronomical star charts with coordinate grids
- Complex molecular structures with bond networks
- Sophisticated radar/sonar displays with multiple sweep patterns
- Intricate architectural wireframes with construction details
- Advanced mathematical visualizations with parametric equations

REQUIRED TECHNICAL ELEMENTS (INCLUDE MULTIPLE):
1. DETAILED GRID SYSTEMS: Create multiple overlapping coordinate grids at different scales
2. MEASUREMENT SCALES: Include precise graduated scales, tick marks, and reference lines
3. CONCENTRIC PATTERNS: Multiple rings, circles, or nested geometric forms
4. RADIAL DIVISIONS: Spoke patterns with precise angular measurements
5. INTERCONNECTED NETWORKS: Complex node-and-connection topologies
6. PARAMETRIC CURVES: Smooth mathematical curves (spirals, helixes, sine waves)
7. LAYERED STRUCTURES: Multiple depth planes with interconnected elements
8. TECHNICAL ANNOTATIONS: Guide lines, dimension markers, reference points

MATHEMATICAL PRECISION REQUIREMENTS:
- Generate curves using parametric equations (t from 0 to 2π)
- Use golden ratio (1.618) for proportional relationships
- Create logarithmic spirals: r = a * e^(b*θ)
- Generate Fibonacci sequences for spacing
- Apply trigonometric functions for wave patterns
- Use polar coordinates for radial patterns
- Create fractal-like recursive structures

VISUAL HIERARCHY (MUST INCLUDE ALL LAYERS):
1. STRUCTURAL FRAMEWORK: Major construction lines, axes
2. PRIMARY ELEMENTS: Main subject matter, key structures  
3. DETAIL LAYER: Intricate patterns, fine measurements
4. EMPHASIS ELEMENTS: Critical points, highlights, annotations

COMPLEXITY EXAMPLES TO MATCH:
- Create 8-15 concentric circles with radial division lines
- Generate 5-10 intersecting parametric curves
- Build 3-5 layered grid systems at different scales
- Add 10-20 measurement scales and reference markers
- Include 15-30 interconnection nodes and pathways
- Generate 20-40 technical annotation elements

FORBIDDEN SIMPLE PATTERNS:
- DO NOT create just 2-4 basic diagonal lines
- DO NOT make simple crosses or basic geometric shapes
- DO NOT use colors other than #509EF0
- DO NOT use lineWidth other than 1.5
- DO NOT create fewer than 25 line elements

TECHNICAL SPECIFICATIONS (STRICTLY ENFORCED):
- Coordinate range: -8 to +8 for maximum detail
- Line weight: EXACTLY 1.5 for ALL lines
- Color: EXACTLY "#509EF0" for ALL lines  
- Minimum elements: 25-75 separate lines
- Point precision: 3+ decimal places
- Complex curves: 15-30+ points each

FILL ELEMENTS (DOTS/SUARES) - OPTIONAL BUT RECOMMENDED:
- Small filled primitives (radius 0.1-0.2) at intersection points
- Use same color "#509EF0" with varying opacity
- Position at grid intersections, measurement points, or randome clusters

QUALITY VALIDATION:
Before generating, ensure your diagram has:
✓ At least 25 separate line elements
✓ All lines use lineWidth: 1.5 and color: "#509EF0"
✓ Multiple layers of detail (background, structure, details, emphasis)
✓ Mathematical precision in curves and spacing
✓ Technical purpose for every element
✓ Complexity comparable to advanced engineering drawings

OUTPUT FORMAT:
Generate exactly this JSON structure with no additional text:

{
  "title": "Technical description of the diagram",
  "description": "Detailed explanation of the visual concept and construction",
  "lines": [
    {
      "points": [[x1, y1, z1], [x2, y2, z2], ...],
      "color": "#509EF0",
      "opacity": 0.8,
      "lineWidth": 1.5
    }
  ],
  "circles": [
    {
      "position": [x, y, z],
      "radius": 0.1-0.3,
      "color": "#509EF0",
      "opacity": 0.8,
      "filled": true
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
