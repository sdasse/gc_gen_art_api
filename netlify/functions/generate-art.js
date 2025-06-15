
// API handler for generating art using Claude with parameter-based approach
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

    // Use Claude to generate parameters that will create complex diagrams
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
  const systemPrompt = `You are a technical diagram parameter generator. Instead of creating individual lines, generate PARAMETERS that will create complex technical diagrams.

For the prompt "${userPrompt}", return JSON with these parameters:

{
  "title": "Brief title",
  "description": "What this represents",
  "pattern_type": "radar|circuit|network|grid|scatter|astronomical|molecular|architectural|mechanical",
  "density": "high|very_high|extreme",
  "layers": [
    {
      "type": "grid",
      "spacing": 0.2,
      "range": [-8, 8],
      "opacity": 0.3
    },
    {
      "type": "circles",
      "center": [0, 0],
      "count": 25,
      "max_radius": 7,
      "opacity": 0.6
    },
    {
      "type": "radial_lines", 
      "center": [0, 0],
      "count": 72,
      "length": 8,
      "opacity": 0.4
    },
    {
      "type": "scatter_points",
      "count": 500,
      "distribution": "exponential|random|clustered|spiral",
      "bounds": [-6, 6],
      "opacity": 0.8
    },
    {
      "type": "connection_lines",
      "node_count": 20,
      "connection_probability": 0.3,
      "opacity": 0.5
    },
    {
      "type": "spiral",
      "center": [0, 0],
      "turns": 5,
      "max_radius": 6,
      "points_per_turn": 50,
      "opacity": 0.7
    },
    {
      "type": "wave_pattern",
      "amplitude": 2,
      "frequency": 3,
      "length": 12,
      "count": 8,
      "opacity": 0.6
    }
  ],
  "camera": {"position": [0, 0, 12], "lookAt": [0, 0, 0]}
}

Choose 3-6 appropriate layer types based on the prompt. Make it DENSE - use high counts and small spacing values. Think about what technical systems the prompt relates to, then choose layers that would create that type of technical diagram.

PATTERN GUIDELINES:
- Radar/tracking: circles + radial_lines + scatter_points
- Circuit boards: grid + connection_lines + scatter_points
- Molecular structures: connection_lines + circles + scatter_points
- Astronomical: circles + spiral + scatter_points
- Architectural: grid + connection_lines + wave_pattern
- Mechanical: circles + radial_lines + grid

Always use high density settings (small spacing, high counts) to ensure complex, technical-looking results.`;

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
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Generate technical diagram parameters for: "${userPrompt}"`
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
      const params = JSON.parse(jsonMatch[0]);

      // Generate complex diagram from parameters
      const artData = generateFromParameters(params);

      // Add the raw response for debugging
      artData.rawResponse = generatedText;

      return artData;
    } else {
      throw new Error(`Could not parse JSON from Claude response. Raw response: ${generatedText}`);
    }

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error(`Claude API request failed: ${error.message}`);
  }
}

function generateFromParameters(params) {
  const lines = [];
  
  console.log('Generating from parameters:', params);
  
  params.layers.forEach(layer => {
    switch(layer.type) {
      case 'grid':
        // Generate dense grid lines
        for (let x = layer.range[0]; x <= layer.range[1]; x += layer.spacing) {
          lines.push({
            points: [[x, layer.range[0], 0], [x, layer.range[1], 0]],
            color: "#509EF0",
            opacity: layer.opacity || 0.3,
            lineWidth: 1.5
          });
        }
        for (let y = layer.range[0]; y <= layer.range[1]; y += layer.spacing) {
          lines.push({
            points: [[layer.range[0], y, 0], [layer.range[1], y, 0]],
            color: "#509EF0", 
            opacity: layer.opacity || 0.3,
            lineWidth: 1.5
          });
        }
        break;
        
      case 'circles':
        for (let i = 1; i <= layer.count; i++) {
          const radius = (i / layer.count) * layer.max_radius;
          const points = [];
          for (let j = 0; j <= 64; j++) {
            const angle = (j / 64) * Math.PI * 2;
            points.push([
              layer.center[0] + Math.cos(angle) * radius,
              layer.center[1] + Math.sin(angle) * radius,
              0
            ]);
          }
          lines.push({
            points: points,
            color: "#509EF0",
            opacity: layer.opacity || 0.6,
            lineWidth: 1.5
          });
        }
        break;
        
      case 'radial_lines':
        for (let i = 0; i < layer.count; i++) {
          const angle = (i / layer.count) * Math.PI * 2;
          lines.push({
            points: [
              [layer.center[0], layer.center[1], 0],
              [
                layer.center[0] + Math.cos(angle) * layer.length,
                layer.center[1] + Math.sin(angle) * layer.length,
                0
              ]
            ],
            color: "#509EF0",
            opacity: layer.opacity || 0.4,
            lineWidth: 1.5
          });
        }
        break;
        
      case 'scatter_points':
        for (let i = 0; i < layer.count; i++) {
          let x, y, z = 0;
          
          if (layer.distribution === 'exponential') {
            const t = (Math.random() - 0.5) * 8;
            x = t;
            y = t > 0 ? Math.exp(t * 0.3) - 1 : Math.random() * 2 - 1;
            y = Math.min(Math.max(y, layer.bounds[0]), layer.bounds[1]);
          } else if (layer.distribution === 'spiral') {
            const angle = (i / layer.count) * Math.PI * 8; // Multiple turns
            const radius = (i / layer.count) * Math.abs(layer.bounds[1] - layer.bounds[0]);
            x = Math.cos(angle) * radius;
            y = Math.sin(angle) * radius;
          } else if (layer.distribution === 'clustered') {
            // Create cluster centers and points around them
            const clusterCenter = (Math.random() - 0.5) * (layer.bounds[1] - layer.bounds[0]);
            x = clusterCenter + (Math.random() - 0.5) * 2;
            y = clusterCenter + (Math.random() - 0.5) * 2;
          } else {
            x = (Math.random() - 0.5) * (layer.bounds[1] - layer.bounds[0]);
            y = (Math.random() - 0.5) * (layer.bounds[1] - layer.bounds[0]);
          }
          
          // Create small cross for each point
          lines.push({
            points: [[x-0.1, y, z], [x+0.1, y, z]],
            color: "#509EF0",
            opacity: layer.opacity || 0.8,
            lineWidth: 1.5
          });
          lines.push({
            points: [[x, y-0.1, z], [x, y+0.1, z]],
            color: "#509EF0", 
            opacity: layer.opacity || 0.8,
            lineWidth: 1.5
          });
        }
        break;
        
      case 'connection_lines':
        // Generate random nodes and connect them
        const nodes = [];
        for (let i = 0; i < layer.node_count; i++) {
          nodes.push([
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 2
          ]);
        }
        
        // Connect nodes based on probability
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            if (Math.random() < layer.connection_probability) {
              lines.push({
                points: [nodes[i], nodes[j]],
                color: "#509EF0",
                opacity: layer.opacity || 0.5,
                lineWidth: 1.5
              });
            }
          }
        }
        break;

      case 'spiral':
        const points = [];
        for (let i = 0; i < layer.turns * layer.points_per_turn; i++) {
          const t = i / layer.points_per_turn;
          const angle = t * Math.PI * 2;
          const radius = (t / layer.turns) * layer.max_radius;
          points.push([
            layer.center[0] + Math.cos(angle) * radius,
            layer.center[1] + Math.sin(angle) * radius,
            0
          ]);
        }
        lines.push({
          points: points,
          color: "#509EF0",
          opacity: layer.opacity || 0.7,
          lineWidth: 1.5
        });
        break;

      case 'wave_pattern':
        for (let w = 0; w < layer.count; w++) {
          const points = [];
          const yOffset = (w - layer.count/2) * 0.5;
          for (let x = -layer.length/2; x <= layer.length/2; x += 0.1) {
            const y = yOffset + layer.amplitude * Math.sin(x * layer.frequency);
            points.push([x, y, 0]);
          }
          lines.push({
            points: points,
            color: "#509EF0",
            opacity: layer.opacity || 0.6,
            lineWidth: 1.5
          });
        }
        break;
    }
  });
  
  console.log(`Generated ${lines.length} lines from parameters`);
  
  return {
    title: params.title,
    description: params.description,
    lines: lines,
    camera: params.camera || { position: [0, 0, 12], lookAt: [0, 0, 0] }
  };
}
