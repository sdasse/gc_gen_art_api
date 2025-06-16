
// API handler for generating art using Claude with adaptive visual approaches
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

    // Use Claude to generate adaptive visualizations
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
  const systemPrompt = `You are a master visual systems designer. Your mission is to interpret each prompt and create the MOST APPROPRIATE visual representation, whether that's technical, artistic, geometric, organic, or abstract.

CRITICAL: Analyze the prompt first and choose the right visual approach:

VISUAL APPROACHES TO CHOOSE FROM:

1. GEOMETRIC SYSTEMS (for shapes, patterns, mathematical concepts):
   - Pure geometric forms (circles, polygons, spirals)
   - Mathematical patterns (fractals, tessellations)
   - Minimal clean lines with precise proportions
   - Example: "circle" → concentric circles with radial divisions

2. ORGANIC SYSTEMS (for natural, biological, flowing concepts):
   - Curved flowing lines that branch and merge
   - Tree-like structures, cellular patterns
   - Smooth organic curves and natural growth patterns
   - Example: "tree" → branching structures with organic curves

3. TECHNICAL SYSTEMS (for engineering, scientific, data concepts):
   - Complex interconnected networks
   - Grid systems with technical annotations
   - Layered system diagrams with measurements
   - Example: "circuit" → PCB layouts with component networks

4. ABSTRACT SYSTEMS (for conceptual, artistic, emotional concepts):
   - Expressive line work with varied densities
   - Dynamic compositions with movement
   - Artistic interpretation of concepts
   - Example: "music" → flowing waves and rhythmic patterns

5. DATA SYSTEMS (for information, analysis, statistical concepts):
   - Charts, graphs, and visualization patterns
   - Information hierarchies and data flows
   - Statistical representations and analytics
   - Example: "data" → scatter plots, network graphs, flow charts

FOR PROMPT: "${userPrompt}"

Step 1: ANALYZE - What type of concept is this? Choose the most fitting approach above.
Step 2: DESIGN - Create a visualization that matches that approach authentically.
Step 3: COMPLEXITY - Add appropriate layers and detail for that visual style.

COMPOSITION VARIETY:
- Vary layout: circular, radial, grid-based, scattered, flowing, hierarchical
- Vary density: sparse minimal, medium detail, highly dense
- Vary structure: symmetric, asymmetric, organic, geometric
- Vary depth: flat 2D, layered 2.5D, full 3D depth

COMPLEXITY GUIDELINES:
- Simple concepts (circle, line): 50-150 lines with clean precise execution
- Medium concepts (tree, wave): 150-400 lines with layered detail
- Complex concepts (city, network): 400-800+ lines with multiple systems

RETURN ONLY JSON:
{
  "title": "Clear descriptive title",
  "description": "What visual approach and why",
  "visual_approach": "chosen_approach_name",
  "complexity_level": "minimal|moderate|high|extreme",
  "composition_style": "layout_description",
  "lines": [
    {"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 0.8, "lineWidth": 1.5}
  ],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

Create the visualization that BEST FITS the concept, not a generic technical diagram. Be authentic to what the prompt actually represents.`;

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
            content: `Create a visualization for: "${userPrompt}"

Analyze what this concept actually represents and choose the most appropriate visual approach. Don't default to technical diagrams unless the concept is genuinely technical.

Think about what this would look like if you were an expert in that specific field creating an authentic representation.`
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
        artData.lines = generateAdaptiveFallback(userPrompt);
      }

      // Enhance only if truly insufficient for the chosen approach
      if (artData.lines.length < 20) {
        const enhancedLines = enhanceForVisualApproach(artData.lines, userPrompt, artData.visual_approach);
        artData.lines = enhancedLines;
        artData.enhanced = true;
      }

      console.log(`Generated ${artData.lines.length} lines using ${artData.visual_approach || 'unknown'} approach with ${artData.complexity_level || 'unknown'} complexity`);

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);
    // Use adaptive fallback instead of technical default
    return {
      title: "Adaptive Visualization",
      description: "Dynamically generated based on prompt analysis",
      visual_approach: "adaptive",
      complexity_level: "moderate",
      lines: generateAdaptiveFallback(userPrompt),
      camera: { position: [0, 0, 12], lookAt: [0, 0, 0] },
      fallback: true
    };
  }
}

