/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class AIDetector {
    constructor() {
        // Constantes de sécurité
        this.MAX_IMAGE_DIMENSION = 4096;
        this.MIN_IMAGE_DIMENSION = 50;
        this.MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
        this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

        // Seuils basés sur les données statistiques
        this.thresholds = {
            patterns: {
                repeatingPatterns: 0.45,  // Médiane entre IA et réel
                sharpEdges: 0.06          // Seuil au-dessus des images réelles
            },
            textures: {
                uniformity: 0.60,         // Point médian observé
                unnaturalGradients: 0.25, // Basé sur les données
                complexity: 0.15          // Entre IA (~28%) et réel (~7%)
            },
            colors: {
                colorBanding: 0.22,       // Moyenne observée
                uniqueColors: 3500,       // Point médian entre IA/réel
                saturationVariance: 0.04  // Basé sur les moyennes
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

        // Base de données d'entraînement
        this.trainingData = {
            aiImages: [],
            realImages: [],
            maxSamples: 1000
        };
    }

    validateImage(imageData) {
        if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
            throw new Error('Données image invalides');
        }

        const {width, height} = imageData;
        if (width > this.MAX_IMAGE_DIMENSION || height > this.MAX_IMAGE_DIMENSION) {
            throw new Error(`Dimensions d'image trop grandes. Maximum: ${this.MAX_IMAGE_DIMENSION}px`);
        }

        if (width < this.MIN_IMAGE_DIMENSION || height < this.MIN_IMAGE_DIMENSION) {
            throw new Error(`Dimensions d'image trop petites. Minimum: ${this.MIN_IMAGE_DIMENSION}px`);
        }

        if (imageData.data.length !== width * height * 4) {
            throw new Error('Données d\'image corrompues');
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
                if (diff < 30) horizontalSymmetry++;
            }
        }

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

    analyzeNoise(data, width, height) {
        let naturalNoise = 0;
        let artificialNoise = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surrounding = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

                const variations = surrounding.map(sIdx => {
                    return Math.abs(data[idx] - data[sIdx]) +
                           Math.abs(data[idx+1] - data[sIdx+1]) +
                           Math.abs(data[idx+2] - data[sIdx+2]);
                });

                if (Math.max(...variations) < 30 && Math.min(...variations) > 5) {
                    naturalNoise++;
                }
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

    detectArtifacts(data, width, height) {
        let compressionArtifacts = 0;
        let perfectEdges = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const surrounding = [
                    ((y-1) * width + x) * 4,
                    ((y+1) * width + x) * 4,
                    (y * width + x-1) * 4,
                    (y * width + x+1) * 4
                ];

                let blockiness = 0;
                surrounding.forEach(sIdx => {
                    const diff = Math.abs(data[idx] - data[sIdx]) +
                               Math.abs(data[idx+1] - data[sIdx+1]) +
                               Math.abs(data[idx+2] - data[sIdx+2]);
                    if (diff === 0 || diff > 100) blockiness++;
                });
                if (blockiness >= 3) compressionArtifacts++;

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

    calculateAIScore(analysis) {
        let score = 0;
        const details = {};

        // Patterns (30 points)
        if (analysis.patterns.sharpEdges > this.thresholds.patterns.sharpEdges) {
            const sharpScore = Math.min(20, (analysis.patterns.sharpEdges - this.thresholds.patterns.sharpEdges) * 200);
            score += sharpScore;
            details.sharpEdges = sharpScore;
        }

        if (analysis.patterns.repeatingPatterns < this.thresholds.patterns.repeatingPatterns) {
            const patternScore = Math.min(10, (this.thresholds.patterns.repeatingPatterns - analysis.patterns.repeatingPatterns) * 100);
            score += patternScore;
            details.repeatingPatterns = patternScore;
        }

        // Textures (35 points)
        if (analysis.textures.complexity > this.thresholds.textures.complexity) {
            const complexityScore = Math.min(15, (analysis.textures.complexity - this.thresholds.textures.complexity) * 150);
            score += complexityScore;
            details.complexity = complexityScore;
        }

        if (analysis.textures.uniformity < this.thresholds.textures.uniformity) {
            const uniformityScore = Math.min(10, (this.thresholds.textures.uniformity - analysis.textures.uniformity) * 100);
            score += uniformityScore;
            details.uniformity = uniformityScore;
        }

        if (analysis.textures.unnaturalGradients > this.thresholds.textures.unnaturalGradients) {
            const gradientScore = Math.min(10, (analysis.textures.unnaturalGradients - this.thresholds.textures.unnaturalGradients) * 100);
			score += gradientScore;
            details.unnaturalGradients = gradientScore;
        }

        // Couleurs (25 points)
        if (analysis.colors.uniqueColors > this.thresholds.colors.uniqueColors) {
            const colorScore = Math.min(15, (analysis.colors.uniqueColors - this.thresholds.colors.uniqueColors) / 200);
            score += colorScore;
            details.uniqueColors = colorScore;
        }

        if (analysis.colors.colorBanding < this.thresholds.colors.colorBanding) {
            const bandingScore = Math.min(10, (this.thresholds.colors.colorBanding - analysis.colors.colorBanding) * 100);
            score += bandingScore;
            details.colorBanding = bandingScore;
        }

        // Bruit (10 points)
        if (analysis.noise.artificialNoise > this.thresholds.noise.artificialNoiseThreshold) {
            const noiseScore = Math.min(10, (analysis.noise.artificialNoise - this.thresholds.noise.artificialNoiseThreshold) * 100);
            score += noiseScore;
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
            indicators.push("Bords nets artificiels détectés");
        }
        if (analysis.patterns.repeatingPatterns < this.thresholds.patterns.repeatingPatterns) {
            indicators.push("Absence inhabituelle de motifs répétitifs");
        }

        // Textures
        if (analysis.textures.uniformity < this.thresholds.textures.uniformity) {
            indicators.push("Manque d'uniformité caractéristique");
        }
        if (analysis.textures.complexity > this.thresholds.textures.complexity) {
            indicators.push("Complexité anormalement élevée");
        }
        if (analysis.textures.unnaturalGradients > this.thresholds.textures.unnaturalGradients) {
            indicators.push("Dégradés non naturels détectés");
        }

        // Couleurs
        if (analysis.colors.uniqueColors > this.thresholds.colors.uniqueColors) {
            indicators.push("Nombre inhabituel de couleurs uniques");
        }
        if (analysis.colors.colorBanding < this.thresholds.colors.colorBanding) {
            indicators.push("Distribution atypique des couleurs");
        }

        // Noise
        if (analysis.noise.artificialNoise > this.thresholds.noise.artificialNoiseThreshold) {
            indicators.push("Bruit numérique artificiel détecté");
        }
        if (analysis.noise.naturalNoise < this.thresholds.noise.naturalNoiseThreshold) {
            indicators.push("Absence de bruit naturel");
        }

        return indicators;
    }

    trainModel(images, type) {
        if (!['ai', 'real'].includes(type)) {
            throw new Error('Type d\'entraînement invalide');
        }

        if (this.trainingData[`${type}Images`].length >= this.trainingData.maxSamples) {
            throw new Error('Nombre maximum d\'échantillons atteint');
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
            throw new Error('Erreur lors de la sauvegarde du modèle');
        }
    }

    loadModel(modelData) {
        try {
            if (typeof modelData !== 'string') {
                throw new Error('Données de modèle invalides');
            }

            const parsedData = JSON.parse(modelData);
            this.validateThresholds(parsedData.thresholds);
            this.thresholds = this.cloneObject(parsedData.thresholds);
            
            return parsedData.trainingStats;
        } catch (error) {
            throw new Error(`Erreur de chargement du modèle: ${error.message}`);
        }
    }

    cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    validateThresholds(thresholds) {
        const defaultThresholds = this.getDefaultThresholds();
        for (const category in defaultThresholds) {
            if (!thresholds[category]) {
                throw new Error(`Catégorie de seuils manquante: ${category}`);
            }
            for (const metric in defaultThresholds[category]) {
                if (!this.isValidNumber(thresholds[category][metric])) {
                    throw new Error(`Seuil invalide: ${category}.${metric}`);
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

// Export global sécurisé
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'AIDetector', {
        value: AIDetector,
        writable: false,
        configurable: false
    });
}			
			