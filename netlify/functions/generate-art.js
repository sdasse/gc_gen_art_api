
// Import domain configuration
const domainConfig = require('./domain-config.js');

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

    // Use Claude to generate complex system visualizations
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
  const systemPrompt = `You are a master technical systems visualizer. Your goal is to create COMPLEX SYSTEM DIAGRAMS that show the true depth and interconnection of real technical systems.

ANALYZE THE PROMPT: "${userPrompt}"

Think as a SYSTEMS ENGINEER. What are the MULTIPLE INTERCONNECTED LAYERS of this concept?

EXAMPLES OF COMPLEX SYSTEM THINKING:

For "molecular bonds" - Don't just show a few atoms connected. Show:
- Crystal lattice structures with 200+ nodes
- Electron orbital clouds as wireframe surfaces  
- Vibrational mode patterns overlaid
- Energy level diagrams as vertical scaffolding
- Phonon propagation paths as wave patterns

For "neural networks" - Don't show simple connected dots. Show:
- Multiple layer hierarchies with 100s of connections
- Activation gradients as density patterns
- Backpropagation paths as flow lines
- Weight matrices as grid overlays
- Attention mechanisms as radial patterns

For "circuit design" - Don't show basic components. Show:
- PCB trace routing with 300+ connections
- Signal layer stackups in 3D
- EMI shielding patterns
- Power distribution networks
- Thermal flow patterns overlaid

YOUR TASK: Create a MULTI-LAYERED SYSTEM VISUALIZATION with:

1. PRIMARY LAYER: The main structural framework (200-800 lines)
2. SECONDARY LAYER: Supporting subsystems (100-400 lines) 
3. DETAIL LAYER: Fine technical details (50-200 lines)
4. MEASUREMENT LAYER: Grids, scales, annotations (50-100 lines)

COMPLEXITY REQUIREMENTS:
- Minimum 400 total lines for any technical subject
- Use authentic mathematical relationships for the domain
- Layer different systems at different Z-depths
- Include measurement and annotation elements
- Show INTERCONNECTIONS between subsystems

RETURN JSON FORMAT:
{
  "title": "Complex System: [domain-specific title]",
  "description": "Multi-layered technical visualization showing [primary], [secondary], and [detail] systems",
  "domain": "identified_domain",
  "complexity_level": "extreme",
  "lines": [
    {"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 0.9, "lineWidth": 1.5}
  ],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

CRITICAL: Think like a technical expert in the field. Show what the REAL system looks like in professional technical documentation, not simplified diagrams.`;

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
            content: `Create a complex multi-layered system visualization for: "${userPrompt}"

Think about this as a SYSTEMS ENGINEER would. What are ALL the interconnected layers, subsystems, and technical details that make this concept work? Show the authentic technical complexity, not a simplified version.

Build multiple overlapping systems that work together to represent the full depth of this concept.`
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
        artData.lines = generateComplexSystemFallback(userPrompt);
      }

      // If the line count is too low, enhance with domain-specific complexity
      if (artData.lines.length < 100) {
        const enhancedLines = enhanceWithSystemComplexity(artData.lines, userPrompt);
        artData.lines = enhancedLines;
        artData.enhanced = true;
      }

      console.log(`Generated ${artData.lines.length} lines for complex system: ${artData.domain || 'unknown'} with complexity: ${artData.complexity_level || 'unknown'}`);

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);
    // Use complex fallback instead of simple one
    return {
      title: "Complex System Visualization",
      description: "Multi-layered technical diagram with interconnected subsystems",
      domain: "technical_systems", 
      complexity_level: "extreme",
      lines: generateComplexSystemFallback(userPrompt),
      camera: { position: [0, 0, 12], lookAt: [0, 0, 0] },
      fallback: true
    };
  }
}

