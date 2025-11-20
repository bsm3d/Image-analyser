/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class ExportManager {
    constructor() {
        console.log('ExportManager initialized');
        this.data = null;
        this.exifReader = new ExifReader();
    }
    setData(data) {
        console.log('Data updated for export');
		this.data = {
            ...data,
            timestamp: new Date().toISOString()
        };
    }

    exportJSON() {
        console.log('JSON export requested');
        if (!this.data) {
            console.error('No datas to export');
            return;
        }

        const content = JSON.stringify(this.data, null, 2);
        this.downloadFile(content, 'analysis_result.json', 'application/json');
    }

    exportCSV() {
        console.log('CSV export requested');
        if (!this.data) {
            console.error('No datas to export');
            return;
        }

        const headers = ['Timestamp', 'AI Score', 'Artefacts', 'Uniformity', 'Complexity', 'Unique Colors', 'Average Saturation'];
        const rows = [];

        const row = [
            new Date().toLocaleString(),
            this.data.analysis.score,
            this.data.analysis.patterns.sharpEdges,
            this.data.analysis.textures.uniformity,
            this.data.analysis.textures.complexity,
            this.data.analysis.colors.uniqueColors,
            this.data.analysis.colors.averageSaturation
        ];

        rows.push(row);

        // Créer le contenu CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'analysis_result.csv', 'text/csv');
    }

    exportExifText() {
        console.log('Txt export requested');
        if (!this.data || !this.data.exif) {
            console.error('No datas to export');
            return;
        }

        const textContent = this.exifReader.exportAsText(this.data.exif);
        this.downloadFile(textContent, 'exif_data.txt', 'text/plain');
    }

    downloadFile(content, filename, type) {
        try {
            console.log(`Download file ${filename}`);
            const blob = new Blob([content], { type: type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            
            link.click();
            
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('Download done');
        } catch (error) {
            console.error('Download error:', error);
        }
    }
}