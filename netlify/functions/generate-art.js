exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: 'Method Not Allowed',
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }

  // Handle preflight requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    
    if (!prompt || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20250514', // Claude 4
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are generating Three.js line art parameters for: "${prompt}".

AESTHETIC REFERENCE: Create sophisticated technical diagrams similar to scientific instruments, astronomical charts, engineering schematics, radar displays, oscilloscope patterns, and mathematical visualizations. Think:
- Scientific instrument readouts and measurement tools
- Astronomical star charts and orbital mechanics diagrams  
- Engineering blueprints and technical schematics
- Radar/sonar displays with concentric rings and sweep patterns
- Oscilloscope waveforms and signal analysis patterns
- Mathematical function plots and geometric constructions
- Navigation charts and coordinate systems
- Data visualization dashboards and monitoring displays

VISUAL STYLE:
- Monochromatic blue palette (#0066cc, #4d9fff, #1a53cc, #6bb3ff, #0040a0)
- Clean, precise lines suggesting technical accuracy
- Mix of geometric grids, concentric circles, and flowing curves
- Layered information density - background grids with foreground details
- Scientific typography aesthetic (though we're only doing lines)
- High contrast between line weights for hierarchy
- Subtle opacity variations to create depth without losing clarity

TECHNICAL REQUIREMENTS:
- Generate 8-15 lines for rich detail
- Each line 6-25 points for smooth precision curves
- Coordinates between -6 and 6 for optimal framing
- Line weights: 0.5-2.5 for technical precision
- Opacity range: 0.4-0.95 for layered visibility
- Favor mathematical relationships: golden ratio, fibonacci spirals, polar coordinates

PATTERN TYPES TO CONSIDER:
- Concentric measurement rings with calibration marks
- Grid systems with coordinate overlays  
- Spiral patterns (logarithmic, Archimedean, fibonacci)
- Waveform analysis patterns
- Network topology diagrams
- Geometric construction lines
- Polar coordinate systems
- Signal processing visualizations

OUTPUT FORMAT (JSON only, no other text):
{
  "lines": [
    {
      "points": [[x1,y1,z1], [x2,y2,z2], ...],
      "color": "#blue_hex_value",
      "opacity": 0.4-0.95,
      "lineWidth": 0.5-2.5
    }
  ],
  "camera": {
    "position": [8, 6, 10],
    "lookAt": [0, 0, 0]
  },
  "animation": {
    "rotate": true/false,
    "speed": 0.003-0.012,
    "axis": "y|all"
  },
  "title": "Technical/scientific name",
  "description": "Brief technical description with scientific context"
}

Create precise, technical line art that feels like sophisticated scientific instrumentation while maintaining aesthetic beauty. Respond with ONLY the JSON object, no additional text.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response from Claude API');
    }

    const content = data.content[0].text;
    
    // Extract JSON from Claude's response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      // Sometimes Claude puts the JSON in code blocks
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonMatch = [codeBlockMatch[1]];
      }
    }
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    let params;
    try {
      params = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }

    // Validate the structure
    if (!params.lines || !Array.isArray(params.lines)) {
      throw new Error('Invalid response structure: missing lines array');
    }

    // Add some safety defaults if missing
    if (!params.camera) {
      params.camera = {
        position: [8, 6, 10],
        lookAt: [0, 0, 0]
      };
    }

    if (!params.animation) {
      params.animation = {
        rotate: true,
        speed: 0.008,
        axis: "y"
      };
    }

    if (!params.title) {
      params.title = "Generated Technical Diagram";
    }

    if (!params.description) {
      params.description = "AI-generated technical line art";
    }

    // Validate and clamp coordinates to safe ranges
    params.lines.forEach((line, lineIndex) => {
      if (!line.points || !Array.isArray(line.points)) {
        throw new Error(`Line ${lineIndex} missing points array`);
      }
      
      line.points = line.points.map(point => {
        if (!Array.isArray(point) || point.length !== 3) {
          return [0, 0, 0]; // Default safe point
        }
        return [
          Math.max(-8, Math.min(8, parseFloat(point[0]) || 0)),
          Math.max(-8, Math.min(8, parseFloat(point[1]) || 0)),
          Math.max(-8, Math.min(8, parseFloat(point[2]) || 0))
        ];
      });

      // Ensure required properties with defaults
      line.color = line.color || '#4d9fff';
      line.opacity = Math.max(0.1, Math.min(1, parseFloat(line.opacity) || 0.7));
      line.lineWidth = Math.max(0.1, Math.min(5, parseFloat(line.lineWidth) || 1));
    });

    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};