function generateComplexSystemFallback(prompt) {
  const lines = [];
  const lowerPrompt = prompt.toLowerCase();

  // Determine system type and generate appropriate complexity
  if (lowerPrompt.includes('molecular') || lowerPrompt.includes('atom') || lowerPrompt.includes('chemical')) {
    return generateComplexMolecularSystem();
  } else if (lowerPrompt.includes('neural') || lowerPrompt.includes('network') || lowerPrompt.includes('ai')) {
    return generateComplexNeuralSystem();
  } else if (lowerPrompt.includes('circuit') || lowerPrompt.includes('electronic') || lowerPrompt.includes('pcb')) {
    return generateComplexCircuitSystem();
  } else if (lowerPrompt.includes('flow') || lowerPrompt.includes('process') || lowerPrompt.includes('system')) {
    return generateComplexFlowSystem();
  } else if (lowerPrompt.includes('wave') || lowerPrompt.includes('signal') || lowerPrompt.includes('frequency')) {
    return generateComplexSignalSystem();
  } else {
    return generateComplexGenericSystem();
  }
}

function enhanceWithSystemComplexity(existingLines, prompt) {
  const enhanced = [...existingLines];
  const lowerPrompt = prompt.toLowerCase();
  
  // Add measurement grids
  enhanced.push(...generateMeasurementGrid());
  
  // Add system interconnections
  enhanced.push(...generateSystemInterconnections());
  
  // Add domain-specific enhancements
  if (lowerPrompt.includes('molecular') || lowerPrompt.includes('chemical')) {
    enhanced.push(...generateMolecularEnhancements());
  } else if (lowerPrompt.includes('circuit') || lowerPrompt.includes('electronic')) {
    enhanced.push(...generateCircuitEnhancements());
  } else if (lowerPrompt.includes('network') || lowerPrompt.includes('neural')) {
    enhanced.push(...generateNetworkEnhancements());
  }
  
  return enhanced;
}

function generateComplexMolecularSystem() {
  const lines = [];
  
  // Crystal lattice structure - Primary layer
  const latticeSpacing = 1.5;
  for (let x = -6; x <= 6; x += latticeSpacing) {
    for (let y = -6; y <= 6; y += latticeSpacing) {
      for (let z = -3; z <= 3; z += latticeSpacing) {
        // Create tetrahedral bonds from each lattice point
        const center = [x, y, z];
        const bondLength = latticeSpacing * 0.8;
        
        // Tetrahedral directions
        const directions = [
          [1, 1, 1],
          [1, -1, -1],
          [-1, 1, -1],
          [-1, -1, 1]
        ];
        
        directions.forEach(dir => {
          const target = [
            center[0] + dir[0] * bondLength * 0.577,
            center[1] + dir[1] * bondLength * 0.577,
            center[2] + dir[2] * bondLength * 0.577
          ];
          
          if (Math.abs(target[0]) <= 6 && Math.abs(target[1]) <= 6 && Math.abs(target[2]) <= 3) {
            lines.push({
              points: [center, target],
              color: "#509EF0",
              opacity: 0.8,
              lineWidth: 1.5
            });
          }
        });
      }
    }
  }
  
  // Electron orbital patterns - Secondary layer
  for (let n = 1; n <= 4; n++) {
    const radius = n * 1.2;
    const orbitalPoints = [];
    
    for (let theta = 0; theta <= Math.PI * 2; theta += 0.1) {
      for (let phi = 0; phi <= Math.PI; phi += 0.2) {
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        orbitalPoints.push([x, y, z]);
      }
    }
    
    // Connect orbital points in shell patterns
    for (let i = 0; i < orbitalPoints.length - 1; i++) {
      if (i % 10 === 0) { // Sparse connections for orbital clouds
        lines.push({
          points: [orbitalPoints[i], orbitalPoints[i + 1]],
          color: "#509EF0",
          opacity: 0.3 - n * 0.05,
          lineWidth: 1.0
        });
      }
    }
  }
  
  // Vibrational mode patterns - Detail layer
  for (let mode = 1; mode <= 3; mode++) {
    const frequency = mode * 0.5;
    const amplitude = 0.3 / mode;
    
    for (let t = 0; t < Math.PI * 4; t += 0.2) {
      const points = [];
      for (let x = -6; x <= 6; x += 0.5) {
        const y = amplitude * Math.sin(frequency * x + t);
        points.push([x, y + mode * 1.5, mode * 0.5]);
      }
      
      if (points.length > 1) {
        lines.push({
          points: points,
          color: "#509EF0",
          opacity: 0.5,
          lineWidth: 1.2
        });
      }
    }
  }
  
  return lines;
}

