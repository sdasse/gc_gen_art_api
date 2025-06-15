
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
  const systemPrompt = `You are a master technical visualization artist. Your goal is to create AUTHENTIC visual representations that match the actual nature of what's being described - not generic templates.

ANALYZE THE PROMPT: "${userPrompt}"

First, determine what DOMAIN this belongs to:
- MOLECULAR/ATOMIC: Actual molecular structures, crystal lattices, atomic arrangements
- ASTRONOMICAL: Star charts, orbital mechanics, celestial navigation, cosmic phenomena  
- CIRCUIT/ELECTRICAL: PCB layouts, schematic diagrams, electrical networks
- WAVE/SIGNAL: Sound waves, radio frequencies, signal processing, vibrations
- BIOLOGICAL: Neural networks, cellular structures, organic growth patterns
- MATHEMATICAL: Geometric proofs, statistical plots, algorithmic visualizations
- ARCHITECTURAL: Building plans, structural diagrams, blueprints
- TOPOGRAPHIC: Terrain maps, contour lines, geological surveys
- ABSTRACT/CONCEPTUAL: Pure geometric or artistic interpretations

CREATE AUTHENTIC VISUALIZATIONS:

FOR MOLECULAR/ATOMIC:
- Use tetrahedral bond angles (109.5°), octahedral geometries
- Show electron orbitals as probability clouds
- Crystal lattice structures with repeating unit cells
- Bond lengths and atomic radii to scale

FOR ASTRONOMICAL:
- Use celestial coordinate systems (RA/Dec grids)
- Show orbital ellipses with accurate eccentricity
- Star magnitude represented by varying opacities
- Constellation patterns and navigation lines

FOR CIRCUIT/ELECTRICAL:
- PCB trace routing with proper electrical pathways
- Component symbols and connection nodes
- Signal flow diagrams with directional indicators
- Hierarchical circuit topology

FOR WAVE/SIGNAL:
- Sinusoidal patterns with proper frequency relationships
- Amplitude modulation and phase relationships
- Spectral analysis with frequency domain representation
- Wave interference and superposition patterns

FOR BIOLOGICAL:
- Branching patterns following natural growth algorithms
- Network connectivity with hub-and-spoke architectures
- Organic curved paths and flowing connections
- Hierarchical tree structures

COMPOSITION RULES:
- NO DEFAULT GRIDS unless specifically relevant to the domain
- Match density to content complexity (molecular = dense, conceptual = sparse)
- Use authentic mathematical relationships for the domain
- Create 100-1000+ lines for complex technical subjects
- Keep colors: "#509EF0", opacity 0.3-1.0, lineWidth 1.5
- Coordinates: -8 to +8 in all dimensions

RETURN FORMAT:
{
  "title": "Domain-specific title",
  "description": "What authentic visualization approach you used",
  "domain": "identified_domain",
  "composition_style": "authentic_to_domain", 
  "lines": [
    {"points": [[x,y,z], [x,y,z], ...], "color": "#509EF0", "opacity": 0.7, "lineWidth": 1.5}
  ],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

CRITICAL: Make it look like what the subject ACTUALLY looks like in its authentic technical context, not a generic diagram.`;

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
            content: `Create an authentic technical visualization for: "${userPrompt}"

Analyze what domain this belongs to and create a visualization that looks like what this subject ACTUALLY looks like in its technical/scientific context. Avoid generic templates - make it domain-authentic with appropriate complexity.`
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
        artData.lines = generateDomainSpecificFallback(userPrompt);
      }

      console.log(`Generated ${artData.lines.length} lines for domain: ${artData.domain || 'unknown'} with style: ${artData.composition_style || 'unknown'}`);

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error(`Claude API request failed: ${error.message}`);
  }
}

