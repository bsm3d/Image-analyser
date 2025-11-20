/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class AIDetector {
    constructor() {
        // Security constants
        this.MAX_IMAGE_DIMENSION = 4096;
        this.MIN_IMAGE_DIMENSION = 50;
        this.MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
        this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

        // Thresholds based on statistical data
        this.thresholds = {
            patterns: {
                repeatingPatterns: 0.45,  // Median between AI and real
                sharpEdges: 0.06          // Threshold above real images
            },
            textures: {
                uniformity: 0.60,         // Observed midpoint
                unnaturalGradients: 0.25, // Based on data
                complexity: 0.15          // Between AI (~28%) and real (~7%)
            },
            colors: {
                colorBanding: 0.22,       // Observed average
                uniqueColors: 3500,       // Midpoint between AI/real
                saturationVariance: 0.04  // Based on averages
            },
            symmetry: {
                horizontalThreshold: 0.85,
                verticalThreshold: 0.85
            },
            noise: {
                artificialNoiseThreshold: 0.35,
                naturalNoiseThreshold: 0.03
            },
            artifacts: {
                compressionArtifacts: 0.35,
                perfectEdges: 0.25
            }
        };

        // Training database
        this.trainingData = {
            aiImages: [],
            realImages: [],
            maxSamples: 1000
        };
    }

    validateImage(imageData) {
        if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
            throw new Error('Invalid image data');
        }

        const {width, height} = imageData;
        if (width > this.MAX_IMAGE_DIMENSION || height > this.MAX_IMAGE_DIMENSION) {
            throw new Error(`Image dimensions too large. Maximum: ${this.MAX_IMAGE_DIMENSION}px`);
        }

        if (width < this.MIN_IMAGE_DIMENSION || height < this.MIN_IMAGE_DIMENSION) {
            throw new Error(`Image dimensions too small. Minimum: ${this.MIN_IMAGE_DIMENSION}px`);
        }

        if (imageData.data.length !== width * height * 4) {
            throw new Error('Corrupted image data');
        }

        return true;
    }

    analyzeImage(imageData) {
        this.validateImage(imageData);

        const analysis = this.extractFeatures(imageData);
        const {score, details} = this.calculateAIScore(analysis);
        const indicators = this.generateIndicators(analysis);

        return {
            score,
            analysis,
            indicators,
            details
        };
    }

    extractFeatures(imageData) {
        const {data, width, height} = imageData;
        return {
            patterns: this.detectPatterns(data, width, height),
            textures: this.analyzeTextures(data, width, height),
            colors: this.analyzeColors(data, width, height),
            symmetry: this.analyzeSymmetry(data, width, height),
            noise: this.analyzeNoise(data, width, height),
            artifacts: this.detectArtifacts(data, width, height)
        };
    }

    detectPatterns(data, width, height) {
        let sharpEdges = 0;
        let repeatingPatterns = 0;

        // Sharp edge detection
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

        // Repeating pattern detection
        for (let y = 0; y < height - 8; y += 8) {
            for (let x = 0; x < width - 8; x += 8) {
                const patterns = new Set();
                for (let dy = 0; dy < 8; dy++) {
                    for (let dx = 0; dx < 8; dx++) {
                        const i = ((y + dy) * width + (x + dx)) * 4;
                        patterns.add(`${data[i]},${data[i+1]},${data[i+2]}`);
                    }
                }
                if (patterns.size < 32) {
                    repeatingPatterns++;
                }
            }
        }

        return {
            sharpEdges: sharpEdges / (width * height),
            repeatingPatterns: repeatingPatterns / ((width * height) / 64)
        };
    }

    analyzeTextures(data, width, height) {
        let uniformity = 0;
        let complexity = 0;
        let unnaturalGradients = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surrounding = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

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
                if (gradientCount >= 3) unnaturalGradients++;
            }
        }

        const totalPixels = (width-2) * (height-2);
        return {
            uniformity: uniformity / totalPixels,
            complexity: complexity / totalPixels,
            unnaturalGradients: unnaturalGradients / totalPixels
        };
    }

    analyzeColors(data, width, height) {
        const colors = new Set();
        const saturations = [];
        const luminances = [];
        let colorBanding = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            colors.add(`${Math.floor(r/8)},${Math.floor(g/8)},${Math.floor(b/8)}`);

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            saturations.push(saturation);

            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            luminances.push(luminance);

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
            colorBanding: colorBanding / (data.length / 4),
            saturationVariance: this.calculateVariance(saturations),
            averageSaturation: saturations.reduce((a, b) => a + b) / saturations.length
        };
    }

    analyzeSymmetry(data, width, height) {
        let horizontalSymmetry = 0;
        let verticalSymmetry = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const leftIdx = (y * width + x) * 4;
                const rightIdx = (y * width + (width - 1 - x)) * 4;
                
                const diff = Math.abs(data[leftIdx] - data[rightIdx]) +
                           Math.abs(data[leftIdx+1] - data[rightIdx+1]) +
                           Math.abs(data[leftIdx+2] - data[rightIdx+2]);
                
                if (diff < 10) horizontalSymmetry++;
            }
        }

        for (let y = 0; y < height / 2; y++) {
            for (let x = 0; x < width; x++) {
                const topIdx = (y * width + x) * 4;
                const bottomIdx = ((height - 1 - y) * width + x) * 4;
                
                const diff = Math.abs(data[topIdx] - data[bottomIdx]) +
                           Math.abs(data[topIdx+1] - data[bottomIdx+1]) +
                           Math.abs(data[topIdx+2] - data[bottomIdx+2]);
                
                if (diff < 10) verticalSymmetry++;
            }
        }

        return {
            horizontalSymmetry: horizontalSymmetry / (width * height / 2),
            verticalSymmetry: verticalSymmetry / (width * height / 2)
        };
    }

    analyzeNoise(data, width, height) {
        let artificialNoise = 0;
        let naturalNoise = 0;

        for (let i = 0; i < data.length - 8; i += 4) {
            const current = [data[i], data[i+1], data[i+2]];
            const next = [data[i+4], data[i+5], data[i+6]];
            
            const diff = Math.abs(current[0] - next[0]) +
                        Math.abs(current[1] - next[1]) +
                        Math.abs(current[2] - next[2]);
            
            if (diff > 0 && diff < 8) artificialNoise++;
            if (diff > 8 && diff < 20) naturalNoise++;
        }

        return {
            artificialNoise: artificialNoise / (data.length / 4),
            naturalNoise: naturalNoise / (data.length / 4)
        };
    }

    detectArtifacts(data, width, height) {
        let compressionArtifacts = 0;
        let perfectEdges = 0;

        // JPEG block detection (8x8)
        for (let y = 0; y < height - 8; y += 8) {
            for (let x = 0; x < width - 8; x += 8) {
                let blockVariation = 0;
                for (let dy = 0; dy < 8; dy++) {
                    for (let dx = 0; dx < 7; dx++) {
                        const i1 = ((y + dy) * width + (x + dx)) * 4;
                        const i2 = ((y + dy) * width + (x + dx + 1)) * 4;
                        blockVariation += Math.abs(data[i1] - data[i2]);
                    }
                }
                if (blockVariation < 100) compressionArtifacts++;
            }
        }

        // Perfect edge detection
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const top = ((y-1) * width + x) * 4;
                const bottom = ((y+1) * width + x) * 4;
                const left = (y * width + x-1) * 4;
                const right = (y * width + x+1) * 4;

                const diffs = [
                    Math.abs(data[idx] - data[top]),
                    Math.abs(data[idx] - data[bottom]),
                    Math.abs(data[idx] - data[left]),
                    Math.abs(data[idx] - data[right])
                ];

                if (Math.max(...diffs) > 100 && Math.min(...diffs) === 0) {
                    perfectEdges++;
                }
            }
        }

        return {
            compressionArtifacts: compressionArtifacts / ((width * height) / 64),
            perfectEdges: perfectEdges / (width * height)
        };
    }

    calculateAIScore(analysis) {
        let score = 0;
        let details = {};

        // Pattern analysis
        if (analysis.patterns.sharpEdges > this.thresholds.patterns.sharpEdges) {
            const patternScore = (analysis.patterns.sharpEdges / this.thresholds.patterns.sharpEdges) * 15;
            score += Math.min(patternScore, 15);
            details.sharpEdges = patternScore;
        }

        if (analysis.patterns.repeatingPatterns < this.thresholds.patterns.repeatingPatterns) {
            const repeatScore = (1 - analysis.patterns.repeatingPatterns / this.thresholds.patterns.repeatingPatterns) * 10;
            score += Math.min(repeatScore, 10);
            details.repeatingPatterns = repeatScore;
        }

        // Texture analysis
        if (analysis.textures.uniformity < this.thresholds.textures.uniformity) {
            const uniformityScore = (1 - analysis.textures.uniformity / this.thresholds.textures.uniformity) * 20;
            score += Math.min(uniformityScore, 20);
            details.uniformity = uniformityScore;
        }

        if (analysis.textures.complexity > this.thresholds.textures.complexity) {
            const complexityScore = (analysis.textures.complexity / this.thresholds.textures.complexity) * 15;
            score += Math.min(complexityScore, 15);
            details.complexity = complexityScore;
        }

        if (analysis.textures.unnaturalGradients > this.thresholds.textures.unnaturalGradients) {
            const gradientScore = (analysis.textures.unnaturalGradients / this.thresholds.textures.unnaturalGradients) * 10;
            score += Math.min(gradientScore, 10);
            details.unnaturalGradients = gradientScore;
        }

        // Color analysis
        if (analysis.colors.uniqueColors > this.thresholds.colors.uniqueColors) {
            const colorScore = ((analysis.colors.uniqueColors - this.thresholds.colors.uniqueColors) / this.thresholds.colors.uniqueColors) * 15;
            score += Math.min(colorScore, 15);
            details.uniqueColors = colorScore;
        }

        if (analysis.colors.colorBanding < this.thresholds.colors.colorBanding) {
            const bandingScore = (1 - analysis.colors.colorBanding / this.thresholds.colors.colorBanding) * 10;
            score += Math.min(bandingScore, 10);
            details.colorBanding = bandingScore;
        }

        // Symmetry analysis
        if (analysis.symmetry.horizontalSymmetry > this.thresholds.symmetry.horizontalThreshold ||
            analysis.symmetry.verticalSymmetry > this.thresholds.symmetry.verticalThreshold) {
            const symmetryScore = Math.max(
                analysis.symmetry.horizontalSymmetry,
                analysis.symmetry.verticalSymmetry
            ) * 5;
            score += Math.min(symmetryScore, 5);
            details.symmetry = symmetryScore;
        }

        // Noise analysis
        if (analysis.noise.artificialNoise > this.thresholds.noise.artificialNoiseThreshold) {
            const noiseScore = (analysis.noise.artificialNoise / this.thresholds.noise.artificialNoiseThreshold) * 10;
            score += Math.min(noiseScore, 10);
            details.artificialNoise = noiseScore;
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            details
        };
    }

    generateIndicators(analysis) {
        const indicators = [];

        // Patterns
        if (analysis.patterns.sharpEdges > this.thresholds.patterns.sharpEdges) {
            indicators.push("Artificial sharp edges detected");
        }
        if (analysis.patterns.repeatingPatterns < this.thresholds.patterns.repeatingPatterns) {
            indicators.push("Unusual absence of repeating patterns");
        }

        // Textures
        if (analysis.textures.uniformity < this.thresholds.textures.uniformity) {
            indicators.push("Characteristic lack of uniformity");
        }
        if (analysis.textures.complexity > this.thresholds.textures.complexity) {
            indicators.push("Abnormally high complexity");
        }
        if (analysis.textures.unnaturalGradients > this.thresholds.textures.unnaturalGradients) {
            indicators.push("Unnatural gradients detected");
        }

        // Colors
        if (analysis.colors.uniqueColors > this.thresholds.colors.uniqueColors) {
            indicators.push("Unusual number of unique colors");
        }
        if (analysis.colors.colorBanding < this.thresholds.colors.colorBanding) {
            indicators.push("Atypical color distribution");
        }

        // Noise
        if (analysis.noise.artificialNoise > this.thresholds.noise.artificialNoiseThreshold) {
            indicators.push("Artificial digital noise detected");
        }
        if (analysis.noise.naturalNoise < this.thresholds.noise.naturalNoiseThreshold) {
            indicators.push("Absence of natural noise");
        }

        return indicators;
    }

    trainModel(images, type) {
        if (!['ai', 'real'].includes(type)) {
            throw new Error('Invalid training type');
        }

        if (this.trainingData[`${type}Images`].length >= this.trainingData.maxSamples) {
            throw new Error('Maximum number of samples reached');
        }

        const analyses = images.map(imageData => {
            this.validateImage(imageData);
            return this.analyzeImage(imageData);
        });
        
        this.trainingData[`${type}Images`].push(...analyses);
        this.calibrateThresholds();
        return true;
    }

    calibrateThresholds() {
        const categories = Object.keys(this.thresholds);
        
        categories.forEach(category => {
            const metrics = Object.keys(this.thresholds[category]);
            
            metrics.forEach(metric => {
                const aiValues = this.trainingData.aiImages
                    .map(img => img.analysis[category][metric])
                    .filter(v => v !== undefined && v !== null);
                const realValues = this.trainingData.realImages
                    .map(img => img.analysis[category][metric])
                    .filter(v => v !== undefined && v !== null);

                if (aiValues.length > 0 && realValues.length > 0) {
                    const aiMean = this.calculateMean(aiValues);
                    const realMean = this.calculateMean(realValues);
                    
                    const aiStdDev = this.calculateStdDev(aiValues, aiMean);
                    const realStdDev = this.calculateStdDev(realValues, realMean);

                    if (metric === 'uniqueColors') {
                        this.thresholds[category][metric] = Math.round((aiMean + realMean) / 2);
                    } else {
                        const weight = 0.6;
                        this.thresholds[category][metric] = 
                            (aiMean * weight + realMean * (1 - weight)) + 
                            (aiStdDev + realStdDev) * 0.5;
                            
                        this.thresholds[category][metric] = 
                            Math.min(1, Math.max(0, this.thresholds[category][metric]));
                    }
                }
            });
        });
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    }

    calculateMean(values) {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    calculateStdDev(values, mean) {
        if (!mean) {
            mean = this.calculateMean(values);
        }
        return Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    }

    saveModel() {
        try {
            return JSON.stringify({
                thresholds: this.cloneObject(this.thresholds),
                trainingStats: {
                    aiImagesCount: this.trainingData.aiImages.length,
                    realImagesCount: this.trainingData.realImages.length,
                    lastUpdate: new Date().toISOString()
                }
            });
        } catch (error) {
            throw new Error('Error saving model');
        }
    }

    loadModel(modelData) {
        try {
            if (typeof modelData !== 'string') {
                throw new Error('Invalid model data');
            }

            const parsedData = JSON.parse(modelData);
            this.validateThresholds(parsedData.thresholds);
            this.thresholds = this.cloneObject(parsedData.thresholds);
            
            return parsedData.trainingStats;
        } catch (error) {
            throw new Error(`Model loading error: ${error.message}`);
        }
    }

    cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    validateThresholds(thresholds) {
        const defaultThresholds = this.getDefaultThresholds();
        for (const category in defaultThresholds) {
            if (!thresholds[category]) {
                throw new Error(`Missing threshold category: ${category}`);
            }
            for (const metric in defaultThresholds[category]) {
                if (!this.isValidNumber(thresholds[category][metric])) {
                    throw new Error(`Invalid threshold: ${category}.${metric}`);
                }
            }
        }
    }

    getDefaultThresholds() {
        return {
            patterns: {
                repeatingPatterns: 0.45,
                sharpEdges: 0.06
            },
            textures: {
                uniformity: 0.60,
                unnaturalGradients: 0.25,
                complexity: 0.15
            },
            colors: {
                colorBanding: 0.22,
                uniqueColors: 3500,
                saturationVariance: 0.04
            },
            symmetry: {
                horizontalThreshold: 0.85,
                verticalThreshold: 0.85
            },
            noise: {
                artificialNoiseThreshold: 0.35,
                naturalNoiseThreshold: 0.03
            },
            artifacts: {
                compressionArtifacts: 0.35,
                perfectEdges: 0.25
            }
        };
    }

    reset() {
        this.thresholds = this.getDefaultThresholds();
        this.trainingData = {
            aiImages: [],
            realImages: [],
            maxSamples: this.trainingData.maxSamples
        };
    }

    isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
}

// Secure global export
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'AIDetector', {
        value: AIDetector,
        writable: false,
        configurable: false
    });
}