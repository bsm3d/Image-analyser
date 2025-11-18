/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class UIManager {
    constructor() {
        console.log('Initializing UIManager...');

        // Éléments du DOM
        this.imageInput = document.getElementById('imageInput');
        this.canvas = document.getElementById('imagePreview');
        this.loadingElement = document.getElementById('loading');
        this.analysisDataElement = document.getElementById('analysisData');
        this.exifDataElement = document.getElementById('exifData');
        this.welcomeMessage = document.getElementById('welcomeMessage');

        // Vérifier si les éléments sont trouvés
        if (!this.imageInput) console.error('imageInput not found');
        if (!this.canvas) console.error('canvas not found');
        if (!this.loadingElement) console.error('loadingElement not found');
        if (!this.analysisDataElement) console.error('analysisDataElement not found');
        if (!this.exifDataElement) console.error('exifDataElement not found');

        // Initialiser le canvas avec vérification
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            // Définir une taille initiale raisonnable
            this.canvas.width = 800;
            this.canvas.height = 600;
        }

        // Initialiser les composants avec vérification
        try {
            // Vérifier que les classes nécessaires sont disponibles
            if (typeof ImageAnalyzer === 'undefined') {
                throw new Error('ImageAnalyzer not defined');
            }
            if (typeof ExifReader === 'undefined') {
                throw new Error('ExifReader not defined');
            }
            if (typeof ExportManager === 'undefined') {
                throw new Error('ExportManager not defined');
            }

            this.imageAnalyzer = new ImageAnalyzer(this.canvas);
            this.exifReader = new ExifReader();
            this.exportManager = new ExportManager();

            console.log('All components have been successfully initialized');
        } catch (error) {
            console.error('Error during component initialization:', error);
            this.showError('Initialization error: ' + error.message);
        }

        // Create pixel tooltip
        this.createPixelTooltip();

        // Create heatmap canvas
        this.createHeatmapCanvas();

        // Create additional analysis canvases
        this.createAdditionalCanvases();

        // Initialize control states
        this.brightness = 0;
        this.contrast = 0;
        this.currentChannel = 'rgb';
        this.zoomLevel = 1;
        this.zoomX = 0;
        this.zoomY = 0;

        // Lier les événements
        this.bindEvents();
        console.log('UIManager fully initialized');
    }

    createHeatmapCanvas() {
        this.heatmapCanvas = document.createElement('canvas');
        this.heatmapCanvas.style.position = 'absolute';
        this.heatmapCanvas.style.top = '0';
        this.heatmapCanvas.style.left = '0';
        this.heatmapCanvas.style.pointerEvents = 'all';
        this.heatmapCanvas.style.display = 'none';
        this.heatmapCanvas.style.opacity = '0.75'; // Increased from 0.6
        this.canvas.parentElement.style.position = 'relative';
        this.canvas.parentElement.appendChild(this.heatmapCanvas);
        this.heatmapCtx = this.heatmapCanvas.getContext('2d');
        this.heatmapVisible = false;

        // Create block analysis canvas
        this.blockCanvas = document.createElement('canvas');
        this.blockCanvas.style.position = 'absolute';
        this.blockCanvas.style.top = '0';
        this.blockCanvas.style.left = '0';
        this.blockCanvas.style.pointerEvents = 'none';
        this.blockCanvas.style.display = 'none';
        this.blockCanvas.style.opacity = '0.7';
        this.canvas.parentElement.appendChild(this.blockCanvas);
        this.blockCtx = this.blockCanvas.getContext('2d');
        this.blockVisible = false;

        // Create heatmap tooltip
        this.heatmapTooltip = document.createElement('div');
        this.heatmapTooltip.className = 'heatmap-tooltip';
        document.body.appendChild(this.heatmapTooltip);

        // Add heatmap hover events
        this.heatmapCanvas.addEventListener('mousemove', (e) => this.onHeatmapHover(e));
        this.heatmapCanvas.addEventListener('mouseleave', () => {
            this.heatmapTooltip.classList.remove('active');
        });
    }

    createPixelTooltip() {
        this.pixelTooltip = document.createElement('div');
        this.pixelTooltip.className = 'pixel-tooltip';
        document.body.appendChild(this.pixelTooltip);
    }

    createAdditionalCanvases() {
        // Edge detection canvas
        this.edgeCanvas = document.createElement('canvas');
        this.edgeCanvas.style.position = 'absolute';
        this.edgeCanvas.style.top = '0';
        this.edgeCanvas.style.left = '0';
        this.edgeCanvas.style.pointerEvents = 'none';
        this.edgeCanvas.style.display = 'none';
        this.edgeCanvas.style.opacity = '0.8';
        this.canvas.parentElement.appendChild(this.edgeCanvas);
        this.edgeCtx = this.edgeCanvas.getContext('2d');
        this.edgeVisible = false;

        // RGB channel canvas
        this.channelCanvas = document.createElement('canvas');
        this.channelCanvas.style.position = 'absolute';
        this.channelCanvas.style.top = '0';
        this.channelCanvas.style.left = '0';
        this.channelCanvas.style.pointerEvents = 'none';
        this.channelCanvas.style.display = 'none';
        this.canvas.parentElement.appendChild(this.channelCanvas);
        this.channelCtx = this.channelCanvas.getContext('2d');
        this.channelVisible = false;

        // Magnification canvas
        this.magnifierContainer = document.createElement('div');
        this.magnifierContainer.className = 'magnifier-container';
        this.magnifierContainer.style.display = 'none';
        document.body.appendChild(this.magnifierContainer);

        this.magnifierCanvas = document.createElement('canvas');
        this.magnifierCanvas.width = 200;
        this.magnifierCanvas.height = 200;
        this.magnifierContainer.appendChild(this.magnifierCanvas);
        this.magnifierCtx = this.magnifierCanvas.getContext('2d');
        this.magnifierVisible = false;

        // Histogram container (will be inserted in analysis section later)
        this.histogramContainer = document.createElement('div');
        this.histogramContainer.className = 'histogram-container';
        this.histogramContainer.style.display = 'none';
        this.histogramContainer.innerHTML = '<h3>RGB Histogram</h3>';

        this.histogramCanvas = document.createElement('canvas');
        this.histogramCanvas.width = 512;
        this.histogramCanvas.height = 150;
        this.histogramContainer.appendChild(this.histogramCanvas);
        this.histogramCtx = this.histogramCanvas.getContext('2d');
        this.histogramVisible = false;

        // Blacklight UV canvas
        this.blacklightCanvas = document.createElement('canvas');
        this.blacklightCanvas.style.position = 'absolute';
        this.blacklightCanvas.style.top = '0';
        this.blacklightCanvas.style.left = '0';
        this.blacklightCanvas.style.pointerEvents = 'none';
        this.blacklightCanvas.style.display = 'none';
        this.canvas.parentElement.appendChild(this.blacklightCanvas);
        this.blacklightCtx = this.blacklightCanvas.getContext('2d');
        this.blacklightVisible = false;

        // Infrared canvas
        this.infraredCanvas = document.createElement('canvas');
        this.infraredCanvas.style.position = 'absolute';
        this.infraredCanvas.style.top = '0';
        this.infraredCanvas.style.left = '0';
        this.infraredCanvas.style.pointerEvents = 'none';
        this.infraredCanvas.style.display = 'none';
        this.canvas.parentElement.appendChild(this.infraredCanvas);
        this.infraredCtx = this.infraredCanvas.getContext('2d');
        this.infraredVisible = false;
    }

    bindEvents() {
        // Gérer le chargement d'image
        if (this.imageInput) {
            this.imageInput.addEventListener('change', (e) => {
                console.log('Change event triggered');
                const file = e.target.files[0];
                if (file) {
                    if (file.type.startsWith('image/')) {
                        this.processImage(file);
                    } else {
                        this.showError('The file must be an image');
                    }
                }
            });
        }

        // Gérer les exports
        const exportJSONBtn = document.getElementById('exportJSON');
        const exportCSVBtn = document.getElementById('exportCSV');
        const exportExifTextBtn = document.getElementById('exportExifText');

        if (exportJSONBtn) {
            exportJSONBtn.addEventListener('click', () => {
                console.log('JSON export requested');
                this.exportManager.exportJSON();
            });
        }

        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => {
                console.log('CSV export requested');
                this.exportManager.exportCSV();
            });
        }

        if (exportExifTextBtn) {
            exportExifTextBtn.addEventListener('click', () => {
                console.log('EXIF text export requested');
                this.exportManager.exportExifText();
            });
        }

        // Heatmap toggle
        const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
        if (toggleHeatmapBtn) {
            toggleHeatmapBtn.addEventListener('click', () => {
                this.toggleHeatmap();
            });
        }

        // Block analysis toggle
        const toggleBlockBtn = document.getElementById('toggleBlockAnalysis');
        if (toggleBlockBtn) {
            toggleBlockBtn.addEventListener('click', () => {
                this.toggleBlockAnalysis();
            });
        }

        // Edge detection toggle
        const toggleEdgeBtn = document.getElementById('toggleEdgeDetection');
        if (toggleEdgeBtn) {
            toggleEdgeBtn.addEventListener('click', () => {
                this.toggleEdgeDetection();
            });
        }

        // RGB channel toggle
        const toggleChannelBtn = document.getElementById('toggleRGBChannels');
        if (toggleChannelBtn) {
            toggleChannelBtn.addEventListener('click', () => {
                this.cycleRGBChannel();
            });
        }

        // Magnifier toggle
        const toggleMagnifierBtn = document.getElementById('toggleMagnifier');
        if (toggleMagnifierBtn) {
            toggleMagnifierBtn.addEventListener('click', () => {
                this.toggleMagnifier();
            });
        }

        // Histogram toggle
        const toggleHistogramBtn = document.getElementById('toggleHistogram');
        if (toggleHistogramBtn) {
            toggleHistogramBtn.addEventListener('click', () => {
                this.toggleHistogram();
            });
        }

        // Blacklight UV toggle
        const toggleBlacklightBtn = document.getElementById('toggleBlacklight');
        if (toggleBlacklightBtn) {
            toggleBlacklightBtn.addEventListener('click', () => {
                this.toggleBlacklight();
            });
        }

        // Infrared toggle
        const toggleInfraredBtn = document.getElementById('toggleInfrared');
        if (toggleInfraredBtn) {
            toggleInfraredBtn.addEventListener('click', () => {
                this.toggleInfrared();
            });
        }

        // Brightness/Contrast controls
        const brightnessSlider = document.getElementById('brightnessSlider');
        const contrastSlider = document.getElementById('contrastSlider');
        const brightnessValue = document.getElementById('brightnessValue');
        const contrastValue = document.getElementById('contrastValue');
        const resetAdjustmentsBtn = document.getElementById('resetAdjustments');

        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                this.brightness = parseInt(e.target.value);
                if (brightnessValue) brightnessValue.textContent = this.brightness;
                this.applyBrightnessContrast();
            });
        }

        if (contrastSlider) {
            contrastSlider.addEventListener('input', (e) => {
                this.contrast = parseInt(e.target.value);
                if (contrastValue) contrastValue.textContent = this.contrast;
                this.applyBrightnessContrast();
            });
        }

        if (resetAdjustmentsBtn) {
            resetAdjustmentsBtn.addEventListener('click', () => {
                this.brightness = 0;
                this.contrast = 0;
                if (brightnessSlider) brightnessSlider.value = 0;
                if (contrastSlider) contrastSlider.value = 0;
                if (brightnessValue) brightnessValue.textContent = 0;
                if (contrastValue) contrastValue.textContent = 0;
                this.applyBrightnessContrast();
            });
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => {
                console.error('File reading error:', e);
                reject(new Error('Error reading the file'));
            };
            reader.readAsDataURL(file);
        });
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Error loading the image'));
            img.src = url;
        });
    }

    calculateDimensions(width, height) {
        const MAX_SIZE = 1024;
        let newWidth = width;
        let newHeight = height;

        if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
                newHeight = Math.round(height * (MAX_SIZE / width));
                newWidth = MAX_SIZE;
            } else {
                newWidth = Math.round(width * (MAX_SIZE / height));
                newHeight = MAX_SIZE;
            }
        }

        console.log(`Calculated dimensions: ${newWidth}x${newHeight} (original: ${width}x${height})`);
        return { width: newWidth, height: newHeight };
    }
	
