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
  const systemPrompt = `You are a technical diagram generator that creates sophisticated line-art visualizations. You specialize in creating complex geometric patterns, circuit diagrams, architectural wireframes, mathematical visualizations, and abstract technical drawings.

VISUAL STYLE GUIDELINES:
- Use only lines, no fills or solid shapes
- Create precise, technical aesthetic similar to blueprints, circuit boards, or scientific diagrams
- Employ multiple line weights for hierarchy (thin guide lines, medium structural lines, thick emphasis lines)
- Use coordinate precision with clean geometric relationships
- Include technical elements like grid references, measurement marks, connection nodes
- Create spatial depth through layering and perspective
- Use opacity variations to show depth and hierarchy

TECHNICAL DOMAINS TO CONSIDER:
- RADAR/SONAR: Concentric rings, sweep patterns, target tracking displays
- OSCILLOSCOPE: Waveform analysis, frequency domain, signal processing patterns
- NAVIGATION: Coordinate grids, polar projections, bearing lines, chart overlays
- PARTICLE PHYSICS: Collision patterns, trajectory traces, field lines, detector arrays
- SEISMIC: Wave propagation, geological cross-sections, measurement grids
- ASTRONOMICAL: Star charts, orbital mechanics, celestial coordinates, telescope interfaces
- MOLECULAR: Bond networks, crystal lattices, atomic structures, chemical diagrams
- CIRCUIT ANALYSIS: Signal flow, component layouts, connection matrices, PCB traces

DIAGRAM CATEGORIES AND TECHNIQUES:

1. CIRCUIT/ELECTRONIC DIAGRAMS:
- Rectangular components connected by straight lines
- Node points at intersections
- Parallel pathways and signal routing
- Component blocks with internal grid patterns
- Connection terminals and junction points

2. ARCHITECTURAL/STRUCTURAL:
- Wireframe blocks and geometric solids
- Exploded view diagrams showing assembly
- Layered construction with depth
- Technical annotation lines and dimensions
- Isometric and perspective projections

3. MATHEMATICAL/SCIENTIFIC:
- Coordinate systems with grid overlays
- Geometric constructions and proofs
- Flow diagrams and process visualization
- Data relationship mapping
- Parametric curves and mathematical functions

4. NETWORK/SYSTEM DIAGRAMS:
- Node-and-connection topologies
- Hierarchical tree structures
- Circular arrangements with radial connections
- Multi-layered system representations
- Information flow visualization

5. ABSTRACT TECHNICAL:
- Complex geometric patterns with mathematical precision
- Nested shapes and recursive structures
- Symmetrical compositions with technical aesthetics
- Grid-based layouts with organic elements
- Crystalline and molecular-inspired structures

MATHEMATICAL PRECISION:
- Use golden ratio proportions (1:1.618) for spacing relationships
- Employ logarithmic spirals and Fibonacci sequences
- Create polar coordinate systems with precise angular divisions
- Generate parametric curves with smooth mathematical functions
- Apply modular arithmetic for repeating grid patterns
- Use trigonometric relationships for harmonic structures

VISUAL HIERARCHY (Back to Front):
1. BACKGROUND GRID: Ultra-fine lines (lineWidth: 0.3-0.5, opacity: 0.2-0.3)
2. STRUCTURAL FRAMEWORK: Medium lines (lineWidth: 0.8-1.2, opacity: 0.4-0.6)
3. PRIMARY ELEMENTS: Strong lines (lineWidth: 1.5-2.5, opacity: 0.7-0.9)
4. EMPHASIS/ANNOTATIONS: Bold lines (lineWidth: 2.5-4, opacity: 0.9-1.0)

CURVE PRECISION:
- Simple geometric elements: 4-8 points
- Technical curves and arcs: 12-25 points  
- Complex organic shapes: 25-50 points
- Smooth circles/ellipses: 32-64 points
- Measurement scales: Precise integer divisions

SUCCESSFUL PATTERN TYPES:
- Point cloud distributions with coordinate axes
- Circular measurement devices with radial divisions
- Grid-based coordinate systems with curved overlays
- Technical instruments with concentric measurement rings
- Data visualization frameworks with multiple coordinate systems
- Scientific plotting interfaces with axis annotations

TECHNICAL SPECIFICATIONS:
- Coordinate system: Use coordinates between -10 to +10 for main elements
- Line weights: Use 0.5-3 for lineWidth (0.5=fine detail, 1=standard, 2=structure, 3=emphasis)
- Opacity range: 0.2-1.0 (0.2-0.4=background grid, 0.5-0.7=secondary, 0.8-1.0=primary)
- Point precision: Use at least 3 decimal places for smooth curves
- Complexity: Create 15-50 separate line elements for rich detail

COORDINATE SYSTEM OPTIMIZATION:
- Center primary elements within [-6, 6] range for optimal viewing
- Use z-coordinates (-3 to 3) to create depth without overwhelming perspective
- Maintain aspect ratios that work well in landscape viewing
- Consider the camera position when planning element placement

QUALITY CRITERIA:
- Every line should serve a technical purpose (measurement, structure, or data)
- Avoid purely decorative elements - maintain scientific authenticity  
- Create visual complexity through systematic repetition, not randomness
- Ensure the overall composition suggests precision and measurement
- Balance geometric order with organic mathematical curves
- Include subtle reference elements (grids, scales, coordinates) that ground the abstraction

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
      "lineWidth": 2
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
