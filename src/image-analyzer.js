/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class ImageAnalyzer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    async analyze(img) {
        // Create a temporary canvas with ORIGINAL image dimensions for full-resolution analysis
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Store dimensions for analysis methods
        this.analysisWidth = img.width;
        this.analysisHeight = img.height;

        const results = {
            patterns: this.detectPatterns(data),
            textures: this.analyzeTextures(data),
            colors: this.analyzeColors(data),
            symmetry: this.analyzeSymmetry(data),
            noise: this.analyzeNoise(data),
            artifacts: this.detectArtifacts(data),
            jpegBlocks: this.detectJPEGBlocks(data),
            frequency: this.analyzeFrequency(data)
        };

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;

        return results;
    }

    detectPatterns(data) {
        let sharpEdges = 0;
        let repeatingPatterns = 0;
        const width = this.analysisWidth;
        const height = this.analysisHeight;

        // Détection des bords nets
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width - 1; x++) {
                const i = (y * width + x) * 4;
                const nextI = (y * width + x + 1) * 4;

                const diff = Math.abs(data[i] - data[nextI]) + 
                           Math.abs(data[i+1] - data[nextI+1]) +
                           Math.abs(data[i+2] - data[nextI+2]);
                
                if (diff > 100) sharpEdges++;
            }
        }

        // Détection des motifs répétitifs
        for (let y = 0; y < height - 8; y += 8) {
            for (let x = 0; x < width - 8; x += 8) {
                const patterns = new Set();
                for (let dy = 0; dy < 8; dy++) {
                    for (let dx = 0; dx < 8; dx++) {
                        const i = ((y + dy) * width + (x + dx)) * 4;
                        patterns.add(`${data[i]},${data[i+1]},${data[i+2]}`);
                    }
                }
                if (patterns.size < 32) { // Si moins de la moitié des pixels sont uniques
                    repeatingPatterns++;
                }
            }
        }

        return {
            sharpEdges: sharpEdges / (width * height),
            repeatingPatterns: repeatingPatterns / ((width * height) / 64)
        };
    }

    analyzeTextures(data) {
        let uniformity = 0;
        let complexity = 0;
        let unnaturalGradients = 0;
        const width = this.analysisWidth;
        const height = this.analysisHeight;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surrounding = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

                // Local variation analysis
                let localVariation = 0;
                let gradientCount = 0;
                surrounding.forEach(sIdx => {
                    const variation = Math.abs(data[idx] - data[sIdx]) +
                                    Math.abs(data[idx+1] - data[sIdx+1]) +
                                    Math.abs(data[idx+2] - data[sIdx+2]);
                    localVariation += variation;
                    if (variation > 0 && variation < 10) gradientCount++;
                });

                if (localVariation < 50) uniformity++;
                if (localVariation > 200) complexity++;
                if (gradientCount >= 3) unnaturalGradients++; // Detection of too perfect gradients
            }
        }

        const totalPixels = (width-2) * (height-2);
        return {
            uniformity: uniformity / totalPixels,
            complexity: complexity / totalPixels,
            unnaturalGradients: unnaturalGradients / totalPixels
        };
    }

    analyzeColors(data) {
        const colors = new Set();
        const saturations = [];
        const luminances = [];
        let colorBanding = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            // Unique colors analysis
            colors.add(`${Math.floor(r/8)},${Math.floor(g/8)},${Math.floor(b/8)}`);

            // Calculate saturation
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            saturations.push(saturation);

            // Calcul de la luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            luminances.push(luminance);

            // Détection du "color banding"
            if (i > 0 && i < data.length - 4) {
                const prevR = data[i-4];
                const prevG = data[i-3];
                const prevB = data[i-2];
                const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
                if (diff > 0 && diff < 5) colorBanding++;
            }
        }

        return {
            uniqueColors: colors.size,
            averageSaturation: saturations.reduce((a,b) => a + b) / saturations.length,
            saturationVariance: this.calculateVariance(saturations),
            luminanceVariance: this.calculateVariance(luminances),
            colorBanding: colorBanding / (data.length / 4)
        };
    }

    analyzeSymmetry(data) {
        const width = this.analysisWidth;
        const height = this.analysisHeight;
        let horizontalSymmetry = 0;
        let verticalSymmetry = 0;

        // Symétrie horizontale
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const leftIdx = (y * width + x) * 4;
                const rightIdx = (y * width + (width - 1 - x)) * 4;
                const diff = Math.abs(data[leftIdx] - data[rightIdx]) +
                           Math.abs(data[leftIdx+1] - data[rightIdx+1]) +
                           Math.abs(data[leftIdx+2] - data[rightIdx+2]);
                if (diff < 30) horizontalSymmetry++;
            }
        }

        // Symétrie verticale
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height / 2; y++) {
                const topIdx = (y * width + x) * 4;
                const bottomIdx = ((height - 1 - y) * width + x) * 4;
                const diff = Math.abs(data[topIdx] - data[bottomIdx]) +
                           Math.abs(data[topIdx+1] - data[bottomIdx+1]) +
                           Math.abs(data[topIdx+2] - data[bottomIdx+2]);
                if (diff < 30) verticalSymmetry++;
            }
        }

        return {
            horizontalSymmetry: horizontalSymmetry / ((width/2) * height),
            verticalSymmetry: verticalSymmetry / (width * (height/2))
        };
    }

    analyzeNoise(data) {
        let naturalNoise = 0;
        let artificialNoise = 0;
        const width = this.analysisWidth;
        const height = this.analysisHeight;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surrounding = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

                let variations = surrounding.map(sIdx => {
                    return Math.abs(data[idx] - data[sIdx]) +
                           Math.abs(data[idx+1] - data[sIdx+1]) +
                           Math.abs(data[idx+2] - data[sIdx+2]);
                });

                // Bruit naturel : variations légères et irrégulières
                if (Math.max(...variations) < 30 && Math.min(...variations) > 5) {
                    naturalNoise++;
                }
                // Bruit artificiel : variations régulières ou extrêmes
                else if (variations.every(v => Math.abs(v - variations[0]) < 2) || 
                         Math.max(...variations) > 100) {
                    artificialNoise++;
                }
            }
        }

        const totalPixels = (width-2) * (height-2);
        return {
            naturalNoise: naturalNoise / totalPixels,
            artificialNoise: artificialNoise / totalPixels
        };
    }

    detectArtifacts(data) {
        let compressionArtifacts = 0;
        let perfectEdges = 0;
        const width = this.analysisWidth;
        const height = this.analysisHeight;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surrounding = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

                // Détection d'artéfacts de compression
                let blockiness = 0;
                surrounding.forEach(sIdx => {
                    const diff = Math.abs(data[idx] - data[sIdx]) +
                               Math.abs(data[idx+1] - data[sIdx+1]) +
                               Math.abs(data[idx+2] - data[sIdx+2]);
                    if (diff === 0 || diff > 100) blockiness++;
                });
                if (blockiness >= 3) compressionArtifacts++;

                // Détection de bords trop parfaits
                let perfectEdgeCount = 0;
                for (let i = 0; i < surrounding.length - 1; i++) {
                    const diff1 = Math.abs(data[surrounding[i]] - data[surrounding[i+1]]);
                    if (diff1 === 0 || diff1 > 200) perfectEdgeCount++;
                }
                if (perfectEdgeCount >= 2) perfectEdges++;
            }
        }

        const totalPixels = (width-2) * (height-2);
        return {
            compressionArtifacts: compressionArtifacts / totalPixels,
            perfectEdges: perfectEdges / totalPixels
        };
    }

    detectJPEGBlocks(data) {
        // Detect 8x8 JPEG compression blocks
        const width = this.analysisWidth;
        const height = this.analysisHeight;
        let blockBoundaries = 0;
        let totalBlocks = 0;

        // Check for strong boundaries at 8-pixel intervals
        for (let y = 8; y < height; y += 8) {
            for (let x = 0; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const aboveIdx = ((y - 1) * width + x) * 4;

                const diff = Math.abs(data[idx] - data[aboveIdx]) +
                           Math.abs(data[idx+1] - data[aboveIdx+1]) +
                           Math.abs(data[idx+2] - data[aboveIdx+2]);

                if (diff > 15) blockBoundaries++;
                totalBlocks++;
            }
        }

        for (let x = 8; x < width; x += 8) {
            for (let y = 0; y < height - 1; y++) {
                const idx = (y * width + x) * 4;
                const leftIdx = (y * width + x - 1) * 4;

                const diff = Math.abs(data[idx] - data[leftIdx]) +
                           Math.abs(data[idx+1] - data[leftIdx+1]) +
                           Math.abs(data[idx+2] - data[leftIdx+2]);

                if (diff > 15) blockBoundaries++;
                totalBlocks++;
            }
        }

        return {
            blockiness: totalBlocks > 0 ? blockBoundaries / totalBlocks : 0
        };
    }

    analyzeFrequency(data) {
        // Analyze high-frequency content (detail level)
        const width = this.analysisWidth;
        const height = this.analysisHeight;
        let highFreq = 0;
        let lowFreq = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const neighbors = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

                let totalDiff = 0;
                neighbors.forEach(nIdx => {
                    totalDiff += Math.abs(data[idx] - data[nIdx]) +
                               Math.abs(data[idx+1] - data[nIdx+1]) +
                               Math.abs(data[idx+2] - data[nIdx+2]);
                });

                const avgDiff = totalDiff / 4;
                if (avgDiff > 30) highFreq++;
                else if (avgDiff < 5) lowFreq++;
            }
        }

        const totalPixels = (width - 2) * (height - 2);
        return {
            highFrequency: highFreq / totalPixels,
            lowFrequency: lowFreq / totalPixels,
            balance: highFreq / (lowFreq + highFreq + 1)
        };
    }

    calculateVariance(array) {
        const mean = array.reduce((a, b) => a + b) / array.length;
        return array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
    }

