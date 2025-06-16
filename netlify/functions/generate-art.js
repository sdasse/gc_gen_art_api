
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

// Enhanced Claude prompt generation with complexity management
async function generateAlgorithmsWithClaude(userPrompt, apiKey) {
  // Enhanced validation
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    throw new Error('User prompt is required and must be a non-empty string');
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('API key is required and must be a non-empty string');
  }

  // Sanitize and limit prompt length
  userPrompt = userPrompt.trim();
  if (userPrompt.length > 500) {
    console.warn('User prompt is very long, truncating to avoid token limits');
    userPrompt = userPrompt.substring(0, 500);
  }

  // Enhanced system prompt with complexity guidance
  const systemPrompt = `You are a Three.js algorithm generator for complex technical line art. Create algorithms that generate sophisticated diagrams with optimal performance.

For the concept "${userPrompt}", return ONLY this JSON structure with 3-5 algorithms chosen based on complexity and visual impact:

{
  "title": "Technical diagram name",
  "description": "What this represents",
  "algorithms": [
    // Choose 3-5 from these options based on the concept:
    // SIMPLE (fast): "grid", "circles", "radial_lines", "wave", "scatter"
    // MEDIUM (moderate): "network", "spiral", "logarithmic_spiral", "mesh_deformation"  
    // COMPLEX (slower): "flow_field", "voronoi_diagram", "delaunay_triangulation", "particle_system", "orbital_system"
    
    // For performance, use AT MOST 2 COMPLEX algorithms
    // Always include at least 1 SIMPLE algorithm for structure
    
    {
      "type": "grid",
      "params": {
        "spacing": 0.3,
        "size": 10,
        "z_layers": 2,
        "noise": 0.1
      }
    }
    // Add 2-4 more algorithms based on concept
  ],
  "camera": {"position": [8, 6, 10], "lookAt": [0, 0, 0]}
}

Parameter guidelines for performance:
- grid: spacing >= 0.2, size <= 20, z_layers <= 5
- circles: count <= 50, max_radius <= 10
- network: nodes <= 100, connection_probability <= 0.8
- flow_field: particle_count <= 100, trace_length <= 50
- voronoi_diagram: seed_points <= 30
- particle_system: emitter_count <= 4, particles_per_emitter <= 40, life_span <= 50
- All counts should be reasonable for smooth rendering

Return ONLY the JSON - no explanations.`;

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
        max_tokens: 2000,
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

    // Enhanced JSON extraction with multiple fallback strategies
    let algorithmData;
    try {
      // Strategy 1: Try to parse the entire response as JSON
      try {
        algorithmData = JSON.parse(generatedText.trim());
      } catch (e) {
        // Strategy 2: Find JSON blocks in the response
        const jsonRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/g;
        const matches = generatedText.match(jsonRegex);

        if (matches) {
          // Find the largest JSON block (most likely to be complete)
          const jsonString = matches.reduce((prev, current) => 
            current.length > prev.length ? current : prev
          );
          algorithmData = JSON.parse(jsonString);
        } else {
          throw new Error('No JSON found in Claude response');
        }
      }

    } catch (parseError) {
      console.error('Algorithm JSON parsing failed:', parseError);
      console.error('Raw response:', generatedText);
      
      // Fallback: Return a simple default algorithm set
      console.warn('Using fallback algorithm set due to parsing failure');
      algorithmData = {
        title: "Fallback Art",
        description: "Generated using fallback algorithms",
        algorithms: [
          {
            type: "grid",
            params: { spacing: 0.5, size: 8, z_layers: 1, noise: 0.1 }
          },
          {
            type: "circles",
            params: { center: [0, 0], count: 20, max_radius: 6, min_radius: 0.5 }
          },
          {
            type: "radial_lines",
            params: { center: [0, 0], count: 36, length: 6, variation: 0.2 }
          }
        ],
        camera: { position: [8, 6, 10], lookAt: [0, 0, 0] }
      };
    }

    // Validate and sanitize algorithm structure
    if (!algorithmData.algorithms || !Array.isArray(algorithmData.algorithms)) {
      throw new Error('Claude did not generate valid algorithms array');
    }

    // Limit number of algorithms
    if (algorithmData.algorithms.length > 8) {
      console.warn(`Claude generated ${algorithmData.algorithms.length} algorithms, limiting to 8`);
      algorithmData.algorithms = algorithmData.algorithms.slice(0, 8);
    }

    // Validate each algorithm
    algorithmData.algorithms = algorithmData.algorithms.filter(alg => {
      if (!alg || typeof alg !== 'object' || !alg.type || typeof alg.type !== 'string') {
        console.warn('Filtering invalid algorithm:', alg);
        return false;
      }
      return true;
    });

    if (algorithmData.algorithms.length === 0) {
      throw new Error('No valid algorithms found after filtering');
    }

    console.log(`Generated ${algorithmData.algorithms.length} valid algorithms`);
    return algorithmData;

  } catch (error) {
    console.error('Claude algorithm generation error:', error);
    throw error;
  }
}

