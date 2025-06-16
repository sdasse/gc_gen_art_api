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

    // Use Claude to generate algorithms, then convert to lines
    const algorithmData = await generateAlgorithmsWithClaude(prompt.trim(), claudeApiKey);
    const artData = generateFromAlgorithms(algorithmData);

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

async function generateAlgorithmsWithClaude(userPrompt, apiKey) {
  // Add request validation
  if (!userPrompt || userPrompt.trim().length === 0) {
    throw new Error('User prompt is required');
  }

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key is required');
  }

  // Validate prompt length to avoid token issues
  if (userPrompt.length > 500) {
    console.warn('User prompt is very long, truncating to avoid token limits');
    userPrompt = userPrompt.substring(0, 500);
  }

  // Algorithm-based system prompt
  const systemPrompt = `You are a Three.js algorithm generator for complex technical line art. Instead of generating coordinates, create algorithms that generate sophisticated diagrams.

For the concept "${userPrompt}", return ONLY this JSON structure:

{
  "title": "Technical diagram name",
  "description": "What this represents",
  "algorithms": [
    {
      "type": "grid",
      "params": {
        "spacing": 0.2,
        "size": 12,
        "z_layers": 3,
        "noise": 0.1
      }
    },
    {
      "type": "circles",
      "params": {
        "center": [0, 0],
        "count": 30,
        "max_radius": 8,
        "min_radius": 0.5
      }
    },
    {
      "type": "radial_lines",
      "params": {
        "center": [0, 0],
        "count": 72,
        "length": 8,
        "variation": 0.2
      }
    },
    {
      "type": "network",
      "params": {
        "nodes": 60,
        "connection_probability": 0.25,
        "bounds": [-6, 6]
      }
    },
    {
      "type": "spiral",
      "params": {
        "count": 8,
        "turns": 4,
        "radius_start": 0.5,
        "radius_end": 6,
        "height_variation": 3
      }
    },
    {
      "type": "wave",
      "params": {
        "frequency": 3,
        "amplitude": 4,
        "segments": 120,
        "harmonics": 4
      }
    },
    {
      "type": "scatter",
      "params": {
        "count": 200,
        "distribution": "clustered",
        "bounds": [-7, 7]
      }
    },
    {
      "type": "logarithmic_spiral",
      "params": {
        "count": 5,
        "growth_factor": 0.2,
        "turns": 3,
        "max_radius": 7
      }
    },
   {
      "type": "flow_field",
      "params": {
        "particle_count": 150,
        "flow_complexity": 3,
        "trace_length": 50,
        "noise_scale": 0.1
      }
    },
    {
      "type": "voronoi_diagram",
      "params": {
        "seed_points": 25,
        "bounds": [-8, 8],
        "show_points": true,
        "show_edges": true
      }
    },
    {
      "type": "delaunay_triangulation",
      "params": {
        "points": 40,
        "bounds": [-7, 7]
      }
    },
    {
      "type": "mesh_deformation",
      "params": {
        "base_grid_size": 10,
        "deformation_strength": 2,
        "deformation_frequency": 0.5
      }
    },
    {
      "type": "particle_system",
      "params": {
        "emitter_count": 3,
        "particles_per_emitter": 50,
        "velocity_variation": 1.5,
        "life_span": 40
      }
    },
    {
      "type": "orbital_system",
      "params": {
        "central_bodies": 2,
        "orbiting_objects": 20,
        "orbit_eccentricity": 0.3,
        "trace_orbits": true
      }
    }
  ],
  "camera": {"position": [8, 6, 10], "lookAt": [0, 0, 0]}
}

CHOOSE 3-5 APPROPRIATE ALGORITHMS based on the concept. Use high counts for visual complexity. Return ONLY the JSON - no explanations.`;

  try {
    console.log('Making Claude API request for algorithms:', userPrompt.substring(0, 100));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000, // Much smaller since we're not generating coordinates
        messages: [
          {
            role: 'user',
            content: `Generate algorithm parameters for: "${userPrompt}"`
          }
        ],
        system: systemPrompt
      })
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);

      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }

      throw new Error(`Claude API error (${response.status}): ${errorDetails}`);
    }

    const claudeResult = await response.json();
    console.log('Claude algorithm result received');

    const generatedText = claudeResult.content[0].text;
    console.log('Raw algorithm response preview:', generatedText.substring(0, 200));

    // Extract JSON from Claude's response
    let algorithmData;
    try {
      // Try to find JSON in the response
      const jsonRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/g;
      const matches = generatedText.match(jsonRegex);

      if (matches) {
        const jsonString = matches.reduce((prev, current) => 
          current.length > prev.length ? current : prev
        );
        algorithmData = JSON.parse(jsonString);
      } else {
        throw new Error('No JSON found in Claude response');
      }

    } catch (parseError) {
      console.error('Algorithm JSON parsing failed:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error(`Failed to parse algorithm JSON: ${parseError.message}`);
    }

    // Validate algorithm structure
    if (!algorithmData.algorithms || !Array.isArray(algorithmData.algorithms)) {
      throw new Error('Claude did not generate valid algorithms array');
    }

    console.log(`Generated ${algorithmData.algorithms.length} algorithms`);
    return algorithmData;

  } catch (error) {
    console.error('Claude algorithm generation error:', error);
    throw error;
  }
}

