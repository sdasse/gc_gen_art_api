
// Enhanced API handler for generating art using Claude with varied composition approach
exports.handler = async (event, context) => {
  // Standard CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Generate art function called');

    const body = JSON.parse(event.body || '{}');
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Prompt is required and must be a non-empty string' })
      };
    }

    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    if (!claudeApiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable.' 
        })
      };
    }

    // Use enhanced Claude generation
    const algorithmData = await generateAlgorithmsWithClaude(prompt.trim(), claudeApiKey);
    const artData = generateFromAlgorithms(algorithmData);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(artData)
    };

  } catch (error) {
    console.error('Generation error:', error);

    // Ensure error message is properly serialized
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorDetails = error?.stack || error?.toString() || 'No additional details available';

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: `Generation failed: ${errorMessage}`,
        details: errorDetails,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// FIXED: Enhanced system prompt that only uses algorithms we actually implement
async function generateAlgorithmsWithClaude(userPrompt, apiKey) {
  // Enhanced validation (keeping your existing validation)
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    throw new Error('User prompt is required and must be a non-empty string');
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('API key is required and must be a non-empty string');
  }

  userPrompt = userPrompt.trim();
  if (userPrompt.length > 500) {
    console.warn('User prompt is very long, truncating to avoid token limits');
    userPrompt = userPrompt.substring(0, 500);
  }

  // FIXED: Enhanced system prompt with only implemented algorithms
  const systemPrompt = `You are an artistic technical diagram generator. Create varied, surprising visualizations with random elements and consistent line styling.

For the concept "${userPrompt}", return ONLY this JSON structure with 3-6 algorithms chosen for maximum variety:

{
  "title": "Technical diagram name",
  "description": "What this represents",
  "algorithms": [
    // AVAILABLE ALGORITHMS (all implemented):
    // STRUCTURAL: "grid", "circles", "radial_lines", "network", "spiral"
    // COMPLEX: "wave", "logarithmic_spiral", "scatter"
    
    {
      "type": "circles",
      "params": {
        "center": [0, 0],
        "count": 15,
        "max_radius": 5,
        "min_radius": 0.5,
        "style": "clean"
      }
    },
    {
      "type": "radial_lines", 
      "params": {
        "center": [2, -1],
        "count": 24,
        "length": 4,
        "variation": 0.3
      }
    },
    {
      "type": "scatter",
      "params": {
        "count": 200,
        "distribution": "clustered",
        "bounds": [-6, 6]
      }
    }
    // Add 0-3 more algorithms for 3-6 total
  ],
  "style": {
    "line_weight": 1.5,
    "variation": "high",
    "multiple_centers": true,
    "mixed_scales": true
  },
  "camera": {"position": [8, 6, 10], "lookAt": [0, 0, 0]}
}

VARIATION RULES:
- Use MULTIPLE CENTERS: Place circles/radial_lines at different positions like [0,0], [3,-2], [-2,3]
- Use DIFFERENT SCALES: Same algorithm with different sizes (radius 2-8, count 10-30)
- MIX SIMPLE + COMPLEX: Combine 2-3 simple algorithms (circles, radial_lines) with 1-2 complex ones
- CREATE DEPTH: Overlap elements at different positions and scales
- ADD RANDOMNESS: Use "clustered" scatter, high "variation" in radial_lines, "noise" in grids

GOOD COMBINATIONS:
- circles (center [0,0], large) + circles (center [4,-2], small) + radial_lines + scatter
- grid (with noise) + network + circles (multiple centers) + wave  
- spiral + circles (concentric) + logarithmic_spiral + scatter
- radial_lines + circles (small, scattered) + network + grid

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
      
      // IMPROVED: Better fallback with variation
      console.warn('Using improved fallback algorithm set');
      algorithmData = {
        title: "Varied Technical Art",
        description: "Multi-scale algorithmic visualization",
        algorithms: [
          {
            type: "circles",
            params: { center: [0, 0], count: 12, max_radius: 5, min_radius: 0.3 }
          },
          {
            type: "circles", 
            params: { center: [3, -2], count: 8, max_radius: 2.5, min_radius: 0.5 }
          },
          {
            type: "radial_lines",
            params: { center: [-2, 3], count: 20, length: 4, variation: 0.4 }
          },
          {
            type: "scatter",
            params: { count: 150, distribution: "clustered", bounds: [-6, 6] }
          },
          {
            type: "network",
            params: { nodes: 25, connection_probability: 0.3, bounds: [-4, 4] }
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
    if (algorithmData.algorithms.length > 6) {
      console.warn(`Claude generated ${algorithmData.algorithms.length} algorithms, limiting to 6`);
      algorithmData.algorithms = algorithmData.algorithms.slice(0, 6);
    }

    // Validate each algorithm and filter out invalid ones
    algorithmData.algorithms = algorithmData.algorithms.filter(alg => {
      if (!alg || typeof alg !== 'object' || !alg.type || typeof alg.type !== 'string') {
        console.warn('Filtering invalid algorithm:', alg);
        return false;
      }
      
      // Check if algorithm type exists in our generators
      const validTypes = [
        'grid', 'circles', 'radial_lines', 'network', 'spiral', 'wave', 'scatter',
        'logarithmic_spiral'
      ];
      
      if (!validTypes.includes(alg.type)) {
        console.warn(`Unknown algorithm type: ${alg.type}, filtering out`);
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

// FIXED: Robust algorithms with comprehensive error handling
const enhancedAlgorithmGenerators = {
  // SAFE: Enhanced circles with better variation
  circles: (params) => {
    try {
      const lines = [];
      const center = Array.isArray(params.center) && params.center.length >= 2 ? params.center : [0, 0];
      const count = Math.max(5, Math.min(30, Number(params.count) || 10));
      const maxRadius = Math.max(1, Math.min(8, Number(params.max_radius) || 5));
      const minRadius = Math.max(0.1, Math.min(maxRadius, Number(params.min_radius) || 0.5));
      const style = params.style || "clean";

      // Add some randomization to make each generation unique
      const actualCount = count + Math.floor((Math.random() - 0.5) * 4);
      
      for (let i = 0; i < actualCount; i++) {
        const radius = minRadius + (maxRadius - minRadius) * (i / actualCount);
        const points = [];
        const segments = Math.max(16, Math.min(64, Math.floor(radius * 10)));
        
        // Add organic variation for some circles
        const variation = (style === "organic" || Math.random() < 0.2) ? 0.05 : 0;

        for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          const r = radius + (Math.random() - 0.5) * variation;
          points.push([
            center[0] + Math.cos(angle) * r,
            center[1] + Math.sin(angle) * r,
            0
          ]);
        }

        // Vary opacity and occasionally make lines dashed
        const opacity = 0.4 + (i / actualCount) * 0.4 + Math.random() * 0.1;
        const isDashed = Math.random() < 0.15; // 15% chance of dashed

        lines.push({
          points: points,
          color: "#509EF0",
          opacity: Math.min(0.9, opacity),
          lineWidth: 1.5,
          isDashed: isDashed
        });
      }

      // Sometimes add radial fill lines
      if (Math.random() < 0.3) {
        const numRadial = 8 + Math.floor(Math.random() * 16);
        for (let i = 0; i < numRadial; i++) {
          const angle = (i / numRadial) * Math.PI * 2;
          lines.push({
            points: [
              [center[0], center[1], 0],
              [center[0] + Math.cos(angle) * maxRadius, center[1] + Math.sin(angle) * maxRadius, 0]
            ],
            color: "#509EF0",
            opacity: 0.3,
            lineWidth: 1.5,
            isDashed: Math.random() < 0.4 // Higher chance for radial lines to be dashed
          });
        }
      }

      return lines;
    } catch (error) {
      console.error('Error in circles algorithm:', error);
      return [];
    }
  },

  // SAFE: Enhanced radial_lines with arrows
  radial_lines: (params) => {
    try {
      const lines = [];
      const center = Array.isArray(params.center) && params.center.length >= 2 ? params.center : [0, 0];
      const count = Math.max(8, Math.min(72, Number(params.count) || 24));
      const length = Math.max(1, Math.min(10, Number(params.length) || 5));
      const variation = Math.max(0, Math.min(2, Number(params.variation) || 0));

      // Add some randomness to count
      const actualCount = count + Math.floor((Math.random() - 0.5) * 8);

      for (let i = 0; i < actualCount; i++) {
        const angle = (i / actualCount) * Math.PI * 2;
        const lineLength = length + (Math.random() - 0.5) * variation;
        const isDashed = Math.random() < 0.2;
        const hasArrow = Math.random() < 0.3; // 30% chance of arrow

        const endX = center[0] + Math.cos(angle) * lineLength;
        const endY = center[1] + Math.sin(angle) * lineLength;

        // Main line
        lines.push({
          points: [
            [center[0], center[1], 0],
            [endX, endY, 0]
          ],
          color: "#509EF0",
          opacity: 0.6 + Math.random() * 0.2,
          lineWidth: 1.5,
          isDashed: isDashed
        });

        // Add arrow head if selected
        if (hasArrow && lineLength > 0.5) {
          const arrowSize = Math.min(0.15, lineLength * 0.1);
          lines.push({
            points: [
              [endX, endY, 0],
              [endX - Math.cos(angle - 0.3) * arrowSize, endY - Math.sin(angle - 0.3) * arrowSize, 0]
            ],
            color: "#509EF0",
            opacity: 0.8,
            lineWidth: 1.5
          });
          lines.push({
            points: [
              [endX, endY, 0],
              [endX - Math.cos(angle + 0.3) * arrowSize, endY - Math.sin(angle + 0.3) * arrowSize, 0]
            ],
            color: "#509EF0",
            opacity: 0.8,
            lineWidth: 1.5
          });
        }
      }

      return lines;
    } catch (error) {
      console.error('Error in radial_lines algorithm:', error);
      return [];
    }
  },

  // SAFE: Enhanced scatter with small 3D-like markers
  scatter: (params) => {
    try {
      const lines = [];
      const count = Math.max(50, Math.min(400, Number(params.count) || 100));
      const distribution = params.distribution || "random";
      const bounds = Array.isArray(params.bounds) ? params.bounds : [-5, 5];
      const markerStyle = params.marker_style || "mixed"; // "cross", "circle", "square", "mixed"

      for (let i = 0; i < count; i++) {
        let x, y, z;

        // Distribution logic
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

        // Enhanced markers with variation
        const size = 0.03 + Math.random() * 0.04;
        const currentMarkerStyle = markerStyle === "mixed" ? 
          ["cross", "circle", "square"][Math.floor(Math.random() * 3)] : markerStyle;
        const isDashed = Math.random() < 0.1;

        if (currentMarkerStyle === "cross") {
          lines.push({
            points: [[x-size, y, z], [x+size, y, z]],
            color: "#509EF0",
            opacity: 0.7 + Math.random() * 0.2,
            lineWidth: 1.5,
            isDashed: isDashed
          });
          lines.push({
            points: [[x, y-size, z], [x, y+size, z]],
            color: "#509EF0",
            opacity: 0.7 + Math.random() * 0.2,
            lineWidth: 1.5,
            isDashed: isDashed
          });
        } else if (currentMarkerStyle === "circle") {
          const circlePoints = [];
          const segments = 8;
          for (let j = 0; j <= segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            circlePoints.push([
              x + Math.cos(angle) * size,
              y + Math.sin(angle) * size,
              z
            ]);
          }
          lines.push({
            points: circlePoints,
            color: "#509EF0",
            opacity: 0.6 + Math.random() * 0.2,
            lineWidth: 1.5,
            isDashed: isDashed
          });
        } else if (currentMarkerStyle === "square") {
          const squarePoints = [
            [x-size, y-size, z], [x+size, y-size, z],
            [x+size, y+size, z], [x-size, y+size, z],
            [x-size, y-size, z]
          ];
          lines.push({
            points: squarePoints,
            color: "#509EF0",
            opacity: 0.6 + Math.random() * 0.2,
            lineWidth: 1.5,
            isDashed: isDashed
          });
        }
      }

      return lines;
    } catch (error) {
      console.error('Error in scatter algorithm:', error);
      return [];
    }
  },

  // SAFE: Grid algorithm with error handling
  grid: (params) => {
    try {
      const lines = [];
      const spacing = Math.max(0.1, Math.min(2, Number(params.spacing) || 0.5));
      const size = Math.max(2, Math.min(12, Number(params.size) || 8));
      const noise = Math.max(0, Math.min(1, Number(params.noise) || 0));

      for (let x = -size; x <= size; x += spacing) {
        const yOffset = noise * (Math.random() - 0.5);
        lines.push({
          points: [[x, -size + yOffset, 0], [x, size + yOffset, 0]],
          color: "#509EF0",
          opacity: 0.4,
          lineWidth: 1.5,
          isDashed: Math.random() < 0.1
        });
      }

      for (let y = -size; y <= size; y += spacing) {
        const xOffset = noise * (Math.random() - 0.5);
        lines.push({
          points: [[-size + xOffset, y, 0], [size + xOffset, y, 0]],
          color: "#509EF0",
          opacity: 0.4,
          lineWidth: 1.5,
          isDashed: Math.random() < 0.1
        });
      }

      return lines;
    } catch (error) {
      console.error('Error in grid algorithm:', error);
      return [];
    }
  },

  // SAFE: Network algorithm with error handling
  network: (params) => {
    try {
      const lines = [];
      const nodes = Math.max(5, Math.min(50, Number(params.nodes) || 20));
      const bounds = Array.isArray(params.bounds) ? params.bounds : [-5, 5];
      const connectionProb = Math.max(0.05, Math.min(0.8, Number(params.connection_probability) || 0.2));

      // Generate random nodes
      const nodePositions = [];
      for (let i = 0; i < nodes; i++) {
        nodePositions.push([
          (Math.random() - 0.5) * (bounds[1] - bounds[0]),
          (Math.random() - 0.5) * (bounds[1] - bounds[0]),
          (Math.random() - 0.5) * 2
        ]);
      }

      // Connect nodes based on probability
      for (let i = 0; i < nodes; i++) {
        for (let j = i + 1; j < nodes; j++) {
          if (Math.random() < connectionProb) {
            lines.push({
              points: [nodePositions[i], nodePositions[j]],
              color: "#509EF0",
              opacity: 0.5,
              lineWidth: 1.5,
              isDashed: Math.random() < 0.2
            });
          }
        }
      }

      return lines;
    } catch (error) {
      console.error('Error in network algorithm:', error);
      return [];
    }
  },

  // SAFE: Spiral algorithm with error handling
  spiral: (params) => {
    try {
      const lines = [];
      const turns = Math.max(1, Math.min(10, Number(params.turns) || 5));
      const maxRadius = Math.max(1, Math.min(10, Number(params.max_radius) || 6));
      const points = [];

      const totalPoints = turns * 50;
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const angle = t * turns * Math.PI * 2;
        const radius = t * maxRadius;

        points.push([
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          (Math.random() - 0.5) * 0.5
        ]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1.5,
        isDashed: Math.random() < 0.3
      });

      return lines;
    } catch (error) {
      console.error('Error in spiral algorithm:', error);
      return [];
    }
  },

  // SAFE: Wave algorithm with error handling
  wave: (params) => {
    try {
      const lines = [];
      const frequency = Math.max(0.5, Math.min(5, Number(params.frequency) || 2));
      const amplitude = Math.max(0.5, Math.min(6, Number(params.amplitude) || 3));
      const length = Math.max(4, Math.min(20, Number(params.length) || 12));
      const points = [];

      for (let x = -length/2; x <= length/2; x += 0.1) {
        const y = amplitude * Math.sin(frequency * x);
        points.push([x, y, 0]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });

      return lines;
    } catch (error) {
      console.error('Error in wave algorithm:', error);
      return [];
    }
  },

  // SAFE: Logarithmic spiral algorithm with error handling
  logarithmic_spiral: (params) => {
    try {
      const lines = [];
      const a = Math.max(0.1, Math.min(1, Number(params.growth_factor) || 0.3));
      const turns = Math.max(1, Math.min(8, Number(params.turns) || 4));
      const points = [];

      for (let theta = 0; theta <= turns * Math.PI * 2; theta += 0.1) {
        const r = a * Math.exp(0.2 * theta);
        if (r > 20) break; // Prevent infinite growth
        points.push([
          r * Math.cos(theta),
          r * Math.sin(theta),
          0
        ]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1.5
      });

      return lines;
    } catch (error) {
      console.error('Error in logarithmic_spiral algorithm:', error);
      return [];
    }
  }
};

// Enhanced line rendering function that handles dashed lines with comprehensive error handling
function generateFromAlgorithms(algorithmData) {
  const allLines = [];
  const maxTotalLines = 3000; // Reduced for better performance
  const maxAlgorithms = 6; // Allow more algorithms but smaller ones

  console.log(`Processing ${algorithmData.algorithms.length} algorithms`);

  if (!algorithmData || !algorithmData.algorithms || !Array.isArray(algorithmData.algorithms)) {
    console.error('Invalid algorithm data structure');
    return createFallbackVisualization();
  }

  const algorithmsToProcess = algorithmData.algorithms.slice(0, maxAlgorithms);

  algorithmsToProcess.forEach((algorithm, index) => {
    try {
      console.log(`Processing algorithm ${index + 1}: ${algorithm.type}`);

      if (!algorithm || typeof algorithm !== 'object' || !algorithm.type) {
        console.warn(`Invalid algorithm at index ${index}:`, algorithm);
        return;
      }

      if (allLines.length > maxTotalLines) {
        console.warn(`Stopping algorithm processing - line limit reached (${allLines.length})`);
        return;
      }

      if (!enhancedAlgorithmGenerators[algorithm.type]) {
        console.warn(`Unknown algorithm type: ${algorithm.type}`);
        return;
      }

      const params = algorithm.params || {};
      const startTime = Date.now();

      let lines = [];
      try {
        lines = enhancedAlgorithmGenerators[algorithm.type](params);

        if (!Array.isArray(lines)) {
          console.warn(`Algorithm ${algorithm.type} returned non-array:`, typeof lines);
          return;
        }

        // Enhanced line validation and processing
        const validLines = lines.filter(line => {
          try {
            if (!line || typeof line !== 'object') return false;
            if (!Array.isArray(line.points)) return false;
            if (line.points.length < 2) return false;

            return line.points.every(point => {
              if (!Array.isArray(point) || point.length !== 3) return false;
              return point.every(coord => typeof coord === 'number' && isFinite(coord));
            });
          } catch (validationError) {
            console.warn('Line validation error:', validationError);
            return false;
          }
        }).map(line => {
          try {
            // Ensure consistent line weight and process dashed lines
            const processedLine = {
              ...line,
              lineWidth: 1.5, // Force consistent line weight
              color: line.color || "#509EF0",
              opacity: Math.max(0.1, Math.min(1.0, Number(line.opacity) || 0.6))
            };

            // Handle dashed lines by creating segmented geometry
            if (line.isDashed && line.points.length > 1) {
              processedLine.isDashed = true;
              processedLine.dashArray = [0.1, 0.05]; // 10% dash, 5% gap relative to line length
            }

            return processedLine;
          } catch (processingError) {
            console.warn('Line processing error:', processingError);
            return {
              points: line.points,
              color: "#509EF0",
              opacity: 0.6,
              lineWidth: 1.5
            };
          }
        });

        lines = validLines;

      } catch (error) {
        console.error(`Error generating ${algorithm.type}:`, error);
        return;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration > 1000) {
        console.warn(`Algorithm ${algorithm.type} took ${duration}ms to generate ${lines.length} lines`);
      }

      // More generous per-algorithm limits since we're aiming for variety
      if (lines.length > 800) {
        console.warn(`Algorithm ${algorithm.type} generated too many lines (${lines.length}), truncating to 800`);
        lines = lines.slice(0, 800);
      }

      if (allLines.length + lines.length > maxTotalLines) {
        const remainingSlots = maxTotalLines - allLines.length;
        console.warn(`Truncating ${algorithm.type} lines from ${lines.length} to ${remainingSlots} to stay within global limit`);
        lines = lines.slice(0, remainingSlots);
      }

      allLines.push(...lines);
      console.log(`Generated ${lines.length} lines from ${algorithm.type} (total: ${allLines.length})`);

    } catch (error) {
      console.error(`Fatal error processing algorithm ${algorithm.type}:`, error);
    }
  });

  console.log(`Total lines generated: ${allLines.length}`);

  const metadata = {
    generated_at: new Date().toISOString(),
    algorithms_used: algorithmsToProcess.map(a => a.type),
    total_lines: allLines.length,
    algorithms_processed: algorithmsToProcess.length,
    algorithms_requested: algorithmData.algorithms.length,
    visual_style: algorithmData.visual_style || {},
    line_weight_standard: "1.5px",
    has_dashed_lines: allLines.some(line => line.isDashed),
    has_arrows: allLines.some(line => line.hasArrow),
    variation_level: "high"
  };

  if (allLines.length > 2500) {
    metadata.performance_warning = "High line count may impact rendering performance";
  }

  if (algorithmsToProcess.length < algorithmData.algorithms.length) {
    metadata.truncation_warning = `Only processed ${algorithmsToProcess.length} of ${algorithmData.algorithms.length} algorithms`;
  }

  return {
    title: algorithmData.title || "Generated Technical Art",
    description: algorithmData.description || "Varied algorithmic visualization with consistent styling",
    lines: allLines,
    camera: validateCamera(algorithmData.camera),
    metadata: metadata
  };
}

// Fallback visualization when algorithm data is invalid
function createFallbackVisualization() {
  console.warn('Creating fallback visualization');

  const fallbackLines = [];

  // Simple concentric circles
  for (let i = 1; i <= 8; i++) {
    const radius = i * 0.8;
    const points = [];
    const segments = 32;

    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      points.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      ]);
    }

    fallbackLines.push({
      points: points,
      color: "#509EF0",
      opacity: 0.6,
      lineWidth: 1.5,
      isDashed: i % 3 === 0 // Every third circle is dashed
    });
  }

  // Add some radial lines
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    fallbackLines.push({
      points: [
        [0, 0, 0],
        [Math.cos(angle) * 6, Math.sin(angle) * 6, 0]
      ],
      color: "#509EF0",
      opacity: 0.5,
      lineWidth: 1.5,
      isDashed: i % 4 === 0 // Every fourth line is dashed
    });
  }

  // Add some precision markers
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = (Math.random() - 0.5) * 10;
    const size = 0.05;

    // Cross marker
    fallbackLines.push({
      points: [[x - size, y, 0], [x + size, y, 0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
    fallbackLines.push({
      points: [[x, y - size, 0], [x, y + size, 0]],
      color: "#509EF0",
      opacity: 0.8,
      lineWidth: 1.5
    });
  }

  return {
    title: "Fallback Technical Art",
    description: "Default visualization with varied line styles",
    lines: fallbackLines,
    camera: { position: [8, 6, 10], lookAt: [0, 0, 0] },
    metadata: {
      generated_at: new Date().toISOString(),
      algorithms_used: ["fallback_concentric", "fallback_radial", "fallback_markers"],
      total_lines: fallbackLines.length,
      is_fallback: true,
      line_weight_standard: "1.5px"
    }
  };
}

function validateCamera(camera) {
  try {
    if (!camera || typeof camera !== 'object') {
      return { position: [8, 6, 10], lookAt: [0, 0, 0] };
    }

    const position = Array.isArray(camera.position) && camera.position.length === 3 && 
      camera.position.every(coord => typeof coord === 'number' && isFinite(coord))
      ? camera.position : [8, 6, 10];

    const lookAt = Array.isArray(camera.lookAt) && camera.lookAt.length === 3 && 
      camera.lookAt.every(coord => typeof coord === 'number' && isFinite(coord))
      ? camera.lookAt : [0, 0, 0];

    return { position, lookAt };
  } catch (error) {
    console.error('Error validating camera:', error);
    return { position: [8, 6, 10], lookAt: [0, 0, 0] };
  }
}
