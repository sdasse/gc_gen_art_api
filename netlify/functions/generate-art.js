
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
    
    if (claudeApiKey) {
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
    } else {
      // Fallback to pattern matching system
      console.log('Claude API key not found, using fallback system');
      const artData = generateArtFromPrompt(prompt.trim());
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(artData)
      };
    }

  } catch (error) {
    console.error('Generation error:', error);
    
    // Always return a fallback response
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(generateFallbackPattern(prompt || 'Unknown'))
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

TECHNICAL SPECIFICATIONS:
- Coordinate system: Use coordinates between -10 to +10 for main elements
- Line weights: Use 0.5-3 for lineWidth (0.5=fine detail, 1=standard, 2=structure, 3=emphasis)
- Opacity range: 0.2-1.0 (0.2-0.4=background grid, 0.5-0.7=secondary, 0.8-1.0=primary)
- Color palette: Use technical blues (#509EF0, #70B0F0, #3080D0) with occasional accent colors
- Point precision: Use at least 3 decimal places for smooth curves
- Complexity: Create 15-50 separate line elements for rich detail

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
1. Analyze the user's concept and determine the most appropriate diagram category
2. Consider the underlying structure and technical relationships
3. Plan the composition with primary, secondary, and tertiary elements
4. Create detailed coordinate calculations for precise geometry
5. Apply visual hierarchy through line weight and opacity
6. Add technical details like grids, annotations, or measurement marks
7. Set appropriate camera position and animation to enhance the technical aesthetic

Remember: Create sophisticated, technically precise diagrams that could belong in an engineering textbook, scientific paper, or architectural blueprint. Avoid simple geometric shapes - instead create complex, meaningful technical visualizations.`;

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
      
      return artData;
    } else {
      throw new Error('Could not parse JSON from Claude response');
    }
    
  } catch (error) {
    console.error('Claude API error:', error);
    // Fallback to pattern matching
    return generateArtFromPrompt(userPrompt);
  }
}

// Keep existing pattern matching system as fallback
function generateArtFromPrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Circuit patterns for technical terms
  if (lowerPrompt.includes('circuit') || lowerPrompt.includes('electronic') || lowerPrompt.includes('system') || lowerPrompt.includes('network')) {
    return generateCircuitPattern(prompt);
  }
  
  // Architectural patterns
  if (lowerPrompt.includes('building') || lowerPrompt.includes('structure') || lowerPrompt.includes('architecture') || lowerPrompt.includes('blueprint')) {
    return generateArchitecturalPattern(prompt);
  }
  
  // Circle patterns
  if (lowerPrompt.includes('circle') || lowerPrompt.includes('ring') || lowerPrompt.includes('round')) {
    return generateCirclePattern(prompt);
  }
  
  // Square/rectangle patterns
  if (lowerPrompt.includes('square') || lowerPrompt.includes('rectangle') || lowerPrompt.includes('box') || lowerPrompt.includes('cube')) {
    return generateSquarePattern(prompt);
  }
  
  // Wave patterns
  if (lowerPrompt.includes('wave') || lowerPrompt.includes('sine') || lowerPrompt.includes('oscilloscope') || lowerPrompt.includes('frequency')) {
    return generateWavePattern(prompt);
  }
  
  // Grid patterns
  if (lowerPrompt.includes('grid') || lowerPrompt.includes('mesh') || lowerPrompt.includes('lattice')) {
    return generateGridPattern(prompt);
  }
  
  // Spiral patterns
  if (lowerPrompt.includes('spiral') || lowerPrompt.includes('helix') || lowerPrompt.includes('twist') || lowerPrompt.includes('coil')) {
    return generateSpiralPattern(prompt);
  }
  
  // Geometric shapes
  if (lowerPrompt.includes('triangle') || lowerPrompt.includes('pyramid')) {
    return generateTrianglePattern(prompt);
  }
  
  // Torus/donut patterns
  if (lowerPrompt.includes('torus') || lowerPrompt.includes('donut') || lowerPrompt.includes('doughnut')) {
    return generateTorusPattern(prompt);
  }
  
  // Star patterns
  if (lowerPrompt.includes('star') || lowerPrompt.includes('asterisk') || lowerPrompt.includes('radial')) {
    return generateStarPattern(prompt);
  }
  
  // Organic/flowing patterns
  if (lowerPrompt.includes('organic') || lowerPrompt.includes('flow') || lowerPrompt.includes('fluid') || lowerPrompt.includes('curve')) {
    return generateOrganicPattern(prompt);
  }
  
  // Random/abstract patterns based on length and characters
  if (lowerPrompt.includes('random') || lowerPrompt.includes('abstract') || lowerPrompt.includes('chaos')) {
    return generateRandomPattern(prompt);
  }
  
  // Generate dynamic pattern based on prompt characteristics
  return generateDynamicPattern(prompt);
}

function generateCircuitPattern(prompt) {
  const lines = [];
  
  // Main circuit board outline
  lines.push({
    points: [[-8, -6, 0], [8, -6, 0], [8, 6, 0], [-8, 6, 0], [-8, -6, 0]],
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Circuit components (rectangular blocks)
  const components = [
    { x: -4, y: 2, w: 2, h: 1 },
    { x: 0, y: 3, w: 1.5, h: 0.8 },
    { x: 4, y: 1, w: 2.2, h: 1.2 },
    { x: -2, y: -2, w: 3, h: 1.5 },
    { x: 3, y: -3, w: 1.8, h: 1 }
  ];
  
  components.forEach(comp => {
    lines.push({
      points: [
        [comp.x - comp.w/2, comp.y - comp.h/2, 0],
        [comp.x + comp.w/2, comp.y - comp.h/2, 0],
        [comp.x + comp.w/2, comp.y + comp.h/2, 0],
        [comp.x - comp.w/2, comp.y + comp.h/2, 0],
        [comp.x - comp.w/2, comp.y - comp.h/2, 0]
      ],
      color: "#70B0F0",
      opacity: 0.9,
      lineWidth: 1.5
    });
    
    // Internal grid pattern for each component
    for (let i = 1; i < 4; i++) {
      const x = comp.x - comp.w/2 + (i/4) * comp.w;
      lines.push({
        points: [[x, comp.y - comp.h/2, 0], [x, comp.y + comp.h/2, 0]],
        color: "#3080D0",
        opacity: 0.6,
        lineWidth: 0.5
      });
    }
  });
  
  // Connection traces
  const traces = [
    [[-4, 2, 0], [-2, 0, 0], [0, 3, 0]],
    [[0, 3, 0], [2, 1, 0], [4, 1, 0]],
    [[-2, -2, 0], [1, -2, 0], [3, -3, 0]],
    [[-6, 0, 0], [-4, 2, 0], [-2, -2, 0]]
  ];
  
  traces.forEach(trace => {
    lines.push({
      points: trace,
      color: "#509EF0",
      opacity: 0.7,
      lineWidth: 1
    });
  });
  
  // Connection nodes
  const nodes = [[-4, 2], [0, 3], [4, 1], [-2, -2], [3, -3], [-2, 0], [2, 1], [1, -2]];
  nodes.forEach(([x, y]) => {
    const nodePoints = [];
    for (let i = 0; i <= 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      nodePoints.push([x + Math.cos(angle) * 0.1, y + Math.sin(angle) * 0.1, 0]);
    }
    lines.push({
      points: nodePoints,
      color: "#3080D0",
      opacity: 1,
      lineWidth: 2
    });
  });
  
  return {
    title: `Circuit Diagram: ${prompt}`,
    description: "Electronic circuit board with components and traces",
    lines: lines,
    camera: { position: [0, 0, 15], lookAt: [0, 0, 0] },
    animation: { rotate: false, speed: 0.005, axis: "z" }
  };
}

function generateArchitecturalPattern(prompt) {
  const lines = [];
  
  // Building blocks in isometric view
  const blocks = [
    { x: -2, y: 0, z: 0, w: 3, h: 2, d: 2 },
    { x: 2, y: 1, z: 1, w: 2.5, h: 3, d: 1.5 },
    { x: 0, y: -2, z: -1, w: 4, h: 1, d: 3 },
    { x: -4, y: 2, z: 0.5, w: 1.5, h: 2.5, d: 1 }
  ];
  
  blocks.forEach(block => {
    // Create wireframe box
    const vertices = [
      [block.x - block.w/2, block.y - block.h/2, block.z - block.d/2],
      [block.x + block.w/2, block.y - block.h/2, block.z - block.d/2],
      [block.x + block.w/2, block.y + block.h/2, block.z - block.d/2],
      [block.x - block.w/2, block.y + block.h/2, block.z - block.d/2],
      [block.x - block.w/2, block.y - block.h/2, block.z + block.d/2],
      [block.x + block.w/2, block.y - block.h/2, block.z + block.d/2],
      [block.x + block.w/2, block.y + block.h/2, block.z + block.d/2],
      [block.x - block.w/2, block.y + block.h/2, block.z + block.d/2]
    ];
    
    // Bottom face
    lines.push({
      points: [vertices[0], vertices[1], vertices[2], vertices[3], vertices[0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
    
    // Top face
    lines.push({
      points: [vertices[4], vertices[5], vertices[6], vertices[7], vertices[4]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
    
    // Vertical edges
    for (let i = 0; i < 4; i++) {
      lines.push({
        points: [vertices[i], vertices[i + 4]],
        color: "#70B0F0",
        opacity: 0.7,
        lineWidth: 1
      });
    }
  });
  
  // Construction grid
  for (let x = -8; x <= 8; x += 2) {
    lines.push({
      points: [[x, -6, -3], [x, 6, -3]],
      color: "#3080D0",
      opacity: 0.3,
      lineWidth: 0.5
    });
  }
  for (let y = -6; y <= 6; y += 2) {
    lines.push({
      points: [[-8, y, -3], [8, y, -3]],
      color: "#3080D0",
      opacity: 0.3,
      lineWidth: 0.5
    });
  }
  
  return {
    title: `Architectural Diagram: ${prompt}`,
    description: "Isometric architectural wireframe with construction grid",
    lines: lines,
    camera: { position: [8, 6, 10], lookAt: [0, 0, 0] },
    animation: { rotate: true, speed: 0.004, axis: "y" }
  };
}

// Keep all existing pattern functions (generateCirclePattern, generateSquarePattern, etc.)
function generateCirclePattern(prompt) {
  const lines = [];
  const radius = 4;
  const segments = 32;
  
  // Main circle
  const circlePoints = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    circlePoints.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    ]);
  }
  lines.push({
    points: circlePoints,
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Inner circles
  for (let r = 1; r <= 3; r++) {
    const innerPoints = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      innerPoints.push([
        Math.cos(angle) * r,
        Math.sin(angle) * r,
        0
      ]);
    }
    lines.push({
      points: innerPoints,
      color: "#70B0F0",
      opacity: 0.6,
      lineWidth: 1
    });
  }
  
  // Cross lines
  lines.push({
    points: [[-radius, 0, 0], [radius, 0, 0]],
    color: "#3080D0",
    opacity: 0.7,
    lineWidth: 1
  });
  lines.push({
    points: [[0, -radius, 0], [0, radius, 0]],
    color: "#3080D0",
    opacity: 0.7,
    lineWidth: 1
  });
  
  return {
    title: `Circle Pattern: ${prompt}`,
    description: "Concentric circles with cross-hair guides",
    lines: lines,
    camera: {
      position: [0, 0, 12],
      lookAt: [0, 0, 0]
    },
    animation: {
      rotate: false,
      speed: 0.005,
      axis: "z"
    }
  };
}

function generateSquarePattern(prompt) {
  const lines = [];
  
  // Outer square
  lines.push({
    points: [[-4, -4, 0], [4, -4, 0], [4, 4, 0], [-4, 4, 0], [-4, -4, 0]],
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Inner squares
  for (let size = 1; size <= 3; size++) {
    lines.push({
      points: [[-size, -size, 0], [size, -size, 0], [size, size, 0], [-size, size, 0], [-size, -size, 0]],
      color: "#70B0F0",
      opacity: 0.6,
      lineWidth: 1
    });
  }
  
  // Diagonal lines
  lines.push({
    points: [[-4, -4, 0], [4, 4, 0]],
    color: "#3080D0",
    opacity: 0.5,
    lineWidth: 1
  });
  lines.push({
    points: [[-4, 4, 0], [4, -4, 0]],
    color: "#3080D0",
    opacity: 0.5,
    lineWidth: 1
  });
  
  return {
    title: `Square Pattern: ${prompt}`,
    description: "Nested squares with diagonal guides",
    lines: lines,
    camera: { position: [0, 0, 10], lookAt: [0, 0, 0] },
    animation: { rotate: false, speed: 0.008, axis: "z" }
  };
}

function generateWavePattern(prompt) {
  const lines = [];
  const amplitude = 3;
  const frequency = 2;
  const points = 100;
  
  // Main wave
  const wavePoints = [];
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 12 - 6;
    const y = Math.sin(x * frequency) * amplitude;
    wavePoints.push([x, y, 0]);
  }
  lines.push({
    points: wavePoints,
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Harmonic waves
  for (let harmonic = 2; harmonic <= 3; harmonic++) {
    const harmonicPoints = [];
    for (let i = 0; i < points; i++) {
      const x = (i / (points - 1)) * 12 - 6;
      const y = Math.sin(x * frequency * harmonic) * (amplitude / harmonic);
      harmonicPoints.push([x, y, 0]);
    }
    lines.push({
      points: harmonicPoints,
      color: "#70B0F0",
      opacity: 0.5,
      lineWidth: 1
    });
  }
  
  // Grid lines
  for (let i = -2; i <= 2; i++) {
    lines.push({
      points: [[-6, i * 1.5, 0], [6, i * 1.5, 0]],
      color: "#3080D0",
      opacity: 0.3,
      lineWidth: 1
    });
  }
  
  return {
    title: `Wave Pattern: ${prompt}`,
    description: "Sine wave with harmonics and grid",
    lines: lines,
    camera: { position: [0, 0, 15], lookAt: [0, 0, 0] },
    animation: { rotate: false, speed: 0.01, axis: "z" }
  };
}

function generateGridPattern(prompt) {
  const lines = [];
  const size = 8;
  const divisions = 8;
  
  // Horizontal lines
  for (let i = 0; i <= divisions; i++) {
    const y = (i / divisions - 0.5) * size;
    lines.push({
      points: [[-size/2, y, 0], [size/2, y, 0]],
      color: "#509EF0",
      opacity: 0.7,
      lineWidth: 1
    });
  }
  
  // Vertical lines
  for (let i = 0; i <= divisions; i++) {
    const x = (i / divisions - 0.5) * size;
    lines.push({
      points: [[x, -size/2, 0], [x, size/2, 0]],
      color: "#509EF0",
      opacity: 0.7,
      lineWidth: 1
    });
  }
  
  // Diagonal connections
  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      if ((i + j) % 3 === 0) {
        const x1 = (i / divisions - 0.5) * size;
        const y1 = (j / divisions - 0.5) * size;
        const x2 = ((i + 1) / divisions - 0.5) * size;
        const y2 = ((j + 1) / divisions - 0.5) * size;
        lines.push({
          points: [[x1, y1, 0], [x2, y2, 0]],
          color: "#70B0F0",
          opacity: 0.4,
          lineWidth: 1
        });
      }
    }
  }
  
  return {
    title: `Grid Pattern: ${prompt}`,
    description: "Technical grid with diagonal connections",
    lines: lines,
    camera: { position: [0, 0, 12], lookAt: [0, 0, 0] },
    animation: { rotate: false, speed: 0.005, axis: "z" }
  };
}

function generateSpiralPattern(prompt) {
  const lines = [];
  const turns = 3;
  const points = 100;
  const maxRadius = 5;
  
  // Main spiral
  const spiralPoints = [];
  for (let i = 0; i < points; i++) {
    const t = (i / (points - 1)) * turns * Math.PI * 2;
    const radius = (i / (points - 1)) * maxRadius;
    spiralPoints.push([
      Math.cos(t) * radius,
      Math.sin(t) * radius,
      0
    ]);
  }
  lines.push({
    points: spiralPoints,
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Counter spiral
  const counterSpiralPoints = [];
  for (let i = 0; i < points; i++) {
    const t = -(i / (points - 1)) * turns * Math.PI * 2;
    const radius = (i / (points - 1)) * maxRadius;
    counterSpiralPoints.push([
      Math.cos(t) * radius,
      Math.sin(t) * radius,
      0
    ]);
  }
  lines.push({
    points: counterSpiralPoints,
    color: "#70B0F0",
    opacity: 0.6,
    lineWidth: 1
  });
  
  // Radial lines
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    lines.push({
      points: [
        [0, 0, 0],
        [Math.cos(angle) * maxRadius, Math.sin(angle) * maxRadius, 0]
      ],
      color: "#3080D0",
      opacity: 0.4,
      lineWidth: 1
    });
  }
  
  return {
    title: `Spiral Pattern: ${prompt}`,
    description: "Double spiral with radial guides",
    lines: lines,
    camera: { position: [0, 0, 12], lookAt: [0, 0, 0] },
    animation: { rotate: true, speed: 0.01, axis: "z" }
  };
}

function generateTrianglePattern(prompt) {
  const lines = [];
  const size = 4;
  
  // Main triangle
  lines.push({
    points: [
      [0, size, 0],
      [-size * 0.866, -size * 0.5, 0],
      [size * 0.866, -size * 0.5, 0],
      [0, size, 0]
    ],
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Inner triangles
  for (let scale = 0.3; scale < 1; scale += 0.3) {
    lines.push({
      points: [
        [0, size * scale, 0],
        [-size * 0.866 * scale, -size * 0.5 * scale, 0],
        [size * 0.866 * scale, -size * 0.5 * scale, 0],
        [0, size * scale, 0]
      ],
      color: "#70B0F0",
      opacity: 0.6,
      lineWidth: 1
    });
  }
  
  return {
    title: `Triangle Pattern: ${prompt}`,
    description: "Nested triangular geometry",
    lines: lines,
    camera: { position: [0, 0, 10], lookAt: [0, 0, 0] },
    animation: { rotate: false, speed: 0.006, axis: "z" }
  };
}

function generateTorusPattern(prompt) {
  const lines = [];
  const majorRadius = 4;
  const minorRadius = 1.5;
  const segments = 24;
  
  // Major circles
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const y = Math.sin(angle) * minorRadius;
    const radius = majorRadius + Math.cos(angle) * minorRadius;
    
    const circlePoints = [];
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      circlePoints.push([
        Math.cos(theta) * radius,
        y,
        Math.sin(theta) * radius
      ]);
    }
    lines.push({
      points: circlePoints,
      color: i % 2 === 0 ? "#509EF0" : "#70B0F0",
      opacity: 0.7,
      lineWidth: 1
    });
  }
  
  // Minor circles
  for (let i = 0; i < 12; i++) {
    const mainAngle = (i / 12) * Math.PI * 2;
    const centerX = Math.cos(mainAngle) * majorRadius;
    const centerZ = Math.sin(mainAngle) * majorRadius;
    
    const circlePoints = [];
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      circlePoints.push([
        centerX + Math.cos(mainAngle) * Math.cos(angle) * minorRadius,
        Math.sin(angle) * minorRadius,
        centerZ + Math.sin(mainAngle) * Math.cos(angle) * minorRadius
      ]);
    }
    lines.push({
      points: circlePoints,
      color: "#3080D0",
      opacity: 0.5,
      lineWidth: 1
    });
  }
  
  return {
    title: `Torus Pattern: ${prompt}`,
    description: "Three-dimensional torus wireframe",
    lines: lines,
    camera: { position: [8, 8, 8], lookAt: [0, 0, 0] },
    animation: { rotate: true, speed: 0.01, axis: "y" }
  };
}

function generateStarPattern(prompt) {
  const lines = [];
  const outerRadius = 5;
  const innerRadius = 2;
  const points = 8;
  
  // Star outline
  const starPoints = [];
  for (let i = 0; i <= points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    starPoints.push([
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    ]);
  }
  starPoints.push(starPoints[0]); // Close the star
  
  lines.push({
    points: starPoints,
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  
  // Radial lines from center
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    lines.push({
      points: [
        [0, 0, 0],
        [Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0]
      ],
      color: "#70B0F0",
      opacity: 0.6,
      lineWidth: 1
    });
  }
  
  return {
    title: `Star Pattern: ${prompt}`,
    description: "Radial star geometry",
    lines: lines,
    camera: { position: [0, 0, 12], lookAt: [0, 0, 0] },
    animation: { rotate: true, speed: 0.015, axis: "z" }
  };
}

function generateOrganicPattern(prompt) {
  const lines = [];
  const segments = 50;
  
  // Flowing curves
  for (let curve = 0; curve < 4; curve++) {
    const points = [];
    const phase = curve * Math.PI * 0.5;
    
    for (let i = 0; i < segments; i++) {
      const t = (i / (segments - 1)) * Math.PI * 4;
      const amplitude = 3 + Math.sin(t * 0.3 + phase) * 1;
      points.push([
        Math.cos(t + phase) * amplitude + Math.sin(t * 2 + phase) * 0.5,
        Math.sin(t + phase) * amplitude + Math.cos(t * 1.5 + phase) * 0.7,
        Math.sin(t * 0.5 + phase) * 1.5
      ]);
    }
    
    lines.push({
      points: points,
      color: `hsl(${200 + curve * 20}, 70%, 60%)`,
      opacity: 0.7,
      lineWidth: 1 + curve * 0.2
    });
  }
  
  return {
    title: `Organic Pattern: ${prompt}`,
    description: "Flowing organic curves",
    lines: lines,
    camera: { position: [5, 5, 8], lookAt: [0, 0, 0] },
    animation: { rotate: true, speed: 0.008, axis: "y" }
  };
}

function generateRandomPattern(prompt) {
  const lines = [];
  const seed = prompt.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  // Pseudo-random based on prompt
  function seededRandom(i) {
    return ((seed + i * 1234567) % 9999) / 9999;
  }
  
  // Generate random connected lines
  for (let i = 0; i < 15; i++) {
    const points = [];
    const numPoints = 3 + Math.floor(seededRandom(i) * 5);
    
    for (let j = 0; j < numPoints; j++) {
      points.push([
        (seededRandom(i * 10 + j) - 0.5) * 8,
        (seededRandom(i * 10 + j + 100) - 0.5) * 8,
        (seededRandom(i * 10 + j + 200) - 0.5) * 4
      ]);
    }
    
    lines.push({
      points: points,
      color: `hsl(${seededRandom(i + 300) * 360}, 70%, 60%)`,
      opacity: 0.4 + seededRandom(i + 400) * 0.4,
      lineWidth: 1 + seededRandom(i + 500) * 2
    });
  }
  
  return {
    title: `Random Pattern: ${prompt}`,
    description: "Pseudo-random geometric abstraction",
    lines: lines,
    camera: { position: [6, 6, 10], lookAt: [0, 0, 0] },
    animation: { rotate: true, speed: 0.005, axis: "xyz" }
  };
}

function generateDynamicPattern(prompt) {
  const lines = [];
  const hash = prompt.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const complexity = Math.min(prompt.length, 10);
  
  // Create pattern based on prompt characteristics
  const baseRadius = 2 + (hash % 3);
  const numLayers = 2 + (complexity % 4);
  
  for (let layer = 0; layer < numLayers; layer++) {
    const radius = baseRadius + layer * 1.5;
    const segments = 8 + layer * 4;
    const points = [];
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noise = Math.sin(angle * (hash % 7 + 3)) * 0.3;
      points.push([
        Math.cos(angle) * (radius + noise),
        Math.sin(angle) * (radius + noise),
        layer * 0.5 - numLayers * 0.25
      ]);
    }
    
    lines.push({
      points: points,
      color: `hsl(${(hash + layer * 50) % 360}, 70%, ${50 + layer * 10}%)`,
      opacity: 0.8 - layer * 0.1,
      lineWidth: 2 - layer * 0.2
    });
  }
  
  // Add connecting lines
  if (numLayers > 1) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      lines.push({
        points: [
          [Math.cos(angle) * baseRadius, Math.sin(angle) * baseRadius, -numLayers * 0.25],
          [Math.cos(angle) * (baseRadius + (numLayers - 1) * 1.5), Math.sin(angle) * (baseRadius + (numLayers - 1) * 1.5), (numLayers - 1) * 0.5 - numLayers * 0.25]
        ],
        color: "#3080D0",
        opacity: 0.4,
        lineWidth: 1
      });
    }
  }
  
  return {
    title: `Dynamic Pattern: ${prompt}`,
    description: "Pattern generated from prompt characteristics",
    lines: lines,
    camera: { position: [0, 0, 8 + numLayers], lookAt: [0, 0, 0] },
    animation: { rotate: complexity > 5, speed: 0.005 + complexity * 0.001, axis: "z" }
  };
}

function generateFallbackPattern(prompt) {
  return {
    title: "Fallback Visualization",
    description: "Simple geometric pattern",
    lines: [
      {
        points: [[-3, -3, 0], [3, 3, 0]],
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1
      },
      {
        points: [[-3, 3, 0], [3, -3, 0]],
        color: "#509EF0", 
        opacity: 0.7,
        lineWidth: 1
      }
    ],
    camera: {
      position: [0, 0, 8],
      lookAt: [0, 0, 0]
    },
    animation: {
      rotate: false,
      speed: 0.008,
      axis: "y"
    }
  };
}