calculateScore(analysis) {
    let score = 0;

    // 1. Pattern Analysis (25 points)
    if (analysis.patterns.repeatingPatterns > 0.35) score += 12;
    if (analysis.patterns.sharpEdges > 0.18) score += 13;

    // 2. Texture Analysis (20 points)
    if (analysis.textures.uniformity > 0.7) score += 8;
    if (analysis.textures.unnaturalGradients > 0.45) score += 8;
    if (analysis.textures.complexity < 0.15) score += 4;

    // 3. Color Analysis (20 points)
    if (analysis.colors.colorBanding > 0.35) score += 7;
    if (analysis.colors.uniqueColors < 400) score += 7;
    if (analysis.colors.saturationVariance < 0.08) score += 6;

    // 4. Symmetry (8 points)
    if (analysis.symmetry.horizontalSymmetry > 0.85) score += 4;
    if (analysis.symmetry.verticalSymmetry > 0.85) score += 4;

    // 5. Noise Analysis (10 points)
    if (analysis.noise.artificialNoise > 0.35) score += 6;
    if (analysis.noise.naturalNoise < 0.03) score += 4;

    // 6. Artifacts (7 points)
    if (analysis.artifacts.compressionArtifacts > 0.35) score += 4;
    if (analysis.artifacts.perfectEdges > 0.25) score += 3;

    // 7. JPEG Blocks (5 points) - New
    if (analysis.jpegBlocks && analysis.jpegBlocks.blockiness < 0.05) {
        score += 5; // Too smooth, suspicious
    }

    // 8. Frequency Analysis (5 points) - New
    if (analysis.frequency) {
        if (analysis.frequency.balance < 0.15) score += 3; // Too uniform
        if (analysis.frequency.lowFrequency > 0.6) score += 2; // Overly smooth
    }

    // Vérification supplémentaire pour les images de type événementiel
    if (this.detectEventPhoto(analysis)) {
        score = Math.max(8, score * 0.45); // Réduction plus agressive
    }

    return Math.min(100, Math.max(0, score));
}