function generateAdaptiveFallback(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Geometric concepts
  if (lowerPrompt.includes('circle') || lowerPrompt.includes('sphere') || lowerPrompt.includes('round')) {
    return generateGeometricCircular();
  } else if (lowerPrompt.includes('square') || lowerPrompt.includes('rectangle') || lowerPrompt.includes('box')) {
    return generateGeometricSquares();
  } else if (lowerPrompt.includes('triangle') || lowerPrompt.includes('pyramid')) {
    return generateGeometricTriangular();
  } else if (lowerPrompt.includes('spiral') || lowerPrompt.includes('helix')) {
    return generateGeometricSpiral();
  }
  
  // Organic concepts
  else if (lowerPrompt.includes('tree') || lowerPrompt.includes('branch') || lowerPrompt.includes('root')) {
    return generateOrganicTree();
  } else if (lowerPrompt.includes('flower') || lowerPrompt.includes('plant') || lowerPrompt.includes('leaf')) {
    return generateOrganicFloral();
  } else if (lowerPrompt.includes('water') || lowerPrompt.includes('river') || lowerPrompt.includes('flow')) {
    return generateOrganicFlow();
  } else if (lowerPrompt.includes('cell') || lowerPrompt.includes('organic') || lowerPrompt.includes('growth')) {
    return generateOrganicCellular();
  }
  
  // Technical concepts
  else if (lowerPrompt.includes('circuit') || lowerPrompt.includes('electronic') || lowerPrompt.includes('pcb')) {
    return generateTechnicalCircuit();
  } else if (lowerPrompt.includes('network') || lowerPrompt.includes('connection') || lowerPrompt.includes('graph')) {
    return generateTechnicalNetwork();
  } else if (lowerPrompt.includes('system') || lowerPrompt.includes('process') || lowerPrompt.includes('workflow')) {
    return generateTechnicalSystem();
  }
  
  // Data concepts
  else if (lowerPrompt.includes('data') || lowerPrompt.includes('chart') || lowerPrompt.includes('graph')) {
    return generateDataVisualization();
  } else if (lowerPrompt.includes('scatter') || lowerPrompt.includes('plot') || lowerPrompt.includes('statistical')) {
    return generateDataScatter();
  }
  
  // Abstract/artistic concepts
  else if (lowerPrompt.includes('music') || lowerPrompt.includes('sound') || lowerPrompt.includes('rhythm')) {
    return generateAbstractMusical();
  } else if (lowerPrompt.includes('emotion') || lowerPrompt.includes('feeling') || lowerPrompt.includes('mood')) {
    return generateAbstractEmotional();
  } else if (lowerPrompt.includes('movement') || lowerPrompt.includes('dance') || lowerPrompt.includes('dynamic')) {
    return generateAbstractMovement();
  }
  
  // Default to geometric minimal
  else {
    return generateGeometricMinimal();
  }
}