function generateComplexNeuralSystem() {
  const lines = [];
  
  // Multi-layer neural architecture
  const layers = [
    { neurons: 8, y: -4, z: -2 },
    { neurons: 16, y: -2, z: -1 },
    { neurons: 32, y: 0, z: 0 },
    { neurons: 16, y: 2, z: 1 },
    { neurons: 8, y: 4, z: 2 }
  ];
  
  const allNeurons = [];
  
  // Create neurons and collect positions
  layers.forEach((layer, layerIndex) => {
    const spacing = 12 / (layer.neurons + 1);
    for (let i = 0; i < layer.neurons; i++) {
      const x = -6 + spacing * (i + 1);
      const neuron = [x, layer.y, layer.z];
      allNeurons.push({ pos: neuron, layer: layerIndex });
      
      // Create neuron representation
      const size = 0.2;
      const neuronLines = [
        [[neuron[0] - size, neuron[1] - size, neuron[2]], [neuron[0] + size, neuron[1] - size, neuron[2]]],
        [[neuron[0] + size, neuron[1] - size, neuron[2]], [neuron[0] + size, neuron[1] + size, neuron[2]]],
        [[neuron[0] + size, neuron[1] + size, neuron[2]], [neuron[0] - size, neuron[1] + size, neuron[2]]],
        [[neuron[0] - size, neuron[1] + size, neuron[2]], [neuron[0] - size, neuron[1] - size, neuron[2]]]
      ];
      
      neuronLines.forEach(line => {
        lines.push({
          points: line,
          color: "#509EF0",
          opacity: 0.9,
          lineWidth: 1.5
        });
      });
    }
  });
  
  // Dense inter-layer connections
  for (let i = 0; i < allNeurons.length; i++) {
    for (let j = i + 1; j < allNeurons.length; j++) {
      const neuron1 = allNeurons[i];
      const neuron2 = allNeurons[j];
      
      // Connect neurons in adjacent layers or within same layer
      if (Math.abs(neuron1.layer - neuron2.layer) <= 1) {
        const weight = Math.random();
        if (weight > 0.3) { // Only strong connections
          // Curved connection
          const mid = [
            (neuron1.pos[0] + neuron2.pos[0]) / 2 + (Math.random() - 0.5) * 2,
            (neuron1.pos[1] + neuron2.pos[2]) / 2,
            (neuron1.pos[2] + neuron2.pos[2]) / 2
          ];
          
          lines.push({
            points: [neuron1.pos, mid, neuron2.pos],
            color: "#509EF0",
            opacity: weight * 0.6,
            lineWidth: 1.0
          });
        }
      }
    }
  }
  
  // Activation flow patterns
  for (let wave = 0; wave < 5; wave++) {
    const points = [];
    for (let x = -6; x <= 6; x += 0.3) {
      const y = Math.sin(x * 0.8 + wave * Math.PI / 2) * 2 + wave * 0.5 - 2;
      const z = Math.cos(x * 0.8 + wave * Math.PI / 2) * 0.5 + wave * 0.3;
      points.push([x, y, z]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.4,
      lineWidth: 1.2
    });
  }
  
  return lines;
}

