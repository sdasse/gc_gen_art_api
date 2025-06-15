
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
        model: 'claude-3-5-sonnet-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are generating Three.js line art parameters for: "${prompt}".

Generate a JSON response with this exact structure:
{
  "title": "Brief descriptive title",
  "description": "Technical description of the visualization",
  "lines": [
    {
      "points": [[x1,y1,z1], [x2,y2,z2], [x3,y3,z3]],
      "color": "#509EF0",
      "opacity": 0.7,
      "lineWidth": 1
    }
  ],
  "camera": {
    "position": [8, 6, 10],
    "lookAt": [0, 0, 0]
  },
  "animation": {
    "rotate": false,
    "speed": 0.008,
    "axis": "y"
  }
}

Guidelines:
- Create multiple lines with 3-10 points each
- Use coordinates between -10 and 10 for all axes
- Generate 5-20 lines total
- Use technical/engineering aesthetic
- Colors should be variations of blue (#509EF0, #3080D0, #70B0F0)
- Create patterns that match the prompt theme
- For radar: circular/radial patterns
- For oscilloscope: wave patterns  
- For navigation: grid/coordinate systems
- For molecular: connected node structures

Return only valid JSON, no other text.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeData = await response.json();
    let generatedContent = claudeData.content[0].text;

    // Clean up the response to ensure valid JSON
    generatedContent = generatedContent.trim();
    if (generatedContent.startsWith('```json')) {
      generatedContent = generatedContent.replace(/```json\n?/, '').replace(/```$/, '');
    }
    if (generatedContent.startsWith('```')) {
      generatedContent = generatedContent.replace(/```\n?/, '').replace(/```$/, '');
    }

    let artData;
    try {
      artData = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback: create a simple default structure
      artData = {
        title: "Generated Technical Visualization",
        description: "AI-generated line art based on prompt",
        lines: [
          {
            points: [[-5, -5, 0], [5, 5, 0], [5, -5, 0], [-5, 5, 0]],
            color: "#509EF0",
            opacity: 0.7,
            lineWidth: 1
          }
        ],
        camera: {
          position: [8, 6, 10],
          lookAt: [0, 0, 0]
        },
        animation: {
          rotate: false,
          speed: 0.008,
          axis: "y"
        }
      };
    }

    // Validate and sanitize the data
    if (!artData.lines || !Array.isArray(artData.lines)) {
      artData.lines = [];
    }

    // Ensure each line has valid structure
    artData.lines = artData.lines.filter(line => {
      return line.points && Array.isArray(line.points) && line.points.length >= 2;
    }).map(line => ({
      points: line.points.map(point => {
        if (Array.isArray(point) && point.length >= 3) {
          return [
            Math.max(-20, Math.min(20, Number(point[0]) || 0)),
            Math.max(-20, Math.min(20, Number(point[1]) || 0)),
            Math.max(-20, Math.min(20, Number(point[2]) || 0))
          ];
        }
        return [0, 0, 0];
      }),
      color: line.color || "#509EF0",
      opacity: Math.max(0.1, Math.min(1.0, Number(line.opacity) || 0.7)),
      lineWidth: Math.max(1, Math.min(5, Number(line.lineWidth) || 1))
    }));

    // Ensure camera settings are valid
    if (!artData.camera) artData.camera = {};
    if (!artData.camera.position || !Array.isArray(artData.camera.position)) {
      artData.camera.position = [8, 6, 10];
    }
    if (!artData.camera.lookAt || !Array.isArray(artData.camera.lookAt)) {
      artData.camera.lookAt = [0, 0, 0];
    }

    // Ensure animation settings are valid
    if (!artData.animation) artData.animation = {};
    artData.animation.rotate = Boolean(artData.animation.rotate);
    artData.animation.speed = Math.max(0.001, Math.min(0.1, Number(artData.animation.speed) || 0.008));
    artData.animation.axis = ['x', 'y', 'z', 'all'].includes(artData.animation.axis) ? artData.animation.axis : 'y';

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
        fallback: {
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
            position: [8, 6, 10],
            lookAt: [0, 0, 0]
          },
          animation: {
            rotate: false,
            speed: 0.008,
            axis: "y"
          }
        }
      })
    };
  }
};
