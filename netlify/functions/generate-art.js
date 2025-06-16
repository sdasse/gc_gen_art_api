// New artistic algorithm generators with purposeful design
const artisticAlgorithms = {
  concentric_circles: (params) => {
    const lines = [];
    const center = params.center || [0, 0];
    const count = Math.min(Math.max(params.count || 12, 5), 25);
    const maxRadius = Math.max(params.max_radius || 5, 1);
    const style = params.style || "clean";
    const fillPattern = params.fill_pattern || "none";

    // Create main concentric circles
    for (let i = 1; i <= count; i++) {
      const radius = (i / count) * maxRadius;
      const points = [];
      const segments = Math.max(32, Math.floor(radius * 16));

      // Add slight organic variation for organic style
      const variation = style === "organic" ? 0.1 : 0;

      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const r = radius + (Math.random() - 0.5) * variation;
        points.push([
          center[0] + Math.cos(angle) * r,
          center[1] + Math.sin(angle) * r,
          0
        ]);
      }

      lines.push({
        points: points,
        color: "#509EF0",
        opacity: style === "technical" ? 0.8 : 0.6,
        lineWidth: 1.5
      });
    }

    // Add fill patterns
    if (fillPattern === "grid") {
      const gridSize = maxRadius * 2;
      const spacing = gridSize / 20;
      
      // Horizontal lines within largest circle
      for (let y = -maxRadius; y <= maxRadius; y += spacing) {
        const points = [];
        for (let x = -maxRadius; x <= maxRadius; x += spacing/4) {
          if (x*x + y*y <= maxRadius*maxRadius) {
            points.push([center[0] + x, center[1] + y, 0]);
          }
        }
        if (points.length > 1) {
          lines.push({
            points: points,
            color: "#509EF0",
            opacity: 0.3,
            lineWidth: 1
          });
        }
      }
    } else if (fillPattern === "radial") {
      // Radial lines from center
      const numRadial = 24;
      for (let i = 0; i < numRadial; i++) {
        const angle = (i / numRadial) * Math.PI * 2;
        lines.push({
          points: [
            [center[0], center[1], 0],
            [center[0] + Math.cos(angle) * maxRadius, center[1] + Math.sin(angle) * maxRadius, 0]
          ],
          color: "#509EF0",
          opacity: 0.4,
          lineWidth: 1
        });
      }
    }

    return lines;
  },

  radial_fan: (params) => {
    const lines = [];
    const center = params.center || [0, 0];
    const segments = Math.min(Math.max(params.segments || 36, 12), 72);
    const innerRadius = Math.max(params.inner_radius || 1, 0.5);
    const outerRadius = Math.max(params.outer_radius || 6, innerRadius);
    const spread = Math.min(Math.max(params.spread || Math.PI, Math.PI/4), Math.PI * 2);
    const startAngle = params.start_angle || -spread/2;

    for (let i = 0; i < segments; i++) {
      const angle = startAngle + (i / segments) * spread;
      const length = innerRadius + Math.random() * (outerRadius - innerRadius);
      
      lines.push({
        points: [
          [center[0] + Math.cos(angle) * innerRadius, center[1] + Math.sin(angle) * innerRadius, 0],
          [center[0] + Math.cos(angle) * length, center[1] + Math.sin(angle) * length, 0]
        ],
        color: "#509EF0",
        opacity: 0.7,
        lineWidth: 1.5
      });
    }

    return lines;
  },

  geometric_grid: (params) => {
    const lines = [];
    const size = Math.min(Math.max(params.size || 8, 4), 15);
    const spacing = Math.max(params.spacing || 0.5, 0.2);
    const variation = params.variation || "none"; // "none", "breaks", "organic"
    const halfSize = size / 2;

    // Horizontal lines
    for (let y = -halfSize; y <= halfSize; y += spacing) {
      const points = [];
      let skipNext = false;
      
      for (let x = -halfSize; x <= halfSize; x += spacing/4) {
        // Add artistic breaks
        if (variation === "breaks" && Math.random() < 0.02) {
          if (points.length > 1) {
            lines.push({
              points: [...points],
              color: "#509EF0",
              opacity: 0.6,
              lineWidth: 1.5
            });
          }
          points.length = 0;
          skipNext = true;
          continue;
        }
        
        if (skipNext) {
          skipNext = false;
          continue;
        }

        const yPos = variation === "organic" ? y + (Math.random() - 0.5) * 0.1 : y;
        points.push([x, yPos, 0]);
      }
      
      if (points.length > 1) {
        lines.push({
          points: points,
          color: "#509EF0",
          opacity: 0.6,
          lineWidth: 1.5
        });
      }
    }

    // Vertical lines
    for (let x = -halfSize; x <= halfSize; x += spacing) {
      const points = [];
      for (let y = -halfSize; y <= halfSize; y += spacing/4) {
        const xPos = variation === "organic" ? x + (Math.random() - 0.5) * 0.1 : x;
        points.push([xPos, y, 0]);
      }
      
      if (points.length > 1) {
        lines.push({
          points: points,
          color: "#509EF0",
          opacity: 0.6,
          lineWidth: 1.5
        });
      }
    }

    return lines;
  },

  clean_scatter: (params) => {
    const lines = [];
    const count = Math.min(Math.max(params.count || 150, 50), 300);
    const pattern = params.pattern || "exponential"; // "exponential", "clustered", "linear", "random"
    const bounds = params.bounds || [-6, 6];
    const showTrend = params.show_trend !== false;

    const points = [];

    // Generate points based on pattern
    for (let i = 0; i < count; i++) {
      let x, y;
      
      if (pattern === "exponential") {
        const t = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
        x = t;
        y = t > 0 ? Math.exp(t * 0.2) - 1 : (Math.random() - 0.5) * 2;
        y = Math.min(Math.max(y, bounds[0]), bounds[1]);
      } else if (pattern === "clustered") {
        const numClusters = 4;
        const clusterIndex = Math.floor(Math.random() * numClusters);
        const clusterCenters = [
          [-2, 2], [2, 2], [-2, -2], [2, -2]
        ];
        const center = clusterCenters[clusterIndex];
        x = center[0] + (Math.random() - 0.5) * 2;
        y = center[1] + (Math.random() - 0.5) * 2;
      } else if (pattern === "linear") {
        x = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
        y = x * 0.5 + (Math.random() - 0.5) * 2;
      } else {
        x = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
        y = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      }

      points.push([x, y]);
      
      // Create small cross for each point
      const size = 0.03;
      lines.push({
        points: [[x-size, y, 0], [x+size, y, 0]],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1
      });
      lines.push({
        points: [[x, y-size, 0], [x, y+size, 0]],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1
      });
    }

    // Add trend line for exponential/linear patterns
    if (showTrend && (pattern === "exponential" || pattern === "linear")) {
      const trendPoints = [];
      for (let x = bounds[0]; x <= bounds[1]; x += 0.2) {
        let y;
        if (pattern === "exponential") {
          y = x > 0 ? Math.exp(x * 0.2) - 1 : 0;
        } else {
          y = x * 0.5;
        }
        y = Math.min(Math.max(y, bounds[0]), bounds[1]);
        trendPoints.push([x, y, 0]);
      }
      
      lines.push({
        points: trendPoints,
        color: "#509EF0",
        opacity: 0.9,
        lineWidth: 2
      });
    }

    return lines;
  },

  wireframe_objects: (params) => {
    const lines = [];
    const objects = params.objects || [
      { type: "cube", position: [0, 0, 0], size: 2 },
      { type: "sphere", position: [3, 0, 0], size: 1.5 }
    ];

    objects.forEach(obj => {
      if (obj.type === "cube") {
        const s = obj.size / 2;
        const [x, y, z] = obj.position;
        
        // Cube edges
        const cubeEdges = [
          // Bottom face
          [[x-s, y-s, z-s], [x+s, y-s, z-s]],
          [[x+s, y-s, z-s], [x+s, y+s, z-s]],
          [[x+s, y+s, z-s], [x-s, y+s, z-s]],
          [[x-s, y+s, z-s], [x-s, y-s, z-s]],
          // Top face
          [[x-s, y-s, z+s], [x+s, y-s, z+s]],
          [[x+s, y-s, z+s], [x+s, y+s, z+s]],
          [[x+s, y+s, z+s], [x-s, y+s, z+s]],
          [[x-s, y+s, z+s], [x-s, y-s, z+s]],
          // Vertical edges
          [[x-s, y-s, z-s], [x-s, y-s, z+s]],
          [[x+s, y-s, z-s], [x+s, y-s, z+s]],
          [[x+s, y+s, z-s], [x+s, y+s, z+s]],
          [[x-s, y+s, z-s], [x-s, y+s, z+s]]
        ];

        cubeEdges.forEach(edge => {
          lines.push({
            points: edge,
            color: "#509EF0",
            opacity: 0.8,
            lineWidth: 1.5
          });
        });

      } else if (obj.type === "sphere") {
        const [x, y, z] = obj.position;
        const radius = obj.size;
        
        // Sphere wireframe circles
        const segments = 24;
        
        // Horizontal circles
        for (let i = 0; i < 5; i++) {
          const elevation = (i - 2) * radius / 3;
          const circleRadius = Math.sqrt(radius * radius - elevation * elevation);
          if (circleRadius > 0) {
            const points = [];
            for (let j = 0; j <= segments; j++) {
              const angle = (j / segments) * Math.PI * 2;
              points.push([
                x + Math.cos(angle) * circleRadius,
                y + Math.sin(angle) * circleRadius,
                z + elevation
              ]);
            }
            lines.push({
              points: points,
              color: "#509EF0",
              opacity: 0.6,
              lineWidth: 1.5
            });
          }
        }

        // Vertical meridians
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const points = [];
          for (let j = 0; j <= segments; j++) {
            const phi = (j / segments) * Math.PI;
            points.push([
              x + Math.sin(phi) * Math.cos(angle) * radius,
              y + Math.sin(phi) * Math.sin(angle) * radius,
              z + Math.cos(phi) * radius
            ]);
          }
          lines.push({
            points: points,
            color: "#509EF0",
            opacity: 0.6,
            lineWidth: 1.5
          });
        }
      }
    });

    return lines;
  },

  cluster_formations: (params) => {
    const lines = [];
    const clusters = params.clusters || 5;
    const pointsPerCluster = Math.min(Math.max(params.points_per_cluster || 8, 4), 15);
    const clusterSpread = Math.max(params.cluster_spread || 1.5, 0.5);
    const bounds = params.bounds || [-6, 6];

    for (let c = 0; c < clusters; c++) {
      // Random cluster center
      const centerX = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      const centerY = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      const clusterRadius = 0.3 + Math.random() * 0.4;

      // Create cluster points
      for (let p = 0; p < pointsPerCluster; p++) {
        const angle = (p / pointsPerCluster) * Math.PI * 2 + Math.random() * 0.5;
        const distance = Math.random() * clusterSpread;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        // Create small circle for each point
        const circlePoints = [];
        const segments = 12;
        for (let i = 0; i <= segments; i++) {
          const circleAngle = (i / segments) * Math.PI * 2;
          circlePoints.push([
            x + Math.cos(circleAngle) * clusterRadius,
            y + Math.sin(circleAngle) * clusterRadius,
            0
          ]);
        }

        lines.push({
          points: circlePoints,
          color: "#509EF0",
          opacity: 0.7,
          lineWidth: 1.5
        });
      }

      // Connect some points within cluster
      if (pointsPerCluster > 3) {
        const connectionProbability = 0.3;
        for (let i = 0; i < pointsPerCluster; i++) {
          for (let j = i + 1; j < pointsPerCluster; j++) {
            if (Math.random() < connectionProbability) {
              const angle1 = (i / pointsPerCluster) * Math.PI * 2;
              const angle2 = (j / pointsPerCluster) * Math.PI * 2;
              const dist1 = Math.random() * clusterSpread;
              const dist2 = Math.random() * clusterSpread;
              
              lines.push({
                points: [
                  [centerX + Math.cos(angle1) * dist1, centerY + Math.sin(angle1) * dist1, 0],
                  [centerX + Math.cos(angle2) * dist2, centerY + Math.sin(angle2) * dist2, 0]
                ],
                color: "#509EF0",
                opacity: 0.4,
                lineWidth: 1
              });
            }
          }
        }
      }
    }

    return lines;
  },

  technical_annotations: (params) => {
    const lines = [];
    const annotations = params.annotations || 6;
    const bounds = params.bounds || [-5, 5];

    for (let i = 0; i < annotations; i++) {
      // Random annotation position
      const x = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      const y = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      
      // Leader line pointing to annotation point
      const leaderLength = 1 + Math.random() * 2;
      const leaderAngle = Math.random() * Math.PI * 2;
      const endX = x + Math.cos(leaderAngle) * leaderLength;
      const endY = y + Math.sin(leaderAngle) * leaderLength;

      // Main leader line
      lines.push({
        points: [[x, y, 0], [endX, endY, 0]],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });

      // Arrow at point
      const arrowSize = 0.1;
      const arrowAngle = leaderAngle + Math.PI;
      lines.push({
        points: [
          [x, y, 0],
          [x + Math.cos(arrowAngle + 0.3) * arrowSize, y + Math.sin(arrowAngle + 0.3) * arrowSize, 0]
        ],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });
      lines.push({
        points: [
          [x, y, 0],
          [x + Math.cos(arrowAngle - 0.3) * arrowSize, y + Math.sin(arrowAngle - 0.3) * arrowSize, 0]
        ],
        color: "#509EF0",
        opacity: 0.8,
        lineWidth: 1.5
      });

      // Annotation box
      const boxSize = 0.4;
      const boxPoints = [
        [endX - boxSize/2, endY - boxSize/4, 0],
        [endX + boxSize/2, endY - boxSize/4, 0],
        [endX + boxSize/2, endY + boxSize/4, 0],
        [endX - boxSize/2, endY + boxSize/4, 0],
        [endX - boxSize/2, endY - boxSize/4, 0]
      ];
      lines.push({
        points: boxPoints,
        color: "#509EF0",
        opacity: 0.6,
        lineWidth: 1
      });
    }

    return lines;
  },

  precision_markers: (params) => {
    const lines = [];
    const count = Math.min(Math.max(params.count || 20, 8), 40);
    const bounds = params.bounds || [-6, 6];
    const markerType = params.marker_type || "cross"; // "cross", "circle", "square"

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      const y = (Math.random() - 0.5) * (bounds[1] - bounds[0]);
      const size = 0.05 + Math.random() * 0.05;

      if (markerType === "cross") {
        lines.push({
          points: [[x - size, y, 0], [x + size, y, 0]],
          color: "#509EF0",
          opacity: 0.9,
          lineWidth: 1.5
        });
        lines.push({
          points: [[x, y - size, 0], [x, y + size, 0]],
          color: "#509EF0",
          opacity: 0.9,
          lineWidth: 1.5
        });
      } else if (markerType === "circle") {
        const circlePoints = [];
        const segments = 12;
        for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          circlePoints.push([
            x + Math.cos(angle) * size,
            y + Math.sin(angle) * size,
            0
          ]);
        }
        lines.push({
          points: circlePoints,
          color: "#509EF0",
          opacity: 0.8,
          lineWidth: 1
        });
      } else if (markerType === "square") {
        const squarePoints = [
          [x - size, y - size, 0],
          [x + size, y - size, 0],
          [x + size, y + size, 0],
          [x - size, y + size, 0],
          [x - size, y - size, 0]
        ];
        lines.push({
          points: squarePoints,
          color: "#509EF0",
          opacity: 0.8,
          lineWidth: 1
        });
      }
    }

    return lines;
  }
};