// Enhanced algorithm generators with parameter validation and limits
const algorithmGenerators = {
  grid: (params) => {
    const lines = [];
    const spacing = Math.max(0.2, Math.min(2, params.spacing || 0.5));
    const size = Math.max(2, Math.min(20, params.size || 12));
    const layers = Math.max(1, Math.min(5, params.z_layers || 1));
    const noise = Math.max(0, Math.min(1, params.noise || 0));
    
    const halfSize = size / 2;
    let lineCount = 0;
    const maxLines = 1000;

    for (let layer = 0; layer < layers && lineCount < maxLines; layer++) {
      const z = (layer - layers/2) * 2;

      // Horizontal lines
      for (let y = -halfSize; y <= halfSize && lineCount < maxLines; y += spacing) {
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
        lineCount++;
      }

      // Vertical lines
      for (let x = -halfSize; x <= halfSize && lineCount < maxLines; x += spacing) {
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
        lineCount++;
      }
    }
    return lines;
  },

  circles: (params) => {
    const lines = [];
    const center = params.center || [0, 0];
    const count = Math.max(5, Math.min(50, params.count || 10));
    const maxRadius = Math.max(1, Math.min(10, params.max_radius || 5));
    const minRadius = Math.max(0.1, Math.min(maxRadius, params.min_radius || 0.5));

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
    const count = Math.max(8, Math.min(100, params.count || 24));
    const length = Math.max(1, Math.min(15, params.length || 5));
    const variation = Math.max(0, Math.min(2, params.variation || 0));

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
    const nodeCount = Math.max(10, Math.min(100, params.nodes || 20));
    const connectionProb = Math.max(0.1, Math.min(0.8, params.connection_probability || 0.3));
    const bounds = params.bounds || [-5, 5];

    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push([
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * (bounds[1] - bounds[0]),
        (Math.random() - 0.5) * 4
      ]);
    }

    let connectionCount = 0;
    const maxConnections = 500;

    // Connect nodes with early termination
    for (let i = 0; i < nodes.length && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < nodes.length && connectionCount < maxConnections; j++) {
        if (Math.random() < connectionProb) {
          lines.push({
            points: [nodes[i], nodes[j]],
            color: "#509EF0",
            opacity: 0.5,
            lineWidth: 1.5
          });
          connectionCount++;
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
    });

    return lines;
  },

  spiral: (params) => {
    const lines = [];
    const count = Math.max(1, Math.min(10, params.count || 5));
    const turns = Math.max(1, Math.min(8, params.turns || 3));
    const radiusStart = Math.max(0.1, Math.min(5, params.radius_start || 0.5));
    const radiusEnd = Math.max(radiusStart, Math.min(10, params.radius_end || 5));
    const heightVar = Math.max(0, Math.min(5, params.height_variation || 2));

    for (let i = 0; i < count; i++) {
      const points = [];
      const spiralTurns = turns * (1 + i * 0.1);
      const radiusScale = radiusStart + (radiusEnd - radiusStart) * (i / count);
      
      let pointCount = 0;
      const maxPoints = 300; // Limit points per spiral

      for (let t = 0; t <= spiralTurns * Math.PI * 2 && pointCount < maxPoints; t += 0.2) {
        const radius = radiusScale * (t / (spiralTurns * Math.PI * 2));
        const x = Math.cos(t) * radius;
        const y = Math.sin(t) * radius;
        const z = Math.sin(t * 2) * heightVar * (i / count);
        points.push([x, y, z]);
        pointCount++;
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
    const frequency = Math.max(0.5, Math.min(10, params.frequency || 2));
    const amplitude = Math.max(1, Math.min(10, params.amplitude || 3));
    const segments = Math.max(50, Math.min(200, params.segments || 100));
    const harmonics = Math.max(1, Math.min(5, params.harmonics || 3));

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
    const count = Math.max(50, Math.min(300, params.count || 100));
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
    const count = Math.max(1, Math.min(8, params.count || 5));
    const growthFactor = Math.max(0.05, Math.min(0.5, params.growth_factor || 0.2));
    const turns = Math.max(1, Math.min(5, params.turns || 3));
    const maxRadius = Math.max(3, Math.min(15, params.max_radius || 7));

    for (let i = 0; i < count; i++) {
      const points = [];
      const offset = (i / count) * Math.PI * 2;
      
      let pointCount = 0;
      const maxPoints = 200; // Safety limit

      for (let t = 0; t <= turns * Math.PI * 2 && pointCount < maxPoints; t += 0.2) {
        const radius = Math.exp(growthFactor * t);
        if (radius > maxRadius) break;

        const x = Math.cos(t + offset) * radius;
        const y = Math.sin(t + offset) * radius;
        const z = Math.sin(t * 0.5) * 2;
        points.push([x, y, z]);
        pointCount++;
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
    const particleCount = Math.max(20, Math.min(100, params.particle_count || 100));
    const flowComplexity = Math.max(1, Math.min(5, params.flow_complexity || 3));
    const traceLength = Math.max(20, Math.min(50, params.trace_length || 40));
    const noiseScale = Math.max(0.05, Math.min(0.3, params.noise_scale || 0.1));

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
    const seedPoints = Math.max(10, Math.min(30, params.seed_points || 20));
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

    // Simplified Voronoi approximation with reduced resolution
    const resolution = 20; // Reduced from 40
    const processedEdges = new Set();

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

        // Check right and down neighbors only to avoid duplicates
        const neighbors = [[gx + 1, gy], [gx, gy + 1]];

        neighbors.forEach(([nx, ny]) => {
          if (nx < resolution && ny < resolution) {
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
              const edgeKey = `${Math.min(gx, nx)},${Math.min(gy, ny)}-${Math.max(gx, nx)},${Math.max(gy, ny)}`;
              if (!processedEdges.has(edgeKey)) {
                processedEdges.add(edgeKey);
                lines.push({
                  points: [[x, y, 0], [nx_world, ny_world, 0]],
                  color: "#509EF0",
                  opacity: 0.5,
                  lineWidth: 1
                });
              }
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
    const pointCount = Math.max(15, Math.min(60, params.points || 40));
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

    // Simplified triangulation with connection limits
    const connections = new Set();
    const maxConnections = 200;
    let connectionCount = 0;

    for (let i = 0; i < points.length && connectionCount < maxConnections; i++) {
      const currentPoint = points[i];

      // Find nearest neighbors
      const distances = points.map((p, index) => ({
        index,
        distance: Math.sqrt(
          Math.pow(p[0] - currentPoint[0], 2) + 
          Math.pow(p[1] - currentPoint[1], 2)
        )
      })).filter(d => d.index !== i).sort((a, b) => a.distance - b.distance);

      // Connect to nearest neighbors
      for (let j = 0; j < Math.min(3, distances.length) && connectionCount < maxConnections; j++) {
        const neighborIndex = distances[j].index;
        const connectionKey = `${Math.min(i, neighborIndex)}-${Math.max(i, neighborIndex)}`;
        
        if (!connections.has(connectionKey)) {
          connections.add(connectionKey);
          const neighbor = points[neighborIndex];
          lines.push({
            points: [currentPoint, neighbor],
            color: "#509EF0",
            opacity: 0.6,
            lineWidth: 1
          });
          connectionCount++;
        }
      }
    }

    return lines;
  },

  mesh_deformation: (params) => {
    const lines = [];
    const gridSize = Math.max(5, Math.min(15, params.base_grid_size || 10));
    const deformationStrength = Math.max(0.5, Math.min(5, params.deformation_strength || 2));
    const deformationFrequency = Math.max(0.1, Math.min(2, params.deformation_frequency || 0.5));

    // Create deformed grid with larger spacing
    const spacing = 12 / gridSize;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = (i / gridSize - 0.5) * 12;
        const y = (j / gridSize - 0.5) * 12;

        // Apply deformation
        const deformX = x + Math.sin(y * deformationFrequency) * deformationStrength;
        const deformY = y + Math.cos(x * deformationFrequency) * deformationStrength;
        const deformZ = Math.sin(x * deformationFrequency) * Math.cos(y * deformationFrequency) * 0.5;

        // Connect to right neighbor
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

        // Connect to bottom neighbor
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
    const emitterCount = Math.max(1, Math.min(4, params.emitter_count || 3));
    const particlesPerEmitter = Math.max(20, Math.min(40, params.particles_per_emitter || 40));
    const velocityVariation = Math.max(0.5, Math.min(3, params.velocity_variation || 1.5));
    const lifeSpan = Math.max(20, Math.min(50, params.life_span || 35));

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

    return lines;
  },

  orbital_system: (params) => {
    const lines = [];
    const centralBodies = Math.max(1, Math.min(3, params.central_bodies || 2));
    const orbitingObjects = Math.max(10, Math.min(30, params.orbiting_objects || 20));
    const orbitEccentricity = Math.max(0, Math.min(0.8, params.orbit_eccentricity || 0.3));
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

      if (traceOrbits) {
        const orbitPoints = [];
        const steps = 48; // Reduced from 60

        for (let step = 0; step < steps; step++) {
          const t = (step / steps) * Math.PI * 2;

          // Elliptical orbit
          const r = orbitalRadius * (1 - orbitEccentricity * orbitEccentricity) / 
                   (1 + orbitEccentricity * Math.cos(t));

          const x = center[0] + Math.cos(t) * r;
          const y = center[1] + Math.sin(t) * r * Math.cos(0.2);
          const z = center[2] + Math.sin(t) * r * Math.sin(0.2);

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

// Enhanced generation function with comprehensive safety checks
function generateFromAlgorithms(algorithmData) {
  const allLines = [];
  const maxTotalLines = 5000; // Global limit to prevent memory issues
  const maxAlgorithms = 8; // Limit number of algorithms processed
  
  console.log(`Processing ${algorithmData.algorithms.length} algorithms`);

  // Validate algorithm data structure
  if (!algorithmData || !algorithmData.algorithms || !Array.isArray(algorithmData.algorithms)) {
    console.error('Invalid algorithm data structure');
    return {
      title: "Error",
      description: "Invalid algorithm data",
      lines: [],
      camera: { position: [8, 6, 10], lookAt: [0, 0, 0] },
      metadata: { error: "Invalid algorithm data structure" }
    };
  }

  // Limit number of algorithms to prevent overload
  const algorithmsToProcess = algorithmData.algorithms.slice(0, maxAlgorithms);
  
  algorithmsToProcess.forEach((algorithm, index) => {
    try {
      console.log(`Processing algorithm ${index + 1}: ${algorithm.type}`);
      
      // Validate algorithm structure
      if (!algorithm || typeof algorithm !== 'object' || !algorithm.type) {
        console.warn(`Invalid algorithm at index ${index}:`, algorithm);
        return;
      }

      // Check if we're approaching line limit
      if (allLines.length > maxTotalLines) {
        console.warn(`Stopping algorithm processing - line limit reached (${allLines.length})`);
        return;
      }

      // Validate algorithm type
      if (!algorithmGenerators[algorithm.type]) {
        console.warn(`Unknown algorithm type: ${algorithm.type}`);
        return;
      }

      // Validate parameters
      const params = algorithm.params || {};
      if (typeof params !== 'object') {
        console.warn(`Invalid parameters for ${algorithm.type}:`, params);
        return;
      }

      // Performance monitoring
      const startTime = Date.now();
      
      // Generate lines with error handling
      let lines = [];
      try {
        lines = algorithmGenerators[algorithm.type](params);
        
        // Validate generated lines
        if (!Array.isArray(lines)) {
          console.warn(`Algorithm ${algorithm.type} returned non-array:`, typeof lines);
          return;
        }

        // Filter and validate each line
        const validLines = lines.filter(line => {
          if (!line || typeof line !== 'object') return false;
          if (!Array.isArray(line.points)) return false;
          if (line.points.length < 2) return false;
          
          // Validate all points in the line
          return line.points.every(point => {
            if (!Array.isArray(point) || point.length !== 3) return false;
            return point.every(coord => typeof coord === 'number' && isFinite(coord));
          });
        });

        if (validLines.length !== lines.length) {
          console.warn(`Filtered ${lines.length - validLines.length} invalid lines from ${algorithm.type}`);
        }

        lines = validLines;

      } catch (error) {
        console.error(`Error generating ${algorithm.type}:`, error);
        return;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance warning
      if (duration > 1000) {
        console.warn(`Algorithm ${algorithm.type} took ${duration}ms to generate ${lines.length} lines`);
      }

      // Check line count limits
      if (lines.length > 1000) {
        console.warn(`Algorithm ${algorithm.type} generated too many lines (${lines.length}), truncating to 1000`);
        lines = lines.slice(0, 1000);
      }

      // Check if adding these lines would exceed global limit
      if (allLines.length + lines.length > maxTotalLines) {
        const remainingSlots = maxTotalLines - allLines.length;
        console.warn(`Truncating ${algorithm.type} lines from ${lines.length} to ${remainingSlots} to stay within global limit`);
        lines = lines.slice(0, remainingSlots);
      }

      allLines.push(...lines);
      console.log(`Generated ${lines.length} lines from ${algorithm.type} (total: ${allLines.length})`);

    } catch (error) {
      console.error(`Fatal error processing algorithm ${algorithm.type}:`, error);
      // Continue processing other algorithms
    }
  });

  console.log(`Total lines generated: ${allLines.length}`);

  // Final validation of output
  const metadata = {
    generated_at: new Date().toISOString(),
    algorithms_used: algorithmsToProcess.map(a => a.type),
    total_lines: allLines.length,
    algorithms_processed: algorithmsToProcess.length,
    algorithms_requested: algorithmData.algorithms.length
  };

  // Add performance warnings to metadata
  if (allLines.length > 3000) {
    metadata.performance_warning = "High line count may impact rendering performance";
  }

  if (algorithmsToProcess.length < algorithmData.algorithms.length) {
    metadata.truncation_warning = `Only processed ${algorithmsToProcess.length} of ${algorithmData.algorithms.length} algorithms`;
  }

  return {
    title: algorithmData.title || "Generated Art",
    description: algorithmData.description || "Algorithmic line art",
    lines: allLines,
    camera: validateCamera(algorithmData.camera),
    metadata: metadata
  };
}

// Camera validation function
function validateCamera(camera) {
  const defaultCamera = { position: [8, 6, 10], lookAt: [0, 0, 0] };
  
  if (!camera || typeof camera !== 'object') {
    return defaultCamera;
  }

  // Validate position
  if (!Array.isArray(camera.position) || camera.position.length !== 3) {
    camera.position = defaultCamera.position;
  } else {
    camera.position = camera.position.map(coord => {
      const num = Number(coord);
      return isFinite(num) ? Math.max(-50, Math.min(50, num)) : defaultCamera.position[0];
    });
  }

  // Validate lookAt
  if (!Array.isArray(camera.lookAt) || camera.lookAt.length !== 3) {
    camera.lookAt = defaultCamera.lookAt;
  } else {
    camera.lookAt = camera.lookAt.map(coord => {
      const num = Number(coord);
      return isFinite(num) ? Math.max(-20, Math.min(20, num)) : 0;
    });
  }

  return camera;
}