function generateDomainSpecificFallback(prompt) {
  const lines = [];
  const lowerPrompt = prompt.toLowerCase();

  // Molecular/Chemical domain
  if (lowerPrompt.includes('molecular') || lowerPrompt.includes('atom') || lowerPrompt.includes('chemical') || lowerPrompt.includes('bond')) {
    // Create tetrahedral molecular structure
    const bondLength = 2.0;
    const tetrahedralAngle = Math.acos(-1/3); // 109.47 degrees
    
    // Central atom at origin
    const centralAtom = [0, 0, 0];
    
    // Four bonded atoms in tetrahedral arrangement
    const bondedAtoms = [
      [bondLength, 0, 0],
      [-bondLength/3, bondLength * Math.sqrt(8/9), 0],
      [-bondLength/3, -bondLength * Math.sqrt(2/9), bondLength * Math.sqrt(2/3)],
      [-bondLength/3, -bondLength * Math.sqrt(2/9), -bondLength * Math.sqrt(2/3)]
    ];

    // Create bonds
    bondedAtoms.forEach(atom => {
      lines.push({
        points: [centralAtom, atom],
        color: "#509EF0",
        opacity: 0.9,
        lineWidth: 1.5
      });
    });

    // Add electron clouds (probability shells)
    for (let r = 1; r <= 4; r++) {
      const points = [];
      for (let i = 0; i <= 32; i++) {
        const theta = (i / 32) * Math.PI * 2;
        points.push([
          Math.cos(theta) * r,
          Math.sin(theta) * r,
          0
        ]);
      }
      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.3 - r * 0.05,
        lineWidth: 1.5
      });
    }

    return lines;
  }

  // Circuit/Electrical domain
  if (lowerPrompt.includes('circuit') || lowerPrompt.includes('electrical') || lowerPrompt.includes('pcb') || lowerPrompt.includes('electronic')) {
    // Create PCB-style layout with traces
    const components = [
      {pos: [-4, 3], size: [1, 0.5]},
      {pos: [2, 4], size: [1.5, 0.3]},
      {pos: [-2, -1], size: [0.8, 0.8]},
      {pos: [4, -2], size: [1.2, 1.2]},
      {pos: [-5, -3], size: [0.6, 1.5]}
    ];

    // Draw component outlines
    components.forEach(comp => {
      const [x, y] = comp.pos;
      const [w, h] = comp.size;
      lines.push({
        points: [
          [x - w/2, y - h/2, 0],
          [x + w/2, y - h/2, 0],
          [x + w/2, y + h/2, 0],
          [x - w/2, y + h/2, 0],
          [x - w/2, y - h/2, 0]
        ],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    });

    // Create routing traces between components
    const connections = [
      [components[0].pos, components[2].pos],
      [components[1].pos, components[3].pos],
      [components[2].pos, components[4].pos],
      [components[0].pos, components[1].pos]
    ];

    connections.forEach(([start, end]) => {
      // Create L-shaped routing
      const midX = start[0];
      const midY = end[1];
      lines.push({
        points: [
          [start[0], start[1], 0],
          [midX, midY, 0],
          [end[0], end[1], 0]
        ],
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1.5
      });
    });

    return lines;
  }

  // Wave/Signal domain
  if (lowerPrompt.includes('wave') || lowerPrompt.includes('frequency') || lowerPrompt.includes('signal') || lowerPrompt.includes('sound')) {
    // Create multiple frequency components
    const frequencies = [0.5, 1.0, 2.0, 3.0];
    const amplitudes = [3, 2, 1.5, 1];

    frequencies.forEach((freq, i) => {
      const points = [];
      for (let x = -8; x <= 8; x += 0.1) {
        const y = amplitudes[i] * Math.sin(freq * Math.PI * x) - i * 1.5;
        points.push([x, y, 0]);
      }
      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.8 - i * 0.1,
        lineWidth: 1.5
      });
    });

    // Add frequency axis markers
    for (let i = -8; i <= 8; i += 2) {
      lines.push({
        points: [[i, -8, 0], [i, -7.5, 0]],
        color: "#509EF0",
        opacity: 0.5,
        lineWidth: 1.5
      });
    }

    return lines;
  }

  // Astronomical domain
  if (lowerPrompt.includes('star') || lowerPrompt.includes('planet') || lowerPrompt.includes('orbit') || lowerPrompt.includes('celestial')) {
    // Create orbital mechanics visualization
    const orbitalRadii = [2, 3.5, 5, 6.5];
    const eccentricities = [0.1, 0.2, 0.0, 0.3];

    // Central body
    lines.push({
      points: [
        [0, 0, 0], [0.2, 0, 0], [0, 0.2, 0], [-0.2, 0, 0], [0, -0.2, 0], [0, 0, 0]
      ],
      color: "#509EF0",
      opacity: 1.0,
      lineWidth: 1.5
    });

    // Orbital paths
    orbitalRadii.forEach((radius, i) => {
      const points = [];
      const e = eccentricities[i];
      for (let theta = 0; theta <= Math.PI * 2; theta += 0.1) {
        const r = radius * (1 - e * e) / (1 + e * Math.cos(theta));
        points.push([
          r * Math.cos(theta),
          r * Math.sin(theta),
          0
        ]);
      }
      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.6 - i * 0.1,
        lineWidth: 1.5
      });
    });

    // Coordinate grid for celestial navigation
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = angle * Math.PI / 180;
      lines.push({
        points: [
          [0, 0, 0],
          [8 * Math.cos(rad), 8 * Math.sin(rad), 0]
        ],
        color: "#509EF0",
        opacity: 0.3,
        lineWidth: 1.5
      });
    }

    return lines;
  }

  // Biological/Network domain
  if (lowerPrompt.includes('network') || lowerPrompt.includes('neural') || lowerPrompt.includes('biological') || lowerPrompt.includes('organic')) {
    // Create hierarchical network structure
    const layers = [
      {y: 4, nodes: 3},
      {y: 2, nodes: 5},
      {y: 0, nodes: 4},
      {y: -2, nodes: 6},
      {y: -4, nodes: 2}
    ];

    const allNodes = [];
    layers.forEach(layer => {
      const spacing = 12 / (layer.nodes + 1);
      for (let i = 0; i < layer.nodes; i++) {
        const x = -6 + spacing * (i + 1);
        allNodes.push([x, layer.y, 0]);
      }
    });

    // Connect nodes with organic curves
    let nodeIndex = 0;
    for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
      const currentLayerNodes = layers[layerIndex].nodes;
      const nextLayerNodes = layers[layerIndex + 1].nodes;
      
      for (let i = 0; i < currentLayerNodes; i++) {
        for (let j = 0; j < nextLayerNodes; j++) {
          const currentNode = allNodes[nodeIndex + i];
          const nextNode = allNodes[nodeIndex + currentLayerNodes + j];
          
          // Create curved connection
          const midX = (currentNode[0] + nextNode[0]) / 2;
          const midY = (currentNode[1] + nextNode[1]) / 2;
          const controlX = midX + (Math.random() - 0.5) * 2;
          
          lines.push({
            points: [
              currentNode,
              [controlX, midY, 0],
              nextNode
            ],
            color: "#509EF0",
            opacity: 0.5,
            lineWidth: 1.5
          });
        }
      }
      nodeIndex += currentLayerNodes;
    }

    // Draw nodes
    allNodes.forEach(node => {
      const size = 0.2;
      lines.push({
        points: [
          [node[0] - size, node[1] - size, 0],
          [node[0] + size, node[1] - size, 0],
          [node[0] + size, node[1] + size, 0],
          [node[0] - size, node[1] + size, 0],
          [node[0] - size, node[1] - size, 0]
        ],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
    });

    return lines;
  }

  // Default: Simple geometric pattern
  return [
    {
      points: [[-6, 0, 0], [6, 0, 0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    },
    {
      points: [[0, -6, 0], [0, 6, 0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    }
  ];
}
