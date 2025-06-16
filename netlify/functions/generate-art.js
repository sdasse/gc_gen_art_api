// Enhanced line rendering function that handles dashed lines
function generateFromAlgorithms(algorithmData) {
  const allLines = [];
  const maxTotalLines = 3000; // Reduced for better performance
  const maxAlgorithms = 6; // Allow more algorithms but smaller ones
  
  console.log(`Processing ${algorithmData.algorithms.length} algorithms`);

  // Use both original and new varied algorithms
  const combinedAlgorithms = { ...algorithmGenerators, ...variedAlgorithms };

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

      if (!combinedAlgorithms[algorithm.type]) {
        console.warn(`Unknown algorithm type: ${algorithm.type}`);
        return;
      }

      const params = algorithm.params || {};
      const startTime = Date.now();
      
      let lines = [];
      try {
        lines = combinedAlgorithms[algorithm.type](params);
        
        if (!Array.isArray(lines)) {
          console.warn(`Algorithm ${algorithm.type} returned non-array:`, typeof lines);
          return;
        }

        // Enhanced line validation and processing
        const validLines = lines.filter(line => {
          if (!line || typeof line !== 'object') return false;
          if (!Array.isArray(line.points)) return false;
          if (line.points.length < 2) return false;
          
          return line.points.every(point => {
            if (!Array.isArray(point) || point.length !== 3) return false;
            return point.every(coord => typeof coord === 'number' && isFinite(coord));
          });
        }).map(line => {
          // Ensure consistent line weight and process dashed lines
          const processedLine = {
            ...line,
            lineWidth: 1.5, // Force consistent line weight
            color: line.color || "#509EF0",
            opacity: Math.max(0.1, Math.min(1.0, line.opacity || 0.6))
          };

          // Handle dashed lines by creating segmented geometry
          if (line.dashed && line.points.length > 1) {
            processedLine.isDashed = true;
            processedLine.dashArray = [0.1, 0.05]; // 10% dash, 5% gap relative to line length
          }

          return processedLine;
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