detectEventPhoto(analysis) {
    // Critères plus stricts pour identifier une photo réelle
    return (
        analysis.textures.complexity > 0.35 && // Textures plus complexes
        analysis.noise.naturalNoise > 0.15 && // Plus de bruit naturel
        analysis.colors.saturationVariance > 0.15 && // Variation de couleurs plus naturelle
        (analysis.symmetry.horizontalSymmetry < 0.6 || 
         analysis.symmetry.verticalSymmetry < 0.6) // Moins de symétrie
    );
}

 getIndicators(analysis) {
        const indicators = [];

	// Patterns
	if (analysis.patterns.repeatingPatterns > 0.35) {
		indicators.push("Highly suspicious repetitive patterns");
	} else if (analysis.patterns.repeatingPatterns > 0.3) {
		indicators.push("Suspicious repetitive patterns");
	}

	if (analysis.patterns.sharpEdges > 0.18) {
		indicators.push("Artificial sharp edges detected");
	} else if (analysis.patterns.sharpEdges > 0.1) {
		indicators.push("Significant presence of sharp edges");
	}

	// Textures
	if (analysis.textures.uniformity > 0.7) {
		indicators.push("Abnormally uniform textures");
	} else if (analysis.textures.uniformity > 0.6) {
		indicators.push("Suspicious texture uniformity");
	}

	if (analysis.textures.unnaturalGradients > 0.45) {
		indicators.push("Extremely artificial gradients");
	} else if (analysis.textures.unnaturalGradients > 0.4) {
		indicators.push("Artificial gradients detected");
	}

	if (analysis.textures.complexity < 0.3) {
		indicators.push("Lack of natural details");
	}

	// Colors
	if (analysis.colors.colorBanding > 0.35) {
		indicators.push("Highly artificial color banding");
	} else if (analysis.colors.colorBanding > 0.3) {
		indicators.push("Presence of artificial color banding");
	}

	if (analysis.colors.uniqueColors < 400) {
		indicators.push("Extremely limited color palette");
	} else if (analysis.colors.uniqueColors < 1000) {
		indicators.push("Limited color range");
	}

	if (analysis.colors.averageSaturation > 0.7) {
		indicators.push("Abnormally high saturation");
	}

	if (analysis.colors.saturationVariance < 0.1) {
		indicators.push("Too uniform saturation variation");
	}

	// Symmetry
	if (analysis.symmetry.horizontalSymmetry > 0.85 &&
		analysis.symmetry.verticalSymmetry > 0.85) {
		indicators.push("Almost perfect symmetry (rare in natural photos)");
	} else if (analysis.symmetry.horizontalSymmetry > 0.8) {
		indicators.push("Suspicious horizontal symmetry");
	} else if (analysis.symmetry.verticalSymmetry > 0.8) {
		indicators.push("Suspicious vertical symmetry");
	}

	// Noise
	if (analysis.noise.artificialNoise > 0.35) {
		indicators.push("Highly artificial digital noise");
	} else if (analysis.noise.artificialNoise > 0.3) {
		indicators.push("Artificial digital noise detected");
	}

	if (analysis.noise.naturalNoise < 0.03) {
		indicators.push("Total absence of natural noise");
	} else if (analysis.noise.naturalNoise < 0.1) {
		indicators.push("Absence of natural noise");
	}

	// Artifacts
	if (analysis.artifacts.compressionArtifacts > 0.3) {
		indicators.push("Suspicious compression artifacts");
	}

	if (analysis.artifacts.perfectEdges > 0.2) {
		indicators.push("Too perfect edges");
	}

        return indicators;
    }
}