function generateComplexCircuitSystem() {
  const lines = [];
  
  // PCB trace routing - Primary layer
  const components = [];
  for (let i = 0; i < 20; i++) {
    components.push({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 12,
      width: 0.5 + Math.random() * 1.5,
      height: 0.3 + Math.random() * 1.0,
      pins: 4 + Math.floor(Math.random() * 12)
    });
  }
  
  // Draw components
  components.forEach(comp => {
    // Component body
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
      opacity: 0.9,
      lineWidth: 1.8
    });
    
    // Component pins
    for (let pin = 0; pin < comp.pins; pin++) {
      const pinX = comp.x - comp.width/2 + (pin / (comp.pins - 1)) * comp.width;
      const pinY1 = comp.y - comp.height/2 - 0.1;
      const pinY2 = comp.y + comp.height/2 + 0.1;
      
      lines.push({
        points: [[pinX, pinY1, 0], [pinX, comp.y - comp.height/2, 0]],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
      
      lines.push({
        points: [[pinX, pinY2, 0], [pinX, comp.y + comp.height/2, 0]],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    }
  });
  
  // Trace routing between components
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (Math.random() > 0.7) { // Only some connections
        const comp1 = components[i];
        const comp2 = components[j];
        
        // Multi-segment trace routing
        const segments = [
          [comp1.x, comp1.y, 0],
          [comp1.x, comp1.y + (comp2.y - comp1.y) * 0.3, 0],
          [comp1.x + (comp2.x - comp1.x) * 0.7, comp1.y + (comp2.y - comp1.y) * 0.3, 0],
          [comp1.x + (comp2.x - comp1.x) * 0.7, comp2.y, 0],
          [comp2.x, comp2.y, 0]
        ];
        
        lines.push({
          points: segments,
          color: "#509EF0",
          opacity: 0.6,
          lineWidth: 1.2
        });
      }
    }
  }
  
  // Signal layer stackup visualization
  for (let layer = -2; layer <= 2; layer++) {
    for (let x = -6; x <= 6; x += 2) {
      for (let y = -6; y <= 6; y += 2) {
        // Via connections between layers
        if (Math.random() > 0.6) {
          lines.push({
            points: [[x, y, layer], [x, y, layer + 1]],
            color: "#509EF0",
            opacity: 0.5,
            lineWidth: 1.0
          });
        }
      }
    }
  }
  
  return lines;
}