// GEOMETRIC SYSTEM GENERATORS
function generateGeometricCircular() {
  const lines = [];
  
  // Concentric circles with varying detail
  for (let radius = 0.5; radius <= 6; radius += 0.5) {
    const points = [];
    const segments = Math.floor(radius * 8) + 16; // More segments for larger circles
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      ]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.8 - radius * 0.08,
      lineWidth: 1.5
    });
  }
  
  // Radial lines
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    lines.push({
      points: [
        [0, 0, 0],
        [Math.cos(angle) * 6, Math.sin(angle) * 6, 0]
      ],
      color: "#509EF0",
      opacity: 0.4,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateGeometricSquares() {
  const lines = [];
  
  // Concentric squares
  for (let size = 0.5; size <= 6; size += 0.5) {
    const square = [
      [-size, -size, 0],
      [size, -size, 0],
      [size, size, 0],
      [-size, size, 0],
      [-size, -size, 0]
    ];
    
    lines.push({
      points: square,
      color: "#509EF0",
      opacity: 0.8 - size * 0.08,
      lineWidth: 1.5
    });
  }
  
  // Diagonal crosses
  for (let size = 1; size <= 6; size += 2) {
    lines.push({
      points: [[-size, -size, 0], [size, size, 0]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
    
    lines.push({
      points: [[-size, size, 0], [size, -size, 0]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateGeometricTriangular() {
  const lines = [];
  
  // Concentric triangles
  for (let size = 1; size <= 6; size += 0.8) {
    const height = size * Math.sqrt(3) / 2;
    const triangle = [
      [0, height, 0],
      [-size, -height/2, 0],
      [size, -height/2, 0],
      [0, height, 0]
    ];
    
    lines.push({
      points: triangle,
      color: "#509EF0",
      opacity: 0.8 - size * 0.1,
      lineWidth: 1.5
    });
  }
  
  // Internal structure
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    lines.push({
      points: [
        [0, 0, 0],
        [Math.cos(angle) * 5, Math.sin(angle) * 5, 0]
      ],
      color: "#509EF0",
      opacity: 0.4,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateGeometricSpiral() {
  const lines = [];
  
  // Spiral curves
  for (let spiral = 0; spiral < 3; spiral++) {
    const points = [];
    for (let t = 0; t <= Math.PI * 6; t += 0.1) {
      const radius = t * 0.3 + spiral * 0.5;
      points.push([
        Math.cos(t + spiral * Math.PI * 2/3) * radius,
        Math.sin(t + spiral * Math.PI * 2/3) * radius,
        spiral * 0.5
      ]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.7 - spiral * 0.1,
      lineWidth: 1.5
    });
  }
  
  return lines;
}

function generateGeometricMinimal() {
  const lines = [];
  
  // Simple grid
  for (let i = -3; i <= 3; i++) {
    lines.push({
      points: [[i, -3, 0], [i, 3, 0]],
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.0
    });
    
    lines.push({
      points: [[-3, i, 0], [3, i, 0]],
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.0
    });
  }
  
  // Central focus
  lines.push({
    points: [
      [-2, -2, 0], [2, -2, 0], [2, 2, 0], [-2, 2, 0], [-2, -2, 0]
    ],
    color: "#509EF0",
    opacity: 0.9,
    lineWidth: 2.0
  });
  
  return lines;
}

// ORGANIC SYSTEM GENERATORS
function generateOrganicTree() {
  const lines = [];
  
  // Recursive tree branching
  function createBranch(startX, startY, startZ, endX, endY, endZ, depth, angle) {
    if (depth <= 0) return;
    
    lines.push({
      points: [[startX, startY, startZ], [endX, endY, endZ]],
      color: "#509EF0",
      opacity: 0.8 - depth * 0.1,
      lineWidth: 1.5 - depth * 0.1
    });
    
    if (depth > 1) {
      const branchLength = Math.sqrt((endX-startX)**2 + (endY-startY)**2) * 0.7;
      const leftAngle = angle - 0.6;
      const rightAngle = angle + 0.6;
      
      // Left branch
      const leftEndX = endX + Math.cos(leftAngle) * branchLength;
      const leftEndY = endY + Math.sin(leftAngle) * branchLength;
      createBranch(endX, endY, endZ, leftEndX, leftEndY, endZ + 0.3, depth - 1, leftAngle);
      
      // Right branch
      const rightEndX = endX + Math.cos(rightAngle) * branchLength;
      const rightEndY = endY + Math.sin(rightAngle) * branchLength;
      createBranch(endX, endY, endZ, rightEndX, rightEndY, endZ + 0.3, depth - 1, rightAngle);
    }
  }
  
  // Main trunk
  createBranch(0, -4, 0, 0, 0, 0, 6, Math.PI/2);
  
  return lines;
}

function generateOrganicFlow() {
  const lines = [];
  
  // Flowing curves
  for (let stream = 0; stream < 5; stream++) {
    const points = [];
    const offset = (stream - 2) * 1.5;
    
    for (let x = -6; x <= 6; x += 0.2) {
      const y = offset + Math.sin(x * 0.5 + stream) * 2 + Math.sin(x * 0.2) * 0.5;
      const z = Math.cos(x * 0.3 + stream) * 0.5;
      points.push([x, y, z]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.7 - stream * 0.05,
      lineWidth: 1.5
    });
  }
  
  return lines;
}

function generateOrganicFloral() {
  const lines = [];
  
  // Petal patterns
  for (let petal = 0; petal < 8; petal++) {
    const points = [];
    const baseAngle = (petal / 8) * Math.PI * 2;
    
    for (let t = 0; t <= 1; t += 0.05) {
      const angle = baseAngle + Math.sin(t * Math.PI) * 0.3;
      const radius = Math.sin(t * Math.PI) * 3;
      points.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        t * 0.5
      ]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.7,
      lineWidth: 1.3
    });
  }
  
  // Center
  const center = [];
  for (let a = 0; a <= Math.PI * 2; a += 0.2) {
    center.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0]);
  }
  
  lines.push({
    points: center,
    color: "#509EF0",
    opacity: 0.9,
    lineWidth: 1.8
  });
  
  return lines;
}

function generateOrganicCellular() {
  const lines = [];
  
  // Cellular structures
  const cells = [];
  for (let i = 0; i < 15; i++) {
    cells.push({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      radius: 0.5 + Math.random() * 1.5
    });
  }
  
  cells.forEach(cell => {
    // Cell membrane
    const membrane = [];
    const irregularity = 0.3;
    
    for (let a = 0; a <= Math.PI * 2; a += 0.2) {
      const noise = (Math.random() - 0.5) * irregularity;
      const radius = cell.radius + noise;
      membrane.push([
        cell.x + Math.cos(a) * radius,
        cell.y + Math.sin(a) * radius,
        0
      ]);
    }
    
    lines.push({
      points: membrane,
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.2
    });
  });
  
  // Connections between nearby cells
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const dist = Math.sqrt((cells[i].x - cells[j].x)**2 + (cells[i].y - cells[j].y)**2);
      if (dist < 4) {
        lines.push({
          points: [[cells[i].x, cells[i].y, 0], [cells[j].x, cells[j].y, 0]],
          color: "#509EF0",
          opacity: 0.3,
          lineWidth: 1.0
        });
      }
    }
  }
  
  return lines;
}

// TECHNICAL SYSTEM GENERATORS
function generateTechnicalCircuit() {
  const lines = [];
  
  // PCB traces and components
  const components = [];
  for (let i = 0; i < 8; i++) {
    components.push({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
      width: 0.5 + Math.random() * 1.0,
      height: 0.3 + Math.random() * 0.5
    });
  }
  
  // Draw components
  components.forEach(comp => {
    const body = [
      [comp.x - comp.width/2, comp.y - comp.height/2, 0],
      [comp.x + comp.width/2, comp.y - comp.height/2, 0],
      [comp.x + comp.width/2, comp.y + comp.height/2, 0],
      [comp.x - comp.width/2, comp.y + comp.height/2, 0],
      [comp.x - comp.width/2, comp.y - comp.height/2, 0]
    ];
    
    lines.push({
      points: body,
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
  });
  
  // Trace routing
  for (let i = 0; i < components.length - 1; i++) {
    const comp1 = components[i];
    const comp2 = components[i + 1];
    
    // L-shaped routing
    const midX = comp1.x + (comp2.x - comp1.x) * 0.7;
    
    lines.push({
      points: [
        [comp1.x, comp1.y, 0],
        [midX, comp1.y, 0],
        [midX, comp2.y, 0],
        [comp2.x, comp2.y, 0]
      ],
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.2
    });
  }
  
  return lines;
}

function generateTechnicalNetwork() {
  const lines = [];
  
  // Network nodes
  const nodes = [];
  for (let i = 0; i < 12; i++) {
    nodes.push({
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 2,
      connections: Math.floor(Math.random() * 4) + 2
    });
  }
  
  // Draw nodes
  nodes.forEach(node => {
    const size = 0.2;
    lines.push({
      points: [
        [node.x - size, node.y - size, node.z],
        [node.x + size, node.y - size, node.z],
        [node.x + size, node.y + size, node.z],
        [node.x - size, node.y + size, node.z],
        [node.x - size, node.y - size, node.z]
      ],
      color: "#509EF0",
      opacity: 0.9,
      lineWidth: 1.5
    });
  });
  
  // Connect nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.sqrt((nodes[i].x - nodes[j].x)**2 + (nodes[i].y - nodes[j].y)**2);
      if (dist < 5 && Math.random() > 0.6) {
        lines.push({
          points: [
            [nodes[i].x, nodes[i].y, nodes[i].z],
            [nodes[j].x, nodes[j].y, nodes[j].z]
          ],
          color: "#509EF0",
          opacity: 0.5,
          lineWidth: 1.0
        });
      }
    }
  }
  
  return lines;
}

function generateTechnicalSystem() {
  const lines = [];
  
  // System components and flow
  const processes = [
    { x: -4, y: 2, name: "Input" },
    { x: -1, y: 2, name: "Process" },
    { x: 2, y: 2, name: "Filter" },
    { x: 4, y: 0, name: "Output" },
    { x: 2, y: -2, name: "Feedback" },
    { x: -1, y: -2, name: "Control" }
  ];
  
  // Draw process boxes
  processes.forEach(proc => {
    const box = [
      [proc.x - 0.8, proc.y - 0.5, 0],
      [proc.x + 0.8, proc.y - 0.5, 0],
      [proc.x + 0.8, proc.y + 0.5, 0],
      [proc.x - 0.8, proc.y + 0.5, 0],
      [proc.x - 0.8, proc.y - 0.5, 0]
    ];
    
    lines.push({
      points: box,
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
  });
  
  // Flow connections
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]
  ];
  
  connections.forEach(([from, to]) => {
    const proc1 = processes[from];
    const proc2 = processes[to];
    
    lines.push({
      points: [[proc1.x, proc1.y, 0], [proc2.x, proc2.y, 0]],
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.2
    });
  });
  
  return lines;
}

// DATA SYSTEM GENERATORS
function generateDataVisualization() {
  const lines = [];
  
  // Chart axes
  lines.push({
    points: [[-5, -4, 0], [5, -4, 0]],
    color: "#509EF0",
    opacity: 0.9,
    lineWidth: 1.8
  });
  
  lines.push({
    points: [[-5, -4, 0], [-5, 4, 0]],
    color: "#509EF0",
    opacity: 0.9,
    lineWidth: 1.8
  });
  
  // Data bars
  const dataPoints = [1.5, 3.2, 2.1, 4.0, 2.8, 3.5, 1.9, 3.8];
  
  dataPoints.forEach((value, index) => {
    const x = -4 + index * 1.2;
    lines.push({
      points: [[x, -4, 0], [x, -4 + value, 0]],
      color: "#509EF0",
      opacity: 0.7,
      lineWidth: 2.0
    });
  });
  
  // Grid lines
  for (let i = 1; i <= 4; i++) {
    lines.push({
      points: [[-5, -4 + i, 0], [5, -4 + i, 0]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateDataScatter() {
  const lines = [];
  
  // Generate scatter points
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 8;
    const y = (Math.random() - 0.5) * 8;
    const size = 0.1;
    
    // Point marker
    lines.push({
      points: [
        [x - size, y - size, 0],
        [x + size, y - size, 0],
        [x + size, y + size, 0],
        [x - size, y + size, 0],
        [x - size, y - size, 0]
      ],
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.0
    });
  }
  
  // Trend line
  const trendPoints = [];
  for (let x = -4; x <= 4; x += 0.5) {
    const y = x * 0.5 + Math.sin(x) * 0.8;
    trendPoints.push([x, y, 0]);
  }
  
  lines.push({
    points: trendPoints,
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 1.5
  });
  
  return lines;
}

// ABSTRACT SYSTEM GENERATORS
function generateAbstractMusical() {
  const lines = [];
  
  // Musical waves
  for (let wave = 0; wave < 5; wave++) {
    const points = [];
    const frequency = (wave + 1) * 0.5;
    const amplitude = 2 - wave * 0.3;
    
    for (let x = -6; x <= 6; x += 0.1) {
      const y = Math.sin(x * frequency) * amplitude + wave * 1.5 - 3;
      points.push([x, y, wave * 0.2]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.7 - wave * 0.05,
      lineWidth: 1.5
    });
  }
  
  // Rhythm markers
  for (let beat = -6; beat <= 6; beat += 1.5) {
    lines.push({
      points: [[beat, -5, 0], [beat, 5, 0]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateAbstractEmotional() {
  const lines = [];
  
  // Emotional expression through varied line dynamics
  for (let expression = 0; expression < 8; expression++) {
    const points = [];
    const intensity = Math.random();
    
    for (let t = 0; t <= 1; t += 0.05) {
      const x = (t - 0.5) * 8;
      const y = (Math.random() - 0.5) * intensity * 6;
      const z = Math.sin(t * Math.PI * 2 + expression) * 2;
      points.push([x, y, z]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.4 + intensity * 0.4,
      lineWidth: 0.8 + intensity * 1.2
    });
  }
  
  return lines;
}

function generateAbstractMovement() {
  const lines = [];
  
  // Dynamic movement trails
  for (let trail = 0; trail < 6; trail++) {
    const points = [];
    const phase = trail * Math.PI / 3;
    
    for (let t = 0; t <= Math.PI * 2; t += 0.1) {
      const radius = 2 + Math.sin(t * 2 + phase) * 1.5;
      const x = Math.cos(t + phase) * radius;
      const y = Math.sin(t + phase) * radius;
      const z = Math.sin(t * 3 + phase) * 0.8;
      points.push([x, y, z]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.6 - trail * 0.05,
      lineWidth: 1.5 - trail * 0.1
    });
  }
  
  return lines;
}

function enhanceForVisualApproach(existingLines, prompt, approach) {
  const enhanced = [...existingLines];
  
  // Only enhance if truly needed based on approach
  if (approach === 'geometric' && enhanced.length < 30) {
    enhanced.push(...generateMinimalGeometricEnhancement());
  } else if (approach === 'organic' && enhanced.length < 40) {
    enhanced.push(...generateMinimalOrganicEnhancement());
  } else if (approach === 'technical' && enhanced.length < 80) {
    enhanced.push(...generateMinimalTechnicalEnhancement());
  }
  
  return enhanced;
}

function generateMinimalGeometricEnhancement() {
  const lines = [];
  
  // Simple geometric grid
  for (let i = -2; i <= 2; i++) {
    lines.push({
      points: [[i, -2, 0], [i, 2, 0]],
      color: "#509EF0",
      opacity: 0.2,
      lineWidth: 1.0
    });
    
    lines.push({
      points: [[-2, i, 0], [2, i, 0]],
      color: "#509EF0",
      opacity: 0.2,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateMinimalOrganicEnhancement() {
  const lines = [];
  
  // Organic flowing lines
  for (let flow = 0; flow < 3; flow++) {
    const points = [];
    for (let x = -3; x <= 3; x += 0.3) {
      const y = Math.sin(x + flow) * 0.5 + flow * 0.8 - 1;
      points.push([x, y, 0]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.4,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateMinimalTechnicalEnhancement() {
  const lines = [];
  
  // Technical measurement grid
  for (let x = -4; x <= 4; x += 1) {
    lines.push({
      points: [[x, -4, 0], [x, 4, 0]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  for (let y = -4; y <= 4; y += 1) {
    lines.push({
      points: [[-4, y, 0], [4, y, 0]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  return lines;
}