// Method to calculate file size in human-readable format
formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Method to count unique colors in the image
countUniqueColors(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0, img.width, img.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const colorSet = new Set();

    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        // Create a unique color string, including alpha
        const colorKey = `${r},${g},${b},${a}`;
        colorSet.add(colorKey);
    }

    // Clean up canvas to prevent memory leaks
    canvas.width = 0;
    canvas.height = 0;

    return colorSet.size;
}

// Update the processImage method to include these details
async processImage(file) {
    console.log('Starting image processing');
    this.showLoading(true);

    // Reset all tools and parameters
    this.resetAllTools();

    try {
        const imageUrl = await this.readFileAsDataURL(file);
        const img = await this.loadImage(imageUrl);

        console.log('Image loaded, dimensions:', img.width, 'x', img.height);
        const dimensions = this.calculateDimensions(img.width, img.height);

        // Store current image details
        this.currentImageName = file.name;
        this.currentImageSize = this.formatFileSize(file.size);

        await this.drawImage(img, dimensions);
        await this.analyzeImage(img, file);

    } catch (error) {
        console.error('Error during image processing:', error);
        this.showError('Error during image processing: ' + error.message);
    } finally {
        this.showLoading(false);
    }
}


async drawImage(img, dimensions) {
    if (!this.canvas || !this.ctx) {
        throw new Error('Canvas not initialized');
    }

    try {
        // Store current image for later use
        this.currentImage = img;

        // Hide welcome message when image is loaded
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }

        this.canvas.width = dimensions.width;
        this.canvas.height = dimensions.height;
        this.canvas.style.display = 'block';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
        console.log('Image drawn on canvas');

        // Setup pixel tooltip events
        this.setupPixelTooltip();

        // Create or update image details container
        this.displayImageDetails(img);

    } catch (error) {
        console.error('Error drawing the image:', error);
        throw new Error('Error drawing the image');
    }
}

	displayImageDetails(img) {
    // Find or create the container for image details
    let detailsContainer = document.querySelector('.image-details');
    if (!detailsContainer) {
        detailsContainer = document.createElement('div');
        detailsContainer.className = 'image-details';
        this.canvas.insertAdjacentElement('afterend', detailsContainer);
    }

    // Calculate unique colors
    const uniqueColors = this.countUniqueColors(img);

    // Update the details
    detailsContainer.innerHTML = `
        <h3>Image Details</h3>
        <p><strong>Name:</strong> ${this.currentImageName || 'N/A'}</p>
        <p><strong>Size:</strong> ${this.currentImageSize || 'N/A'}</p>
        <p><strong>Unique Colors:</strong> ${uniqueColors}</p>
    `;
}

    async analyzeImage(img, file) {
        try {
            console.log('Starting image analysis');

            // Analyser l'image pour détecter les caractéristiques d'IA
            const analysis = await this.imageAnalyzer.analyze(img);
            console.log('Analysis completed:', analysis);

            // Lire les métadonnées EXIF
            const exifData = await this.exifReader.readExif(file);
            console.log('EXIF data read:', exifData);

            // Calculer le score et afficher les résultats
            const score = this.imageAnalyzer.calculateScore(analysis);
            const indicators = this.imageAnalyzer.getIndicators(analysis);

            // Store analysis for heatmap
            this.currentAnalysis = analysis;

            // Mettre à jour l'interface
            this.displayResults(score, indicators, exifData);

            // Generate heatmap data
            this.generateHeatmapData(img);

            // Show analysis tools container
            const analysisToolsContainer = document.getElementById('analysisToolsContainer');
            if (analysisToolsContainer) {
                analysisToolsContainer.style.removeProperty('display');
            }

            // Show brightness/contrast controls
            const bcControls = document.getElementById('brightnessContrastControls');
            if (bcControls) {
                bcControls.style.removeProperty('display');
            }

            // Generate block analysis data
            this.generateBlockAnalysisData(img);

            // Préparer les données pour l'export
            this.exportManager.setData({
                analysis: { ...analysis, score },
                exif: exifData,
                timestamp: new Date().toISOString()
            });

            console.log('Image processing completed successfully');

        } catch (error) {
            console.error('Error during analysis:', error);
            throw error;
        }
    }

    displayResults(score, indicators, exifData) {
        console.log('Displaying results...');

        // Afficher le score et les indicateurs
        this.analysisDataElement.innerHTML = `
            <h2>Analysis Results</h2>
            <div class="analysis-result">
                <h3>Probability of being AI-generated: ${score}%</h3>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${score}%;
                         background-color: ${this.getScoreColor(score)}">
                    </div>
                </div>
                ${indicators.length > 0 ? `
                    <h3>Detected Indicators:</h3>
                    <ul>
                        ${indicators.map(indicator => `<li>${indicator}</li>`).join('')}
                    </ul>
                ` : '<p>No significant indicators detected</p>'}
            </div>
        `;

        // Insert histogram container right after the h2 title
        if (!this.analysisDataElement.contains(this.histogramContainer)) {
            const h2Title = this.analysisDataElement.querySelector('h2');
            if (h2Title && h2Title.nextSibling) {
                this.analysisDataElement.insertBefore(this.histogramContainer, h2Title.nextSibling);
            } else {
                this.analysisDataElement.appendChild(this.histogramContainer);
            }
        }

        // Afficher les données EXIF si disponibles
        if (exifData && Object.keys(exifData).length > 0) {
            this.exifDataElement.innerHTML = `
                <h2>EXIF Metadata</h2>
                <div class="exif-items-grid">
                    ${Object.entries(exifData)
                        .map(([key, value]) => `
                            <div class="exif-item">
                                <strong>${key}</strong>
                                <div>${value}</div>
                            </div>
                        `).join('')}
                </div>
            `;
        } else {
            this.exifDataElement.innerHTML = `
                <h2>EXIF Metadata</h2>
                <p>No EXIF data found in the image</p>
            `;
        }
    }

    getScoreColor(score) {
        if (score >= 70) return '#ff4444';      // Rouge pour un score élevé
        if (score >= 50) return '#ffbb33';      // Orange pour un score moyen
        return '#00C851';                      // Vert pour un score faible
    }

    showError(message) {
        console.error('Error:', message);
        this.analysisDataElement.innerHTML = `
            <div class="error">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    setupPixelTooltip() {
        // Remove old listeners if any
        if (this.canvas._pixelTooltipListener) {
            this.canvas.removeEventListener('mousemove', this.canvas._pixelTooltipListener);
            this.canvas.removeEventListener('mouseleave', this.canvas._pixelTooltipLeaveListener);
        }

        // Create new listeners
        this.canvas._pixelTooltipListener = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
                const imageData = this.ctx.getImageData(x, y, 1, 1);
                const pixel = imageData.data;

                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];
                const a = pixel[3];

                const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
                const brightness = Math.round((r * 0.299 + g * 0.587 + b * 0.114));

                this.pixelTooltip.innerHTML = `
                    <div>
                        <span class="color-preview" style="background: rgba(${r},${g},${b},${a/255});"></span>
                        <strong>Pixel Info</strong>
                    </div>
                    <div>Position: (${x}, ${y})</div>
                    <div>RGB: (${r}, ${g}, ${b})</div>
                    <div>Alpha: ${a} (${Math.round(a/255*100)}%)</div>
                    <div>Hex: ${hex}</div>
                    <div>Brightness: ${brightness}/255</div>
                `;

                this.pixelTooltip.classList.add('active');
                this.pixelTooltip.style.left = (e.clientX + 15) + 'px';
                this.pixelTooltip.style.top = (e.clientY + 15) + 'px';
            }
        };

        this.canvas._pixelTooltipLeaveListener = () => {
            this.pixelTooltip.classList.remove('active');
        };

        this.canvas.addEventListener('mousemove', this.canvas._pixelTooltipListener);
        this.canvas.addEventListener('mouseleave', this.canvas._pixelTooltipLeaveListener);
    }

    generateHeatmapData(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        const width = tempCanvas.width;
        const height = tempCanvas.height;

        // Create heatmap data based on suspicious features
        const heatmapData = new Uint8ClampedArray(width * height);
        const blockSize = 16; // Analyze in 16x16 blocks

        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                let suspicionScore = 0;

                // Analyze block
                const colors = new Set();
                let edgeCount = 0;
                let uniformity = 0;

                for (let by = 0; by < blockSize && y + by < height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];

                        colors.add(`${Math.floor(r/32)},${Math.floor(g/32)},${Math.floor(b/32)}`);

                        // Check edges
                        if (bx < blockSize - 1) {
                            const nextIdx = ((y + by) * width + (x + bx + 1)) * 4;
                            const diff = Math.abs(data[idx] - data[nextIdx]) +
                                       Math.abs(data[idx+1] - data[nextIdx+1]) +
                                       Math.abs(data[idx+2] - data[nextIdx+2]);
                            if (diff > 100) edgeCount++;
                        }
                    }
                }

                // Calculate suspicion based on features
                if (colors.size < 10) suspicionScore += 40; // Limited colors
                if (edgeCount > blockSize * 2) suspicionScore += 30; // Many sharp edges
                if (colors.size > 50) suspicionScore -= 20; // Natural variation

                suspicionScore = Math.max(0, Math.min(100, suspicionScore));

                // Fill block with suspicion score
                for (let by = 0; by < blockSize && y + by < height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        heatmapData[(y + by) * width + (x + bx)] = suspicionScore;
                    }
                }
            }
        }

        this.heatmapData = heatmapData;

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    toggleHeatmap() {
        this.heatmapVisible = !this.heatmapVisible;

        if (this.heatmapVisible) {
            this.renderHeatmap();
            this.heatmapCanvas.style.display = 'block';
        } else {
            this.heatmapCanvas.style.display = 'none';
        }
    }

    renderHeatmap() {
        if (!this.heatmapData) return;

        const rect = this.canvas.getBoundingClientRect();
        this.heatmapCanvas.width = this.canvas.width;
        this.heatmapCanvas.height = this.canvas.height;
        this.heatmapCanvas.style.width = rect.width + 'px';
        this.heatmapCanvas.style.height = rect.height + 'px';

        const imageData = this.heatmapCtx.createImageData(this.heatmapCanvas.width, this.heatmapCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < this.heatmapData.length; i++) {
            const suspicion = this.heatmapData[i];
            const idx = i * 4;

            // Enhanced color mapping: green (low) -> yellow (medium) -> red (high)
            if (suspicion < 30) {
                data[idx] = 0;
                data[idx + 1] = 220;
                data[idx + 2] = 0;
                data[idx + 3] = Math.floor(suspicion * 3.5); // More visible
            } else if (suspicion < 60) {
                data[idx] = 255;
                data[idx + 1] = 220;
                data[idx + 2] = 0;
                data[idx + 3] = Math.floor((suspicion - 30) * 6); // More visible
            } else {
                data[idx] = 255;
                data[idx + 1] = Math.floor(200 - (suspicion - 60) * 4);
                data[idx + 2] = 0;
                data[idx + 3] = Math.min(230, Math.floor((suspicion - 60) * 6)); // More visible
            }
        }

        this.heatmapCtx.putImageData(imageData, 0, 0);
    }

    onHeatmapHover(e) {
        if (!this.heatmapData) return;

        const rect = this.heatmapCanvas.getBoundingClientRect();
        const scaleX = this.heatmapCanvas.width / rect.width;
        const scaleY = this.heatmapCanvas.height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x >= 0 && x < this.heatmapCanvas.width && y >= 0 && y < this.heatmapCanvas.height) {
            const suspicion = this.heatmapData[y * this.heatmapCanvas.width + x];

            let level, color;
            if (suspicion < 30) {
                level = '🟢 LOW Suspicion';
                color = '#00ff00';
            } else if (suspicion < 60) {
                level = '🟡 MEDIUM Suspicion';
                color = '#ffff00';
            } else {
                level = '🔴 HIGH Suspicion';
                color = '#ff0000';
            }

            this.heatmapTooltip.innerHTML = `<span style="color: ${color}">${level}</span> (${Math.round(suspicion)}%)`;
            this.heatmapTooltip.classList.add('active');
            this.heatmapTooltip.style.left = (e.clientX + 15) + 'px';
            this.heatmapTooltip.style.top = (e.clientY + 15) + 'px';
        }
    }

    generateBlockAnalysisData(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        const width = tempCanvas.width;
        const height = tempCanvas.height;

        // Store for rendering
        this.blockAnalysisData = {
            width,
            height,
            jpegBlocks: [],
            repeatedPatterns: []
        };

        // Detect 8x8 JPEG blocks
        for (let y = 0; y < height; y += 8) {
            for (let x = 0; x < width; x += 8) {
                let blockBoundary = 0;

                // Check horizontal boundary
                if (y > 0) {
                    for (let bx = 0; bx < 8 && x + bx < width; bx++) {
                        const idx = (y * width + x + bx) * 4;
                        const aboveIdx = ((y - 1) * width + x + bx) * 4;
                        const diff = Math.abs(data[idx] - data[aboveIdx]) +
                                   Math.abs(data[idx+1] - data[aboveIdx+1]) +
                                   Math.abs(data[idx+2] - data[aboveIdx+2]);
                        if (diff > 15) blockBoundary++;
                    }
                }

                // Check vertical boundary
                if (x > 0) {
                    for (let by = 0; by < 8 && y + by < height; by++) {
                        const idx = ((y + by) * width + x) * 4;
                        const leftIdx = ((y + by) * width + x - 1) * 4;
                        const diff = Math.abs(data[idx] - data[leftIdx]) +
                                   Math.abs(data[idx+1] - data[leftIdx+1]) +
                                   Math.abs(data[idx+2] - data[leftIdx+2]);
                        if (diff > 15) blockBoundary++;
                    }
                }

                if (blockBoundary > 5) {
                    this.blockAnalysisData.jpegBlocks.push({ x, y });
                }
            }
        }

        // Detect repeating patterns (16x16 blocks)
        const blockSize = 16;
        const patternMap = new Map();

        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                // Get block signature
                let signature = '';
                for (let by = 0; by < blockSize; by += 4) {
                    for (let bx = 0; bx < blockSize; bx += 4) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        signature += `${Math.floor(data[idx]/32)},${Math.floor(data[idx+1]/32)},${Math.floor(data[idx+2]/32)};`;
                    }
                }

                if (patternMap.has(signature)) {
                    patternMap.get(signature).push({ x, y });
                } else {
                    patternMap.set(signature, [{ x, y }]);
                }
            }
        }

        // Find repeated patterns (appearing 3+ times)
        patternMap.forEach((locations, signature) => {
            if (locations.length >= 3) {
                locations.forEach(loc => {
                    this.blockAnalysisData.repeatedPatterns.push(loc);
                });
            }
        });

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    toggleBlockAnalysis() {
        this.blockVisible = !this.blockVisible;

        if (this.blockVisible) {
            this.renderBlockAnalysis();
            this.blockCanvas.style.display = 'block';
        } else {
            this.blockCanvas.style.display = 'none';
        }
    }

    renderBlockAnalysis() {
        if (!this.blockAnalysisData) return;

        const rect = this.canvas.getBoundingClientRect();
        this.blockCanvas.width = this.canvas.width;
        this.blockCanvas.height = this.canvas.height;
        this.blockCanvas.style.width = rect.width + 'px';
        this.blockCanvas.style.height = rect.height + 'px';

        this.blockCtx.clearRect(0, 0, this.blockCanvas.width, this.blockCanvas.height);

        // Draw JPEG blocks (blue grid)
        this.blockCtx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
        this.blockCtx.lineWidth = 1;
        this.blockAnalysisData.jpegBlocks.forEach(({ x, y }) => {
            this.blockCtx.strokeRect(x, y, 8, 8);
        });

        // Draw repeated patterns (magenta boxes)
        this.blockCtx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
        this.blockCtx.lineWidth = 2;
        this.blockAnalysisData.repeatedPatterns.forEach(({ x, y }) => {
            this.blockCtx.strokeRect(x, y, 16, 16);
        });

        // Add legend
        this.blockCtx.font = '12px Arial';
        this.blockCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.blockCtx.fillRect(10, 10, 180, 50);

        this.blockCtx.fillStyle = 'rgba(0, 100, 255, 0.9)';
        this.blockCtx.fillText('JPEG Blocks (8x8)', 20, 30);

        this.blockCtx.fillStyle = 'rgba(255, 0, 255, 0.9)';
        this.blockCtx.fillText('Repeated Patterns', 20, 50);
    }

    // Edge Detection Methods
    toggleEdgeDetection() {
        this.edgeVisible = !this.edgeVisible;

        if (this.edgeVisible) {
            this.renderEdgeDetection();
            this.edgeCanvas.style.display = 'block';
        } else {
            this.edgeCanvas.style.display = 'none';
        }
    }

    renderEdgeDetection() {
        if (!this.currentImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        const width = tempCanvas.width;
        const height = tempCanvas.height;

        // Convert to grayscale
        const gray = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            gray[idx] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }

        // Sobel edge detection
        const edges = new Uint8ClampedArray(width * height * 4);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                // Sobel kernels
                const gx =
                    -gray[(y-1)*width + (x-1)] + gray[(y-1)*width + (x+1)] +
                    -2*gray[y*width + (x-1)] + 2*gray[y*width + (x+1)] +
                    -gray[(y+1)*width + (x-1)] + gray[(y+1)*width + (x+1)];

                const gy =
                    -gray[(y-1)*width + (x-1)] - 2*gray[(y-1)*width + x] - gray[(y-1)*width + (x+1)] +
                    gray[(y+1)*width + (x-1)] + 2*gray[(y+1)*width + x] + gray[(y+1)*width + (x+1)];

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const normalized = Math.min(255, magnitude);

                const pixelIdx = idx * 4;
                edges[pixelIdx] = normalized;     // R
                edges[pixelIdx + 1] = normalized; // G
                edges[pixelIdx + 2] = 255;        // B (cyan edges)
                edges[pixelIdx + 3] = normalized > 50 ? 200 : 0; // Alpha
            }
        }

        const rect = this.canvas.getBoundingClientRect();
        this.edgeCanvas.width = this.canvas.width;
        this.edgeCanvas.height = this.canvas.height;
        this.edgeCanvas.style.width = rect.width + 'px';
        this.edgeCanvas.style.height = rect.height + 'px';

        const edgeImageData = new ImageData(edges, width, height);
        this.edgeCtx.putImageData(edgeImageData, 0, 0);

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    // RGB Channel Methods
    cycleRGBChannel() {
        const channels = ['rgb', 'r', 'g', 'b'];
        const currentIndex = channels.indexOf(this.currentChannel);
        this.currentChannel = channels[(currentIndex + 1) % channels.length];

        const btn = document.getElementById('toggleRGBChannels');
        if (btn) {
            btn.textContent = `RGB: ${this.currentChannel.toUpperCase()}`;
        }

        if (this.currentChannel === 'rgb') {
            this.channelCanvas.style.display = 'none';
            this.channelVisible = false;
        } else {
            this.renderRGBChannel();
            this.channelCanvas.style.display = 'block';
            this.channelVisible = true;
        }
    }

    renderRGBChannel() {
        if (!this.currentImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Filter based on selected channel
        for (let i = 0; i < data.length; i += 4) {
            if (this.currentChannel === 'r') {
                data[i + 1] = 0; // Zero out green
                data[i + 2] = 0; // Zero out blue
            } else if (this.currentChannel === 'g') {
                data[i] = 0;     // Zero out red
                data[i + 2] = 0; // Zero out blue
            } else if (this.currentChannel === 'b') {
                data[i] = 0;     // Zero out red
                data[i + 1] = 0; // Zero out green
            }
        }

        const rect = this.canvas.getBoundingClientRect();
        this.channelCanvas.width = this.canvas.width;
        this.channelCanvas.height = this.canvas.height;
        this.channelCanvas.style.width = rect.width + 'px';
        this.channelCanvas.style.height = rect.height + 'px';

        this.channelCtx.putImageData(imageData, 0, 0);

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    // Magnifier Methods
    toggleMagnifier() {
        this.magnifierVisible = !this.magnifierVisible;

        if (this.magnifierVisible) {
            this.magnifierContainer.style.display = 'block';
            this.setupMagnifier();
        } else {
            this.magnifierContainer.style.display = 'none';
            if (this.canvas._magnifierListener) {
                this.canvas.removeEventListener('mousemove', this.canvas._magnifierListener);
                this.canvas.removeEventListener('mouseleave', this.canvas._magnifierLeaveListener);
            }
        }
    }

    setupMagnifier() {
        if (this.canvas._magnifierListener) {
            this.canvas.removeEventListener('mousemove', this.canvas._magnifierListener);
            this.canvas.removeEventListener('mouseleave', this.canvas._magnifierLeaveListener);
        }

        this.canvas._magnifierListener = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);

            this.renderMagnifier(x, y);
            this.magnifierContainer.style.left = (e.clientX + 20) + 'px';
            this.magnifierContainer.style.top = (e.clientY + 20) + 'px';
        };

        this.canvas._magnifierLeaveListener = () => {
            this.magnifierContainer.style.display = 'none';
        };

        this.canvas.addEventListener('mousemove', this.canvas._magnifierListener);
        this.canvas.addEventListener('mouseleave', this.canvas._magnifierLeaveListener);
    }

    renderMagnifier(centerX, centerY) {
        const zoom = 8; // 8x magnification
        const size = 25; // 25x25 pixel area
        const halfSize = Math.floor(size / 2);

        this.magnifierCtx.clearRect(0, 0, 200, 200);

        // Draw magnified area
        const sx = Math.max(0, centerX - halfSize);
        const sy = Math.max(0, centerY - halfSize);
        const sw = Math.min(size, this.canvas.width - sx);
        const sh = Math.min(size, this.canvas.height - sy);

        this.magnifierCtx.imageSmoothingEnabled = false;
        this.magnifierCtx.drawImage(
            this.canvas,
            sx, sy, sw, sh,
            0, 0, 200, 200
        );

        // Draw grid
        this.magnifierCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.magnifierCtx.lineWidth = 1;
        for (let i = 0; i <= size; i++) {
            const pos = (i / size) * 200;
            this.magnifierCtx.beginPath();
            this.magnifierCtx.moveTo(pos, 0);
            this.magnifierCtx.lineTo(pos, 200);
            this.magnifierCtx.stroke();
            this.magnifierCtx.beginPath();
            this.magnifierCtx.moveTo(0, pos);
            this.magnifierCtx.lineTo(200, pos);
            this.magnifierCtx.stroke();
        }

        // Draw crosshair
        this.magnifierCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        this.magnifierCtx.lineWidth = 2;
        this.magnifierCtx.beginPath();
        this.magnifierCtx.moveTo(100, 0);
        this.magnifierCtx.lineTo(100, 200);
        this.magnifierCtx.stroke();
        this.magnifierCtx.beginPath();
        this.magnifierCtx.moveTo(0, 100);
        this.magnifierCtx.lineTo(200, 100);
        this.magnifierCtx.stroke();
    }

    // Histogram Methods
    toggleHistogram() {
        this.histogramVisible = !this.histogramVisible;

        if (this.histogramVisible) {
            this.renderHistogram();
            this.histogramContainer.style.display = 'block';
        } else {
            this.histogramContainer.style.display = 'none';
        }
    }

    renderHistogram() {
        if (!this.currentImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Calculate histograms
        const histR = new Array(256).fill(0);
        const histG = new Array(256).fill(0);
        const histB = new Array(256).fill(0);

        for (let i = 0; i < data.length; i += 4) {
            histR[data[i]]++;
            histG[data[i + 1]]++;
            histB[data[i + 2]]++;
        }

        // Normalize
        const maxR = Math.max(...histR);
        const maxG = Math.max(...histG);
        const maxB = Math.max(...histB);
        const maxVal = Math.max(maxR, maxG, maxB);

        // Clear canvas
        this.histogramCtx.fillStyle = '#1a1a1a';
        this.histogramCtx.fillRect(0, 0, 512, 200);

        // Draw histograms
        const drawHist = (hist, color, alpha) => {
            this.histogramCtx.strokeStyle = color;
            this.histogramCtx.globalAlpha = alpha;
            this.histogramCtx.lineWidth = 2;
            this.histogramCtx.beginPath();
            for (let i = 0; i < 256; i++) {
                const x = i * 2;
                const y = 200 - (hist[i] / maxVal * 180);
                if (i === 0) {
                    this.histogramCtx.moveTo(x, y);
                } else {
                    this.histogramCtx.lineTo(x, y);
                }
            }
            this.histogramCtx.stroke();
        };

        drawHist(histR, '#ff0000', 0.7);
        drawHist(histG, '#00ff00', 0.7);
        drawHist(histB, '#0000ff', 0.7);

        this.histogramCtx.globalAlpha = 1.0;

        // Draw grid
        this.histogramCtx.strokeStyle = '#444';
        this.histogramCtx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = i * 50;
            this.histogramCtx.beginPath();
            this.histogramCtx.moveTo(0, y);
            this.histogramCtx.lineTo(512, y);
            this.histogramCtx.stroke();
        }

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    // Brightness/Contrast Methods
    applyBrightnessContrast() {
        if (!this.currentImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.currentImage, 0, 0, tempCanvas.width, tempCanvas.height);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        const contrast = this.contrast;
        const brightness = this.brightness;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = this.clamp(factor * (data[i] - 128) + 128 + brightness);
            data[i + 1] = this.clamp(factor * (data[i + 1] - 128) + 128 + brightness);
            data[i + 2] = this.clamp(factor * (data[i + 2] - 128) + 128 + brightness);
        }

        this.ctx.putImageData(imageData, 0, 0);

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;

        // Re-render active overlays
        if (this.edgeVisible) this.renderEdgeDetection();
        if (this.channelVisible) this.renderRGBChannel();
        if (this.histogramVisible) this.renderHistogram();
    }

    clamp(value) {
        return Math.max(0, Math.min(255, value));
    }

    // Blacklight UV Methods
    toggleBlacklight() {
        this.blacklightVisible = !this.blacklightVisible;

        if (this.blacklightVisible) {
            this.renderBlacklight();
            this.blacklightCanvas.style.display = 'block';
        } else {
            this.blacklightCanvas.style.display = 'none';
        }
    }

    renderBlacklight() {
        if (!this.currentImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Blacklight UV effect: Enhance blue/violet channels, suppress red
        // Creates a fluorescent effect revealing hidden details
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // UV effect: boost blue/violet, reduce red/green
            data[i] = Math.min(255, b * 0.3 + luminance * 0.2);     // R (reduced)
            data[i + 1] = Math.min(255, g * 0.5 + b * 0.3);          // G (medium)
            data[i + 2] = Math.min(255, b * 1.5 + luminance * 0.3); // B (enhanced)

            // Add fluorescent glow effect
            const intensity = (b - r) * 0.5;
            if (intensity > 30) {
                data[i] = Math.min(255, data[i] + intensity * 0.3);
                data[i + 1] = Math.min(255, data[i + 1] + intensity * 0.5);
                data[i + 2] = Math.min(255, data[i + 2] + intensity);
            }
        }

        const rect = this.canvas.getBoundingClientRect();
        this.blacklightCanvas.width = this.canvas.width;
        this.blacklightCanvas.height = this.canvas.height;
        this.blacklightCanvas.style.width = rect.width + 'px';
        this.blacklightCanvas.style.height = rect.height + 'px';

        this.blacklightCtx.putImageData(imageData, 0, 0);

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    // Infrared Methods
    toggleInfrared() {
        this.infraredVisible = !this.infraredVisible;

        if (this.infraredVisible) {
            this.renderInfrared();
            this.infraredCanvas.style.display = 'block';
        } else {
            this.infraredCanvas.style.display = 'none';
        }
    }

    renderInfrared() {
        if (!this.currentImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.drawImage(this.canvas, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;

        // Infrared effect: Red/near-infrared enhancement
        // Vegetation appears bright, water dark, synthetic materials distinctive
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate vegetation index (NDVI-like)
            const vegetationIndex = (g - r) / (g + r + 1);

            // IR channel simulation: Red channel enhanced, blue suppressed
            const irValue = r * 1.2 + g * 0.8 - b * 0.3;

            // False color IR mapping
            data[i] = Math.min(255, Math.max(0, irValue * 1.3));              // R (IR channel)
            data[i + 1] = Math.min(255, Math.max(0, r * 0.8 + g * 0.5));      // G (visible red)
            data[i + 2] = Math.min(255, Math.max(0, g * 0.6 + b * 0.2));      // B (visible green)

            // Enhance vegetation (appears magenta/red in IR)
            if (vegetationIndex > 0.1) {
                data[i] = Math.min(255, data[i] + vegetationIndex * 100);
                data[i + 2] = Math.min(255, data[i + 2] + vegetationIndex * 50);
            }
        }

        const rect = this.canvas.getBoundingClientRect();
        this.infraredCanvas.width = this.canvas.width;
        this.infraredCanvas.height = this.canvas.height;
        this.infraredCanvas.style.width = rect.width + 'px';
        this.infraredCanvas.style.height = rect.height + 'px';

        this.infraredCtx.putImageData(imageData, 0, 0);

        // Clean up
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }

    resetAllTools() {
        // Hide all overlays
        if (this.heatmapCanvas) this.heatmapCanvas.style.display = 'none';
        if (this.blockCanvas) this.blockCanvas.style.display = 'none';
        if (this.edgeCanvas) this.edgeCanvas.style.display = 'none';
        if (this.channelCanvas) this.channelCanvas.style.display = 'none';
        if (this.magnifierContainer) this.magnifierContainer.style.display = 'none';
        if (this.histogramContainer) this.histogramContainer.style.display = 'none';
        if (this.blacklightCanvas) this.blacklightCanvas.style.display = 'none';
        if (this.infraredCanvas) this.infraredCanvas.style.display = 'none';

        // Reset visibility flags
        this.heatmapVisible = false;
        this.blockVisible = false;
        this.edgeVisible = false;
        this.channelVisible = false;
        this.magnifierVisible = false;
        this.histogramVisible = false;
        this.blacklightVisible = false;
        this.infraredVisible = false;

        // Reset RGB channel to default
        this.currentChannel = 'rgb';
        const rgbBtn = document.getElementById('toggleRGBChannels');
        if (rgbBtn) rgbBtn.textContent = 'RGB: RGB';

        // Reset brightness/contrast
        this.brightness = 0;
        this.contrast = 0;
        const brightnessSlider = document.getElementById('brightnessSlider');
        const contrastSlider = document.getElementById('contrastSlider');
        const brightnessValue = document.getElementById('brightnessValue');
        const contrastValue = document.getElementById('contrastValue');
        if (brightnessSlider) brightnessSlider.value = 0;
        if (contrastSlider) contrastSlider.value = 0;
        if (brightnessValue) brightnessValue.textContent = 0;
        if (contrastValue) contrastValue.textContent = 0;

        // Remove magnifier listeners if active
        if (this.canvas && this.canvas._magnifierListener) {
            this.canvas.removeEventListener('mousemove', this.canvas._magnifierListener);
            this.canvas.removeEventListener('mouseleave', this.canvas._magnifierLeaveListener);
        }

        console.log('All tools and parameters have been reset');
    }

    showLoading(show) {
        if (this.loadingElement) {
            this.loadingElement.style.display = show ? 'block' : 'none';
        }
        if (this.canvas) {
            this.canvas.style.opacity = show ? '0.5' : '1';
        }
    }
}
