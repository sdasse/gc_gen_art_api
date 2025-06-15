exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Generate Three.js line art parameters for: "${prompt}". 
          Create abstract geometric line art. Respond with only JSON:
          {
            "lines": [
              {
                "points": [[x1,y1,z1], [x2,y2,z2], ...],
                "color": "#hexcolor",
                "opacity": 0.1-1.0,
                "lineWidth": 1-5
              }
            ],
            "camera": {
              "position": [x, y, z],
              "lookAt": [x, y, z]
            },
            "animation": {
              "rotate": true/false,
              "speed": 0.001-0.02,
              "axis": "x|y|z|all"
            },
            "title": "Art piece name",
            "description": "Brief artistic description"
          }
          Keep coordinates between -10 and 10. Create 3-15 lines. Use interesting geometric patterns.`
        }]
      })
    });

    const data = await response.json();
    const content = data.content[0].text;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const params = JSON.parse(jsonMatch[0]);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(params)
      };
    }
    
    throw new Error('No valid JSON in response');
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};