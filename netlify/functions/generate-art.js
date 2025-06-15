
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

    // Generate art data based on prompt
    const artData = generateArtFromPrompt(prompt.trim());

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
    
    // Always return a fallback response
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    };
  }
};

function generateArtFromPrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Circle patterns
  if (lowerPrompt.includes('circle')) {
    return generateCirclePattern(prompt);
  }
  
  // Square/rectangle patterns
  if (lowerPrompt.includes('square') || lowerPrompt.includes('rectangle') || lowerPrompt.includes('box')) {
    return generateSquarePattern(prompt);
  }
  
  // Wave patterns
  if (lowerPrompt.includes('wave') || lowerPrompt.includes('sine') || lowerPrompt.includes('oscilloscope')) {
    return generateWavePattern(prompt);
  }
  
  // Grid patterns
  if (lowerPrompt.includes('grid') || lowerPrompt.includes('mesh') || lowerPrompt.includes('network')) {
    return generateGridPattern(prompt);
  }
  
  // Spiral patterns
  if (lowerPrompt.includes('spiral') || lowerPrompt.includes('helix')) {
    return generateSpiralPattern(prompt);
  }
  
  // Default geometric pattern
  return generateDefaultPattern(prompt);
}

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
    camera: {
      position: [0, 0, 10],
      lookAt: [0, 0, 0]
    },
    animation: {
      rotate: false,
      speed: 0.008,
      axis: "z"
    }
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
    camera: {
      position: [0, 0, 15],
      lookAt: [0, 0, 0]
    },
    animation: {
      rotate: false,
      speed: 0.01,
      axis: "z"
    }
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
    camera: {
      position: [0, 0, 12],
      lookAt: [0, 0, 0]
    },
    animation: {
      rotate: true,
      speed: 0.01,
      axis: "z"
    }
  };
}

function generateDefaultPattern(prompt) {
  const lines = [];
  
  // Create a simple geometric pattern
  lines.push({
    points: [[-3, -3, 0], [3, 3, 0]],
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  lines.push({
    points: [[-3, 3, 0], [3, -3, 0]],
    color: "#509EF0",
    opacity: 0.8,
    lineWidth: 2
  });
  lines.push({
    points: [[0, -4, 0], [0, 4, 0]],
    color: "#70B0F0",
    opacity: 0.6,
    lineWidth: 1
  });
  lines.push({
    points: [[-4, 0, 0], [4, 0, 0]],
    color: "#70B0F0",
    opacity: 0.6,
    lineWidth: 1
  });
  
  return {
    title: `Generated: ${prompt}`,
    description: "Abstract geometric pattern",
    lines: lines,
    camera: {
      position: [0, 0, 10],
      lookAt: [0, 0, 0]
    },
    animation: {
      rotate: false,
      speed: 0.008,
      axis: "z"
    }
  };
}
