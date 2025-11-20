/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class AITrainingUI {
    constructor(aiDetector) {
        if (!aiDetector) {
            throw new Error('AIDetector is required');
        }
        this.aiDetector = aiDetector;
        this.trainingImages = {
            ai: [],
            real: []
        };
        this.isTraining = false;
        this.MAX_IMAGES_PER_TYPE = 100; // Maximum images per type to prevent memory issues
        this.initializeUI();
    }

    initializeUI() {
        this.container = document.createElement('div');
        this.container.className = 'ai-training-container';
        this.container.innerHTML = `
            <div class="training-header">
                <h2>Detector Training Mode</h2>
                <div class="training-stats">
                    <div>AI Images Loaded: <span id="aiCount">0</span></div>
                    <div>Real Images Loaded: <span id="realCount">0</span></div>
                </div>
                <div class="training-controls">
                    <button id="startTrainingBtn" class="primary-button">Start Training</button>
                    <button id="resetTrainingBtn" class="secondary-button">Reset</button>
                </div>
            </div>

            <div class="training-sections">
                <div class="training-section">
                    <h3>AI-Generated Images</h3>
                    <input type="file" id="aiImageInput" accept="image/*" multiple>
                    <label for="aiImageInput" class="file-upload-label">
                        Load AI Images
                    </label>
                    <div id="aiPreview" class="image-preview"></div>
                </div>

                <div class="training-section">
                    <h3>Real Images</h3>
                    <input type="file" id="realImageInput" accept="image/*" multiple>
                    <label for="realImageInput" class="file-upload-label">
                        Load Real Images
                    </label>
                    <div id="realPreview" class="image-preview"></div>
                </div>
            </div>

            <div class="training-report">
                <h3>Training Report</h3>
                <div id="trainingProgressContainer"></div>
                <pre id="trainingReportContent"></pre>
            </div>
        `;

        // Ajouter le conteneur dans le div trainingModeContainer au lieu de document.body
        const trainingModeContainer = document.getElementById('trainingModeContainer');
        if (trainingModeContainer) {
            trainingModeContainer.appendChild(this.container);
        } else {
            // Fallback si le conteneur n'existe pas
            document.body.appendChild(this.container);
        }
        this.bindEvents();
    }

    bindEvents() {
        const startBtn = this.container.querySelector('#startTrainingBtn');
        const resetBtn = this.container.querySelector('#resetTrainingBtn');
        const aiInput = this.container.querySelector('#aiImageInput');
        const realInput = this.container.querySelector('#realImageInput');

        aiInput.addEventListener('change', (e) => this.handleImageUpload(e, 'ai'));
        realInput.addEventListener('change', (e) => this.handleImageUpload(e, 'real'));
        startBtn.addEventListener('click', () => this.startTraining());
        resetBtn.addEventListener('click', () => this.resetTraining());
    }

    handleImageUpload(event, type) {
        const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));

        if (files.length === 0) {
            this.showMessage('Select valid image files', 'error');
            return;
        }

        // Check if adding these images would exceed the limit
        const currentCount = this.trainingImages[type].length;
        const remainingSlots = this.MAX_IMAGES_PER_TYPE - currentCount;

        if (remainingSlots <= 0) {
            this.showMessage(`Maximum ${this.MAX_IMAGES_PER_TYPE} images per type already reached`, 'error');
            return;
        }

        if (files.length > remainingSlots) {
            this.showMessage(`Only ${remainingSlots} more images can be added (max: ${this.MAX_IMAGES_PER_TYPE} per type)`, 'error');
            return;
        }

        const previewContainer = this.container.querySelector(`#${type}Preview`);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const container = this.createImagePreviewContainer(img, type);
                    previewContainer.appendChild(container);
                    this.trainingImages[type].push(img);
                    this.updateImageCount(type);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    createImagePreviewContainer(img, type) {
        const container = document.createElement('div');
        container.className = 'image-preview-item';

        // Créer un canvas pour la prévisualisation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;

        // Calculer les dimensions pour maintenir le ratio
        const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
        const width = img.width * ratio;
        const height = img.height * ratio;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;

        ctx.drawImage(img, x, y, width, height);

        // Bouton de suppression
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            container.remove();
            const index = this.trainingImages[type].indexOf(img);
            if (index > -1) {
                this.trainingImages[type].splice(index, 1);
            }
            this.updateImageCount(type);
        };

        container.appendChild(canvas);
        container.appendChild(removeBtn);
        return container;
    }

    async startTraining() {
        if (this.isTraining) return;

        if (this.trainingImages.ai.length < 5 || this.trainingImages.real.length < 5) {
            this.showMessage('You must load at least 5 images of each type', 'error');
            return;
        }

        this.isTraining = true;
        const startBtn = this.container.querySelector('#startTrainingBtn');
        const resetBtn = this.container.querySelector('#resetTrainingBtn');
        startBtn.disabled = true;
        resetBtn.disabled = true;
        this.container.querySelectorAll('input[type="file"]').forEach(input => input.disabled = true);

        // Créer la barre de progression
        const progressContainer = this.createProgressBar();
        const progress = {
            fill: progressContainer.querySelector('.progress-fill'),
            text: progressContainer.querySelector('.progress-text'),
            status: progressContainer.querySelector('.progress-status')
        };

        try {
            const totalImages = this.trainingImages.ai.length + this.trainingImages.real.length;
            let processedImages = 0;

            // Fonction de mise à jour de la progression
            const updateProgress = (status) => {
                const percentage = Math.round((processedImages / totalImages) * 100);
                progress.fill.style.width = `${percentage}%`;
                progress.text.textContent = `${percentage}%`;
                if (status) progress.status.textContent = status;
            };

            // Traitement par lots
            const processImageBatch = async (images, type) => {
                const batchSize = 3;
                const imageData = [];

                for (let i = 0; i < images.length; i += batchSize) {
                    const batch = images.slice(i, i + batchSize);
                    const batchData = await Promise.all(batch.map(img => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0);
                        return ctx.getImageData(0, 0, canvas.width, canvas.height);
                    }));

                    imageData.push(...batchData);
                    processedImages += batch.length;
                    updateProgress(`Processing ${type} images...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                return imageData;
            };

            // Traiter les images IA
            updateProgress('Analyzing AI images...');
            const aiImageData = await processImageBatch(this.trainingImages.ai, 'AI');

            // Traiter les images réelles
            updateProgress('Analyzing real images...');
            const realImageData = await processImageBatch(this.trainingImages.real, 'real');

            // Entraîner le modèle
            updateProgress('Training the model...');
            this.aiDetector.trainModel(aiImageData, 'ai');
            this.aiDetector.trainModel(realImageData, 'real');

            // Générer et afficher le rapport
            updateProgress('Generating the report...');
            await this.displayTrainingReport();

            updateProgress('Training completed successfully');
            this.showMessage('Training completed successfully', 'success');

        } catch (error) {
            console.error('Error during training:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        } finally {
            this.isTraining = false;
            startBtn.disabled = false;
            resetBtn.disabled = false;
            this.container.querySelectorAll('input[type="file"]').forEach(input => input.disabled = false);
        }
    }

    createProgressBar() {
        const container = document.createElement('div');
        container.className = 'training-progress';
        container.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">0%</div>
            <div class="progress-status">Initializing...</div>
        `;

        const progressContainer = this.container.querySelector('#trainingProgressContainer');
        progressContainer.innerHTML = '';
        progressContainer.appendChild(container);

        return container;
    }

    async displayTrainingReport() {
        const reportContainer = this.container.querySelector('#trainingReportContent');

        try {
            // Récupérer les statistiques
            const aiStats = await this.analyzeImageSet(this.trainingImages.ai);
            const realStats = await this.analyzeImageSet(this.trainingImages.real);

            const formatStat = value => {
                if (typeof value === 'number') {
                    if (value > 1) return Math.round(value);
                    return (value * 100).toFixed(2) + '%';
                }
                return value;
            };

            const report = `
TRAINING REPORT
=====================

ANALYZED IMAGES
---------------
AI Images: ${this.trainingImages.ai.length}
Real Images: ${this.trainingImages.real.length}

AI IMAGE STATISTICS
-------------------------
${this.formatStats(aiStats, formatStat)}

REAL IMAGE STATISTICS
-----------------------------
${this.formatStats(realStats, formatStat)}

CURRENT DETECTION THRESHOLDS
-------------------------
${JSON.stringify(this.aiDetector.thresholds, null, 2)}
            `;

            reportContainer.textContent = report;

        } catch (error) {
            console.error('Error generating the report:', error);
            reportContainer.textContent = 'Error generating the report';
        }
    }

    formatStats(stats, formatFn) {
        return Object.entries(stats)
            .map(([category, values]) => {
                const formattedValues = Object.entries(values)
                    .map(([key, value]) => `  ${key}: ${formatFn(value)}`)
                    .join('\n');
                return `${category}:\n${formattedValues}`;
            })
            .join('\n\n');
    }

    async analyzeImageSet(images) {
        if (!images || images.length === 0) {
            return {
                patterns: { repeatingPatterns: 0, sharpEdges: 0 },
                textures: { uniformity: 0, unnaturalGradients: 0, complexity: 0 },
                colors: { colorBanding: 0, uniqueColors: 0, saturationVariance: 0 }
            };
        }

        // Analyser chaque image
        const analysisResults = await Promise.all(images.map(async img => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            const analyzer = new ImageAnalyzer(canvas);
            return await analyzer.analyze(img);
        }));

        // Calculer les moyennes
        const calculateAverage = (key1, key2) => {
            const values = analysisResults.map(result => result[key1][key2])
                .filter(v => v !== undefined && v !== null);
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        };

        return {
            patterns: {
                repeatingPatterns: calculateAverage('patterns', 'repeatingPatterns'),
                sharpEdges: calculateAverage('patterns', 'sharpEdges')
            },
            textures: {
                uniformity: calculateAverage('textures', 'uniformity'),
                unnaturalGradients: calculateAverage('textures', 'unnaturalGradients'),
                complexity: calculateAverage('textures', 'complexity')
            },
            colors: {
                colorBanding: calculateAverage('colors', 'colorBanding'),
                uniqueColors: calculateAverage('colors', 'uniqueColors'),
                saturationVariance: calculateAverage('colors', 'saturationVariance')
            }
        };
    }

    resetTraining() {
        if (this.isTraining) {
            this.showMessage('Cannot reset during training', 'error');
            return;
        }

        // Réinitialiser les images
        this.trainingImages = { ai: [], real: [] };

        // Nettoyer l'interface
        ['ai', 'real'].forEach(type => {
            const previewContainer = this.container.querySelector(`#${type}Preview`);
            previewContainer.innerHTML = '';
            this.updateImageCount(type);
        });

        // Réinitialiser le rapport
        const reportContainer = this.container.querySelector('#trainingReportContent');
        reportContainer.textContent = '';

        // Nettoyer la progression
        const progressContainer = this.container.querySelector('#trainingProgressContainer');
        progressContainer.innerHTML = '';

        this.showMessage('Training reset', 'success');
    }

    updateImageCount(type) {
        const countElement = this.container.querySelector(`#${type}Count`);
        if (countElement) {
            countElement.textContent = this.trainingImages[type].length;
        }
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message ${type}`;
        messageContainer.textContent = message;

        const reportSection = this.container.querySelector('.training-report');
        reportSection.insertBefore(messageContainer, reportSection.firstChild);

        setTimeout(() => messageContainer.remove(), 5000);
    }
}

// Export et déclaration globale
window.AITrainingUI = AITrainingUI;