function generateComplexFlowSystem() {
  const lines = [];
  
  // Process nodes
  const processes = [];
  for (let i = 0; i < 15; i++) {
    processes.push({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 4,
      size: 0.5 + Math.random() * 1.0,
      type: Math.floor(Math.random() * 3) // 0: rect, 1: circle, 2: diamond
    });
  }
  
  // Draw process nodes
  processes.forEach(proc => {
    if (proc.type === 0) { // Rectangle
      const rect = [
        [proc.x - proc.size, proc.y - proc.size/2, proc.z],
        [proc.x + proc.size, proc.y - proc.size/2, proc.z],
        [proc.x + proc.size, proc.y + proc.size/2, proc.z],
        [proc.x - proc.size, proc.y + proc.size/2, proc.z],
        [proc.x - proc.size, proc.y - proc.size/2, proc.z]
      ];
      lines.push({
        points: rect,
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    } else if (proc.type === 1) { // Circle
      const circle = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.2) {
        circle.push([
          proc.x + Math.cos(a) * proc.size,
          proc.y + Math.sin(a) * proc.size,
          proc.z
        ]);
      }
      lines.push({
        points: circle,
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    } else { // Diamond
      const diamond = [
        [proc.x, proc.y + proc.size, proc.z],
        [proc.x + proc.size, proc.y, proc.z],
        [proc.x, proc.y - proc.size, proc.z],
        [proc.x - proc.size, proc.y, proc.z],
        [proc.x, proc.y + proc.size, proc.z]
      ];
      lines.push({
        points: diamond,
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    }
  });
  
  // Flow connections with arrows
  for (let i = 0; i < processes.length; i++) {
    for (let j = i + 1; j < processes.length; j++) {
      if (Math.random() > 0.6) {
        const proc1 = processes[i];
        const proc2 = processes[j];
        
        // Main flow line
        lines.push({
          points: [[proc1.x, proc1.y, proc1.z], [proc2.x, proc2.y, proc2.z]],
          color: "#509EF0",
          opacity: 0.7,
          lineWidth: 1.3
        });
        
        // Arrow head
        const dx = proc2.x - proc1.x;
        const dy = proc2.y - proc1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const arrowSize = 0.3;
        
        if (len > 0) {
          const ux = dx / len;
          const uy = dy / len;
          
          const arrowTip = [proc2.x, proc2.y, proc2.z];
          const arrowLeft = [
            proc2.x - ux * arrowSize + uy * arrowSize * 0.5,
            proc2.y - uy * arrowSize - ux * arrowSize * 0.5,
            proc2.z
          ];
          const arrowRight = [
            proc2.x - ux * arrowSize - uy * arrowSize * 0.5,
            proc2.y - uy * arrowSize + ux * arrowSize * 0.5,
            proc2.z
          ];
          
          lines.push({
            points: [arrowLeft, arrowTip, arrowRight],
            color: "#509EF0",
            opacity: 0.7,
            lineWidth: 1.3
          });
        }
      }
    }
  }
  
  return lines;
}

function generateComplexSignalSystem() {
  const lines = [];
  
  // Multi-frequency signal analysis
  const frequencies = [0.5, 1.0, 2.0, 4.0, 8.0];
  const amplitudes = [4, 3, 2, 1.5, 1];
  
  frequencies.forEach((freq, index) => {
    // Time domain representation
    const timePoints = [];
    for (let t = -8; t <= 8; t += 0.05) {
      const amplitude = amplitudes[index];
      const y = amplitude * Math.sin(freq * Math.PI * t) + index * 2 - 4;
      timePoints.push([t, y, 0]);
    }
    
    lines.push({
      points: timePoints,
      color: "#509EF0",
      opacity: 0.8 - index * 0.1,
      lineWidth: 1.5
    });
    
    // Frequency domain representation
    const freqPoints = [];
    for (let f = 0; f <= 8; f += 0.1) {
      const magnitude = amplitudes[index] * Math.exp(-Math.pow((f - freq), 2) / 0.5);
      freqPoints.push([f - 4, magnitude + index * 1.5, 3]);
    }
    
    lines.push({
      points: freqPoints,
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.2
    });
  });
  
  // Spectral analysis grid
  for (let f = 0; f <= 8; f += 0.5) {
    lines.push({
      points: [[f - 4, -6, 3], [f - 4, 6, 3]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  for (let a = -6; a <= 6; a += 1) {
    lines.push({
      points: [[-4, a, 3], [4, a, 3]],
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  // Phase relationship indicators
  for (let i = 0; i < frequencies.length - 1; i++) {
    const phase1 = i * 2 - 4;
    const phase2 = (i + 1) * 2 - 4;
    
    // Phase correlation line
    lines.push({
      points: [[6, phase1, 0], [8, phase2, 0]],
      color: "#509EF0",
      opacity: 0.5,
      lineWidth: 1.2
    });
  }
  
  return lines;
}

function generateComplexGenericSystem() {
  const lines = [];
  
  // Multi-layer grid system
  for (let layer = -2; layer <= 2; layer++) {
    for (let x = -8; x <= 8; x += 0.5) {
      lines.push({
        points: [[x, -8, layer], [x, 8, layer]],
        color: "#509EF0",
        opacity: 0.2 + Math.abs(layer) * 0.1,
        lineWidth: 1.0
      });
    }
    
    for (let y = -8; y <= 8; y += 0.5) {
      lines.push({
        points: [[-8, y, layer], [8, y, layer]],
        color: "#509EF0",
        opacity: 0.2 + Math.abs(layer) * 0.1,
        lineWidth: 1.0
      });
    }
  }
  
  // Interconnected node clusters
  const clusters = [];
  for (let c = 0; c < 8; c++) {
    const cluster = {
      center: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4],
      nodes: []
    };
    
    for (let n = 0; n < 8; n++) {
      cluster.nodes.push([
        cluster.center[0] + (Math.random() - 0.5) * 3,
        cluster.center[1] + (Math.random() - 0.5) * 3,
        cluster.center[2] + (Math.random() - 0.5) * 2
      ]);
    }
    
    clusters.push(cluster);
  }
  
  // Draw cluster connections
  clusters.forEach(cluster => {
    // Internal cluster connections
    for (let i = 0; i < cluster.nodes.length; i++) {
      for (let j = i + 1; j < cluster.nodes.length; j++) {
        if (Math.random() > 0.5) {
          lines.push({
            points: [cluster.nodes[i], cluster.nodes[j]],
            color: "#509EF0",
            opacity: 0.6,
            lineWidth: 1.2
          });
        }
      }
    }
    
    // Node representations
    cluster.nodes.forEach(node => {
      const size = 0.15;
      lines.push({
        points: [
          [node[0] - size, node[1] - size, node[2]],
          [node[0] + size, node[1] - size, node[2]],
          [node[0] + size, node[1] + size, node[2]],
          [node[0] - size, node[1] + size, node[2]],
          [node[0] - size, node[1] - size, node[2]]
        ],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    });
  });
  
  // Inter-cluster connections
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      if (Math.random() > 0.7) {
        lines.push({
          points: [clusters[i].center, clusters[j].center],
          color: "#509EF0",
          opacity: 0.4,
          lineWidth: 1.8
        });
      }
    }
  }
  
  return lines;
}

function generateMeasurementGrid() {
  const lines = [];
  
  // Fine measurement grid
  for (let x = -8; x <= 8; x += 0.2) {
    lines.push({
      points: [[x, -8, -0.1], [x, 8, -0.1]],
      color: "#509EF0",
      opacity: 0.15,
      lineWidth: 0.8
    });
  }
  
  for (let y = -8; y <= 8; y += 0.2) {
    lines.push({
      points: [[-8, y, -0.1], [8, y, -0.1]],
      color: "#509EF0",
      opacity: 0.15,
      lineWidth: 0.8
    });
  }
  
  // Major grid lines
  for (let x = -8; x <= 8; x += 2) {
    lines.push({
      points: [[x, -8, -0.1], [x, 8, -0.1]],
      color: "#509EF0",
      opacity: 0.4,
      lineWidth: 1.2
    });
  }
  
  for (let y = -8; y <= 8; y += 2) {
    lines.push({
      points: [[-8, y, -0.1], [8, y, -0.1]],
      color: "#509EF0",
      opacity: 0.4,
      lineWidth: 1.2
    });
  }
  
  return lines;
}

function generateSystemInterconnections() {
  const lines = [];
  
  // Hierarchical connection patterns
  const levels = [
    { y: -6, nodes: 2 },
    { y: -3, nodes: 4 },
    { y: 0, nodes: 8 },
    { y: 3, nodes: 4 },
    { y: 6, nodes: 2 }
  ];
  
  const allNodes = [];
  levels.forEach(level => {
    const spacing = 12 / (level.nodes + 1);
    for (let i = 0; i < level.nodes; i++) {
      const x = -6 + spacing * (i + 1);
      allNodes.push([x, level.y, 0]);
    }
  });
  
  // Connect hierarchical levels
  let nodeIndex = 0;
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
    const currentLevelNodes = levels[levelIndex].nodes;
    const nextLevelNodes = levels[levelIndex + 1].nodes;
    
    for (let i = 0; i < currentLevelNodes; i++) {
      for (let j = 0; j < nextLevelNodes; j++) {
        const currentNode = allNodes[nodeIndex + i];
        const nextNode = allNodes[nodeIndex + currentLevelNodes + j];
        
        lines.push({
          points: [currentNode, nextNode],
          color: "#509EF0",
          opacity: 0.5,
          lineWidth: 1.1
        });
      }
    }
    nodeIndex += currentLevelNodes;
  }
  
  return lines;
}

function generateMolecularEnhancements() {
  const lines = [];
  
  // Phonon propagation patterns
  for (let mode = 0; mode < 3; mode++) {
    const points = [];
    for (let x = -6; x <= 6; x += 0.2) {
      const y = Math.sin(x * (mode + 1) * 0.5) * (2 - mode * 0.5) + mode * 2;
      const z = Math.cos(x * (mode + 1) * 0.5) * 0.5 + mode * 0.3;
      points.push([x, y, z]);
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

function generateCircuitEnhancements() {
  const lines = [];
  
  // EMI shielding patterns
  for (let shield = 1; shield <= 3; shield++) {
    const radius = shield * 2;
    const points = [];
    
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.1) {
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      points.push([x, y, shield * 0.5]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.3,
      lineWidth: 1.0
    });
  }
  
  return lines;
}

function generateNetworkEnhancements() {
  const lines = [];
  
  // Gradient flow indicators
  for (let flow = 0; flow < 5; flow++) {
    const points = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const x = -6 + t * 12;
      const y = Math.sin(t * Math.PI * 3 + flow) * 2 + flow * 1.5 - 3;
      const z = t * 2 - 1;
      points.push([x, y, z]);
    }
    
    lines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.5,
      lineWidth: 1.1
    });
  }
  
  return lines;
}
