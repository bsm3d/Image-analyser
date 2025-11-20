/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class TrainingManager {
    constructor(aiDetector) {
        this.aiDetector = aiDetector;
        this.trainingSet = {
            aiImages: [],
            realImages: []
        };
        this.trainingMode = false;
        this.analysisCache = new WeakMap(); // Cache to avoid redundant analyses
    }

    // Démarre le mode d'entraînement
    startTraining() {
        this.trainingMode = true;
        this.trainingSet = {
            aiImages: [],
            realImages: []
        };
        console.log('Training mode started');
    }

    // Stops training mode and launches analysis
    stopTraining() {
        if (!this.trainingMode) {
            console.warn('No training in progress');
            return false;
        }

        // Check that we have enough samples
        if (this.trainingSet.aiImages.length < 5 || this.trainingSet.realImages.length < 5) {
            console.error('Not enough samples for training');
            return false;
        }

        // Train the detector
        try {
            this.aiDetector.trainModel(this.trainingSet.aiImages, 'ai');
            this.aiDetector.trainModel(this.trainingSet.realImages, 'real');
            
            this.trainingMode = false;
            console.log('Training completed');
            
            return true;
        } catch (error) {
            console.error('Training error:', error);
            return false;
        }
    }

    // Adds an image to the training set
    addImage(image, type) {
        if (!this.trainingMode) {
            console.warn('Training mode is not active');
            return false;
        }

        // Validate the image type
        if (type !== 'ai' && type !== 'real') {
            console.error('Invalid image type');
            return false;
        }

        // Add the image
        this.trainingSet[`${type}Images`].push(image);

        console.log(`Image added (${type}). Total: ${this.trainingSet[`${type}Images`].length}`);
        return true;
    }

    // Exports training data
    exportTrainingData() {
        return {
            aiImagesCount: this.trainingSet.aiImages.length,
            realImagesCount: this.trainingSet.realImages.length,
            aiThresholds: this.aiDetector.thresholds
        };
    }

    // Imports previous training data
    importTrainingData(data) {
        try {
            // Restore thresholds if present
            if (data.aiThresholds) {
                this.aiDetector.thresholds = data.aiThresholds;
            }

            console.log('Training data imported');
            return true;
        } catch (error) {
            console.error('Error during import:', error);
            return false;
        }
    }

    // Completely resets training
    reset() {
        this.trainingMode = false;
        this.trainingSet = {
            aiImages: [],
            realImages: []
        };
        this.analysisCache = new WeakMap(); // Clear cache
        this.aiDetector.reset();
        console.log('Full reset');
    }

    // Statistical analysis of training images
    getTrainingStatistics() {
        return {
            aiImages: {
                count: this.trainingSet.aiImages.length,
                characteristics: this.analyzeImageSet(this.trainingSet.aiImages)
            },
            realImages: {
                count: this.trainingSet.realImages.length,
                characteristics: this.analyzeImageSet(this.trainingSet.realImages)
            }
        };
    }

    // Detailed analysis of a set of images
    analyzeImageSet(imageSet) {
        if (!imageSet || imageSet.length === 0) return null;

        // Analysis of average characteristics with caching
        const analyses = imageSet.map(img => {
            // Check cache first
            if (this.analysisCache.has(img)) {
                return this.analysisCache.get(img);
            }
            // Analyze and cache
            const analysis = this.aiDetector.analyzeImage(img);
            this.analysisCache.set(img, analysis);
            return analysis;
        });

        // Calculate averages for each category
        const averageCharacteristics = {
            patterns: {
                repeatingPatterns: this.calculateAverage(analyses, 'patterns', 'repeatingPatterns'),
                sharpEdges: this.calculateAverage(analyses, 'patterns', 'sharpEdges')
            },
            textures: {
                uniformity: this.calculateAverage(analyses, 'textures', 'uniformity'),
                unnaturalGradients: this.calculateAverage(analyses, 'textures', 'unnaturalGradients'),
                complexity: this.calculateAverage(analyses, 'textures', 'complexity')
            },
            colors: {
                colorBanding: this.calculateAverage(analyses, 'colors', 'colorBanding'),
                uniqueColors: this.calculateAverage(analyses, 'colors', 'uniqueColors'),
                saturationVariance: this.calculateAverage(analyses, 'colors', 'saturationVariance')
            },
            symmetry: {
                horizontalSymmetry: this.calculateAverage(analyses, 'symmetry', 'horizontalSymmetry'),
                verticalSymmetry: this.calculateAverage(analyses, 'symmetry', 'verticalSymmetry')
            },
            noise: {
                artificialNoise: this.calculateAverage(analyses, 'noise', 'artificialNoise'),
                naturalNoise: this.calculateAverage(analyses, 'noise', 'naturalNoise')
            },
            artifacts: {
                compressionArtifacts: this.calculateAverage(analyses, 'artifacts', 'compressionArtifacts'),
                perfectEdges: this.calculateAverage(analyses, 'artifacts', 'perfectEdges')
            }
        };

        return {
            averageCharacteristics,
            scoreDistribution: this.calculateScoreDistribution(analyses)
        };
    }

    // Calcul de la moyenne pour une caractéristique spécifique
    calculateAverage(analyses, category, metric) {
        const values = analyses.map(a => a.analysis[category][metric]);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    // Distribution des scores
    calculateScoreDistribution(analyses) {
        const scores = analyses.map(a => a.score);
        
        // Calcul des statistiques de base
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Calcul de l'écart-type
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        return {
            min,
            max,
            mean,
            stdDev
        };
    }

    // Génère un rapport complet de l'entraînement
    generateTrainingReport() {
        const stats = this.getTrainingStatistics();
        
        return {
            trainingOverview: {
                aiImagesCount: stats.aiImages.count,
                realImagesCount: stats.realImages.count
            },
            aiImageCharacteristics: stats.aiImages.characteristics,
            realImageCharacteristics: stats.realImages.characteristics,
            currentThresholds: this.aiDetector.thresholds
        };
    }

    // Compare les caractéristiques entre images AI et réelles
    compareImageTypes() {
        const aiStats = this.analyzeImageSet(this.trainingSet.aiImages);
        const realStats = this.analyzeImageSet(this.trainingSet.realImages);

        return {
            significantDifferences: this.findSignificantDifferences(
                aiStats.averageCharacteristics, 
                realStats.averageCharacteristics
            )
        };
    }

    // Trouve les différences significatives entre les types d'images
    findSignificantDifferences(aiChars, realChars) {
        const differences = {};

        // Fonction pour comparer les caractéristiques
        const compareCategory = (category) => {
            const categoryDiffs = {};
            Object.keys(aiChars[category]).forEach(metric => {
                const diff = Math.abs(aiChars[category][metric] - realChars[category][metric]);
                if (diff > 0.1) { // Seuil de différence significative
                    categoryDiffs[metric] = diff;
                }
            });
            return categoryDiffs;
        };

        // Comparer chaque catégorie
        Object.keys(aiChars).forEach(category => {
            const catDiffs = compareCategory(category);
            if (Object.keys(catDiffs).length > 0) {
                differences[category] = catDiffs;
            }
        });

        return differences;
    }
}

// Méthode statique pour créer une instance
TrainingManager.create = function(aiDetector) {
    return new TrainingManager(aiDetector);
};

// Ajout de la déclaration globale
window.TrainingManager = TrainingManager;