// Algorithm generators that create the actual lines
const algorithmGenerators = {
  grid: (params) => {
    const lines = [];
    const halfSize = params.size / 2;
    const spacing = params.spacing || 0.5;
    const layers = params.z_layers || 1;
    const noise = params.noise || 0;

    for (let layer = 0; layer < layers; layer++) {
      const z = (layer - layers/2) * 2;

      // Horizontal lines
      for (let y = -halfSize; y <= halfSize; y += spacing) {
        const points = [];
        for (let x = -halfSize; x <= halfSize; x += spacing/3) {
          const noiseY = y + (Math.random() - 0.5) * noise;
          const noiseZ = z + (Math.random() - 0.5) * noise * 0.5;
          points.push([x, noiseY, noiseZ]);
        }
        lines.push({
          points: points,
          color: "#509EF0",
          opacity: 0.4 + layer * 0.1,
          lineWidth: 1.5
        });
      }

      // Vertical lines
      for (let x = -halfSize; x <= halfSize; x += spacing) {
        const points = [];
        for (let y = -halfSize; y <= halfSize; y += spacing/3) {
          const noiseX = x + (Math.random() - 0.5) * noise;
          const noiseZ = z + (Math.random() - 0.5) * noise * 0.5;
          points.push([noiseX, y, noiseZ]);
        }
        lines.push({
          points: points,
          color: "#509EF0",
          opacity: 0.4 + layer * 0.1,
          lineWidth: 1.5
        });
      }
    }
    return lines;
  },

  circles: (params) => {
    const lines = [];
    const center = params.center || [0, 0];
    const count = params.count || 10;
    const maxRadius = params.max_radius || 5;
    const minRadius = params.min_radius || 0.5;

    for (let i = 0; i < count; i++) {
      const radius = minRadius + (maxRadius - minRadius) * (i / count);
      const points = [];
      const segments = 64;

      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        points.push([
          center[0] + Math.cos(angle) * radius,
          center[1] + Math.sin(angle) * radius,
          0
        ]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.6 + (i / count) * 0.3,
        lineWidth: 1.5
      });
    }
    return lines;
  },

  radial_lines: (params) => {
    const lines = [];
    const center = params.center || [0, 0];
    const count = params.count || 24;
    const length = params.length || 5;
    const variation = params.variation || 0;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const lineLength = length + (Math.random() - 0.5) * variation;

      lines.push({
        points: [
          [center[0], center[1], 0],
          [
            center[0] + Math.cos(angle) * lineLength,
            center[1] + Math.sin(angle) * lineLength,
            0
          ]
        ],
        color: "#509EF0",
        opacity: 0.6,
        lineWidth: 1.5
      });
    }
    return lines;
  },

  network: (params) => {
    const lines = [];
    const nodes = [];
    const nodeCount = params.nodes || 20;
    const connectionProb = params.connection_probability || 0.3;
    const bounds = params.bounds || [-5, 5];

    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push([
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * 4
      ]);
    }

    // Connect nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() < connectionProb) {
          lines.push({
            points: [nodes[i], nodes[j]],
            color: "#509EF0",
            opacity: 0.5,
            lineWidth: 1.5
          });
        }
      }
    }

    // Add node markers
    nodes.forEach(node => {
      const size = 0.1;
      lines.push({
        points: [
          [node[0] - size, node[1], node[2]],
          [node[0] + size, node[1], node[2]]
        ],
        color: "#509EF0",
        opacity: 1,
        lineWidth: 2
      });
      lines.push({
        points: [
          [node[0], node[1] - size, node[2]],
          [node[0], node[1] + size, node[2]]
        ],
        color: "#509EF0",
        opacity: 1,
        lineWidth: 2
      });
    });

    return lines;
  },

  spiral: (params) => {
    const lines = [];
    const count = params.count || 5;
    const turns = params.turns || 3;
    const radiusStart = params.radius_start || 0.5;
    const radiusEnd = params.radius_end || 5;
    const heightVar = params.height_variation || 2;

    for (let i = 0; i < count; i++) {
      const points = [];
      const spiralTurns = turns * (1 + i * 0.1);
      const radiusScale = radiusStart + (radiusEnd - radiusStart) * (i / count);

      for (let t = 0; t <= spiralTurns * Math.PI * 2; t += 0.1) {
        const radius = radiusScale * (t / (spiralTurns * Math.PI * 2));
        const x = Math.cos(t) * radius;
        const y = Math.sin(t) * radius;
        const z = Math.sin(t * 2) * heightVar * (i / count);
        points.push([x, y, z]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.8 - i * 0.1,
        lineWidth: 1.5
      });
    }
    return lines;
  },

  wave: (params) => {
    const lines = [];
    const frequency = params.frequency || 2;
    const amplitude = params.amplitude || 3;
    const segments = params.segments || 100;
    const harmonics = params.harmonics || 3;

    for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
      const points = [];
      const freq = frequency * harmonic;
      const amp = amplitude / harmonic;

      for (let i = 0; i < segments; i++) {
        const x = (i / segments - 0.5) * 12;
        const y = Math.sin(x * freq) * amp;
        const z = Math.cos(x * freq * 0.5) * amp * 0.3;
        points.push([x, y, z]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.8 / harmonic,
        lineWidth: 1.5
      });
    }

    return lines;
  },

  scatter: (params) => {
    const lines = [];
    const count = params.count || 100;
    const distribution = params.distribution || "random";
    const bounds = params.bounds || [-5, 5];

    for (let i = 0; i < count; i++) {
      let x, y, z;

      if (distribution === "exponential") {
        const t = (Math.random() - 0.5) * 8;
        x = t;
        y = t > 0 ? Math.exp(t * 0.3) - 1 : (Math.random() - 0.5) * 2;
        z = (Math.random() - 0.5) * 2;
      } else if (distribution === "clustered") {
        const clusterCenter = [(Math.random() - 0.5) * bounds[1], (Math.random() - 0.5) * bounds[1]];
        x = clusterCenter[0] + (Math.random() - 0.5) * 2;
        y = clusterCenter[1] + (Math.random() - 0.5) * 2;
        z = (Math.random() - 0.5) * 2;
      } else {
        x = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
        y = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
        z = (Math.random() - 0.5) * 4;
      }

      // Create small cross for each point
      const size = 0.05;
      lines.push({
        points: [[x-size, y, z], [x+size, y, z]],
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1
      });
      lines.push({
        points: [[x, y-size, z], [x, y+size, z]],
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1
      });
    }

    return lines;
  },

  logarithmic_spiral: (params) => {
    const lines = [];
    const count = params.count || 5;
    const growthFactor = params.growth_factor || 0.2;
    const turns = params.turns || 3;
    const maxRadius = params.max_radius || 7;

    for (let i = 0; i < count; i++) {
      const points = [];
      const offset = (i / count) * Math.PI * 2;

      for (let t = 0; t <= turns * Math.PI * 2; t += 0.1) {
        const radius = Math.exp(growthFactor * t);
        if (radius > maxRadius) break;

        const x = Math.cos(t + offset) * radius;
        const y = Math.sin(t + offset) * radius;
        const z = Math.sin(t * 0.5) * 2;
        points.push([x, y, z]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.8 - i * 0.1,
        lineWidth: 1.5
      });
    }
    return lines;
  },

  flow_field: (params) => {
    const lines = [];
    const particleCount = params.particle_count || 150;
    const flowComplexity = params.flow_complexity || 3;
    const traceLength = params.trace_length || 50;
    const noiseScale = params.noise_scale || 0.1;

    for (let p = 0; p < particleCount; p++) {
      const points = [];
      let x = (Math.random() - 0.5) * 10;
      let y = (Math.random() - 0.5) * 10;
      let z = (Math.random() - 0.5) * 4;

      for (let t = 0; t < traceLength; t++) {
        points.push([x, y, z]);

        // Calculate flow field direction
        const angle = Math.sin(x * noiseScale) * Math.cos(y * noiseScale) * flowComplexity;
        const speed = 0.1;

        x += Math.cos(angle) * speed;
        y += Math.sin(angle) * speed;
        z += Math.sin(x * 0.1) * 0.05;

        // Wrap around boundaries
        if (Math.abs(x) > 6) x = -x * 0.8;
        if (Math.abs(y) > 6) y = -y * 0.8;
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.6,
        lineWidth: 1
      });
    }
    return lines;
  },

  voronoi_diagram: (params) => {
    const lines = [];
    const seedPoints = params.seed_points || 25;
    const bounds = params.bounds || [-8, 8];
    const showPoints = params.show_points !== false;
    const showEdges = params.show_edges !== false;

    // Generate seed points
    const seeds = [];
    for (let i = 0; i < seedPoints; i++) {
      seeds.push([
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * 2
      ]);
    }

    // Simple Voronoi approximation using grid sampling
    const resolution = 40;
    const cellEdges = new Map();

    for (let gx = 0; gx < resolution; gx++) {
      for (let gy = 0; gy < resolution; gy++) {
        const x = (gx / resolution - 0.5) * (bounds[1] - bounds[0]);
        const y = (gy / resolution - 0.5) * (bounds[1] - bounds[0]);

        // Find closest seed
        let closestSeed = 0;
        let minDist = Infinity;

        seeds.forEach((seed, index) => {
          const dist = Math.sqrt(
            Math.pow(x - seed[0], 2) + Math.pow(y - seed[1], 2)
          );
          if (dist < minDist) {
            minDist = dist;
            closestSeed = index;
          }
        });

        // Check neighbors for edge detection
        const neighbors = [
          [gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]
        ];

        neighbors.forEach(([nx, ny]) => {
          if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
            const nx_world = (nx / resolution - 0.5) * (bounds[1] - bounds[0]);
            const ny_world = (ny / resolution - 0.5) * (bounds[1] - bounds[0]);

            let neighborSeed = 0;
            let neighborMinDist = Infinity;

            seeds.forEach((seed, index) => {
              const dist = Math.sqrt(
                Math.pow(nx_world - seed[0], 2) + Math.pow(ny_world - seed[1], 2)
              );
              if (dist < neighborMinDist) {
                neighborMinDist = dist;
                neighborSeed = index;
              }
            });

            if (neighborSeed !== closestSeed && showEdges) {
              lines.push({
                points: [[x, y, 0], [nx_world, ny_world, 0]],
                color: "#509EF0",
                opacity: 0.5,
                lineWidth: 1
              });
            }
          }
        });
      }
    }

    // Draw seed points
    if (showPoints) {
      seeds.forEach(seed => {
        const size = 0.1;
        lines.push({
          points: [
            [seed[0] - size, seed[1], seed[2]],
            [seed[0] + size, seed[1], seed[2]]
          ],
          color: "#509EF0",
          opacity: 1,
          lineWidth: 2
        });
      });
    }

    return lines;
  },

  delaunay_triangulation: (params) => {
    const lines = [];
    const pointCount = params.points || 40;
    const bounds = params.bounds || [-7, 7];

    // Generate random points
    const points = [];
    for (let i = 0; i < pointCount; i++) {
      points.push([
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * 2
      ]);
    }

    // Simple triangulation (not true Delaunay, but creates connected triangles)
    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];

      // Find 2-3 nearest neighbors
      const distances = points.map((p, index) => ({
        index,
        distance: Math.sqrt(
          Math.pow(p[0] - currentPoint[0], 2) + 
          Math.pow(p[1] - currentPoint[1], 2)
        )
      })).filter(d => d.index !== i).sort((a, b) => a.distance - b.distance);

      // Connect to nearest neighbors
      for (let j = 0; j < Math.min(3, distances.length); j++) {
        const neighbor = points[distances[j].index];
        lines.push({
          points: [currentPoint, neighbor],
          color: "#509EF0",
          opacity: 0.6,
          lineWidth: 1
        });
      }
    }

    return lines;
  },

  mesh_deformation: (params) => {
    const lines = [];
    const gridSize = params.base_grid_size || 10;
    const deformationStrength = params.deformation_strength || 2;
    const deformationFrequency = params.deformation_frequency || 0.5;

    // Create deformed grid
    const spacing = 12 / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = (i / gridSize - 0.5) * 12;
        const y = (j / gridSize - 0.5) * 12;

        // Apply deformation
        const deformX = x + Math.sin(y * deformationFrequency) * deformationStrength;
        const deformY = y + Math.cos(x * deformationFrequency) * deformationStrength;
        const deformZ = Math.sin(x * deformationFrequency) * Math.cos(y * deformationFrequency) * 0.5;

        // Connect to neighbors
        if (i < gridSize) {
          const nextX = ((i + 1) / gridSize - 0.5) * 12;
          const nextDeformX = nextX + Math.sin(y * deformationFrequency) * deformationStrength;
          const nextDeformZ = Math.sin(nextX * deformationFrequency) * Math.cos(y * deformationFrequency) * 0.5;

          lines.push({
            points: [
              [deformX, deformY, deformZ],
              [nextDeformX, deformY, nextDeformZ]
            ],
            color: "#509EF0",
            opacity: 0.6,
            lineWidth: 1
          });
        }

        if (j < gridSize) {
          const nextY = ((j + 1) / gridSize - 0.5) * 12;
          const nextDeformY = nextY + Math.cos(x * deformationFrequency) * deformationStrength;
          const nextDeformZ = Math.sin(x * deformationFrequency) * Math.cos(nextY * deformationFrequency) * 0.5;

          lines.push({
            points: [
              [deformX, deformY, deformZ],
              [deformX, nextDeformY, nextDeformZ]
            ],
            color: "#509EF0",
            opacity: 0.6,
            lineWidth: 1
          });
        }
      }
    }

    return lines;
  },

  particle_system: (params) => {
    const lines = [];
    const emitterCount = params.emitter_count || 3;
    const particlesPerEmitter = params.particles_per_emitter || 50;
    const velocityVariation = params.velocity_variation || 1.5;
    const lifeSpan = params.life_span || 40;

    for (let e = 0; e < emitterCount; e++) {
      const emitterPos = [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 2
      ];

      for (let p = 0; p < particlesPerEmitter; p++) {
        const points = [];
        let pos = [...emitterPos];

        const velocity = [
          (Math.random() - 0.5) * velocityVariation,
          (Math.random() - 0.5) * velocityVariation,
          (Math.random() - 0.5) * velocityVariation * 0.5
        ];

        for (let t = 0; t < lifeSpan; t++) {
          points.push([...pos]);

          // Update position
          pos[0] += velocity[0] * 0.1;
          pos[1] += velocity[1] * 0.1;
          pos[2] += velocity[2] * 0.1;

          // Apply gravity and air resistance
          velocity[2] -= 0.02;
          velocity[0] *= 0.99;
          velocity[1] *= 0.99;
          velocity[2] *= 0.99;
        }

        lines.push({
          points: points,
          color: "#509EF0",
          opacity: 0.4,
          lineWidth: 1
        });
      }
    }

    return lines;```text

  },

  orbital_system: (params) => {
    const lines = [];
    const centralBodies = params.central_bodies || 2;
    const orbitingObjects = params.orbiting_objects || 20;
    const orbitEccentricity = params.orbit_eccentricity || 0.3;
    const traceOrbits = params.trace_orbits !== false;

    // Create central bodies
    const centers = [];
    for (let i = 0; i < centralBodies; i++) {
      const angle = (i / centralBodies) * Math.PI * 2;
      centers.push([
        Math.cos(angle) * 2,
        Math.sin(angle) * 2,
        0
      ]);
    }

    // Create orbiting objects
    for (let obj = 0; obj < orbitingObjects; obj++) {
      const centerIndex = obj % centralBodies;
      const center = centers[centerIndex];

      const orbitalRadius = 1 + Math.random() * 4;
      const orbitalSpeed = 1 / orbitalRadius;
      const inclination = (Math.random() - 0.5) * Math.PI * 0.3;

      if (traceOrbits) {
        const orbitPoints = [];
        const steps = 60;

        for (let step = 0; step < steps; step++) {
          const t = (step / steps) * Math.PI * 2;

          // Elliptical orbit
          const r = orbitalRadius * (1 - orbitEccentricity * orbitEccentricity) / 
                   (1 + orbitEccentricity * Math.cos(t));

          const x = center[0] + Math.cos(t) * r;
          const y = center[1] + Math.sin(t) * r * Math.cos(inclination);
          const z = center[2] + Math.sin(t) * r * Math.sin(inclination);

          orbitPoints.push([x, y, z]);
        }

        lines.push({
          points: orbitPoints,
          color: "#509EF0",
          opacity: 0.3,
          lineWidth: 1
        });
      }
    }

    // Draw central bodies
    centers.forEach(center => {
      const size = 0.2;
      lines.push({
        points: [
          [center[0] - size, center[1], center[2]],
          [center[0] + size, center[1], center[2]]
        ],
        color: "#509EF0",
        opacity: 1,
        lineWidth: 3
      });
      lines.push({
        points: [
          [center[0], center[1] - size, center[2]],
          [center[0], center[1] + size, center[2]]
        ],
        color: "#509EF0",
        opacity: 1,
        lineWidth: 3
      });
    });

    return lines;
  }
};

// Main generation function that converts algorithms to lines
function generateFromAlgorithms(algorithmData) {
  const allLines = [];

  console.log(`Processing ${algorithmData.algorithms.length} algorithms`);

  algorithmData.algorithms.forEach((algorithm, index) => {
    console.log(`Processing algorithm ${index + 1}: ${algorithm.type}`);

    if (algorithmGenerators[algorithm.type]) {
      const lines = algorithmGenerators[algorithm.type](algorithm.params);
      allLines.push(...lines);
      console.log(`Generated ${lines.length} lines from ${algorithm.type}`);
    } else {
      console.warn(`Unknown algorithm type: ${algorithm.type}`);
    }
  });

  console.log(`Total lines generated: ${allLines.length}`);

  return {
    title: algorithmData.title,
    description: algorithmData.description,
    lines: allLines,
    camera: algorithmData.camera || { position: [8, 6, 10], lookAt: [0, 0, 0] },
    metadata: {
      generated_at: new Date().toISOString(),
      algorithms_used: algorithmData.algorithms.map(a => a.type),
      total_lines: allLines.length
    }
  };
}
