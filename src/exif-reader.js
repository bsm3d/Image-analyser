/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class ExifReader {
    constructor() {
        if (typeof EXIF === 'undefined') {
            console.error('La librairie EXIF.js n\'est pas chargée');
            throw new Error('La librairie EXIF.js est requise');
        }
        console.log('ExifReader initialisé');
    }

    readExif(file) {
        const self = this;
        return new Promise((resolve, reject) => {
            EXIF.getData(file, function() {
                try {
                    console.log('Lecture des données EXIF...');
                    const exifData = EXIF.getAllTags(this);
                    console.log('Données EXIF trouvées:', exifData);
                    resolve(self.formatExifData(exifData));
                } catch (error) {
                    console.error('Erreur lors de la lecture des données EXIF:', error);
                    reject(error);
                }
            });
        });
    }

    formatExifData(exifData) {
        const relevantTags = {
            // Informations sur l'appareil
            'Make': 'Marque appareil',
            'Model': 'Modèle appareil',
            'LensMake': 'Marque objectif',
            'LensModel': 'Modèle objectif',
            'CameraSerialNumber': 'N° série appareil',
            'LensSerialNumber': 'N° série objectif',

            // Date et logiciel
            'DateTimeOriginal': 'Date de prise',
            'CreateDate': 'Date de création',
            'ModifyDate': 'Date de modification',
            'Software': 'Logiciel',
            
            // Paramètres de prise de vue
            'ExposureTime': 'Temps d\'exposition',
            'FNumber': 'Ouverture',
            'ExposureProgram': 'Programme',
            'ISOSpeedRatings': 'ISO',
            'ExposureBiasValue': 'Compensation exposition',
            'MaxApertureValue': 'Ouverture max',
            'MeteringMode': 'Mode de mesure',
            'LightSource': 'Source lumière',
            'Flash': 'Flash',
            'FocalLength': 'Focale',
            'WhiteBalance': 'Balance des blancs',
            'DigitalZoomRatio': 'Zoom numérique',

            // Information sur l'image
            'ImageWidth': 'Largeur',
            'ImageHeight': 'Hauteur',
            'BitsPerSample': 'Bits par pixel',
            'PhotometricInterpretation': 'Interprétation',
            'Orientation': 'Orientation',
            'SamplesPerPixel': 'Échantillons/pixel',
            'XResolution': 'Résolution X',
            'YResolution': 'Résolution Y',
            'ResolutionUnit': 'Unité résolution',
            'ColorSpace': 'Espace colorimétrique',

            // Copyright et auteur
            'Artist': 'Photographe',
            'Copyright': 'Copyright',
            'UserComment': 'Commentaire',

            // GPS
            'GPSLatitude': 'Latitude',
            'GPSLongitude': 'Longitude',
            'GPSAltitude': 'Altitude',
            'GPSTimeStamp': 'Heure GPS',
            'GPSDateStamp': 'Date GPS'
        };

        const formatted = {};
        
        for (const [key, label] of Object.entries(relevantTags)) {
            if (exifData[key] !== undefined) {
                formatted[label] = this.formatExifValue(key, exifData[key]);
            }
        }

        // Ajouter coordonnées GPS si disponibles
        if (exifData.GPSLatitude && exifData.GPSLongitude) {
            formatted['Coordonnées GPS'] = this.formatGPSCoordinates(exifData);
        }

        return formatted;
    }

    formatExifValue(key, value) {
        if (value === undefined || value === null) return 'Non disponible';

        // Handle empty byte arrays (like empty UserComment)
        if (Array.isArray(value) && value.every(v => v === 0)) {
            return 'Non disponible';
        }

        // Handle string-like byte arrays
        if (Array.isArray(value) && typeof value[0] === 'number') {
            // Convert byte array to string, filter out null bytes
            const str = String.fromCharCode(...value.filter(v => v !== 0));
            if (str.trim().length === 0) {
                return 'Non disponible';
            }
            return str.trim();
        }

        switch(key) {
            // Dates
            case 'DateTimeOriginal':
            case 'CreateDate':
            case 'ModifyDate':
                try {
                    if (typeof value === 'string' && value.match(/^\d{4}:\d{2}:\d{2}/)) {
                        const dateStr = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                            return date.toLocaleString();
                        }
                    }
                    return value;
                } catch (e) {
                    console.warn('Error parsing date:', key, value, e);
                    return value;
                }

            // Valeurs d'exposition
            case 'ExposureTime':
                return value < 1 ? `1/${Math.round(1/value)}s` : `${value}s`;
            case 'FNumber':
                return `ƒ/${value}`;
            case 'ExposureBiasValue':
                return `${value > 0 ? '+' : ''}${value} EV`;
            case 'FocalLength':
                return `${Math.round(value)}mm`;
            case 'ISOSpeedRatings':
                return `ISO ${value}`;
                
            // Modes et programmes
            case 'ExposureProgram':
                const programs = {
                    0: 'Non défini',
                    1: 'Manuel',
                    2: 'Programme normal',
                    3: 'Priorité ouverture',
                    4: 'Priorité vitesse',
                    5: 'Programme créatif',
                    6: 'Programme action',
                    7: 'Portrait',
                    8: 'Paysage'
                };
                return programs[value] || value;
                
            case 'MeteringMode':
                const meteringModes = {
                    0: 'Inconnu',
                    1: 'Moyenne',
                    2: 'Moyenne pondérée centrale',
                    3: 'Spot',
                    4: 'MultiSpot',
                    5: 'Multizone',
                    6: 'Partielle',
                    255: 'Autre'
                };
                return meteringModes[value] || value;
                
            case 'WhiteBalance':
                return value === 0 ? 'Auto' : 'Manuel';
                
            case 'Flash':
                const flashModes = {
                    0x0: 'Pas de flash',
                    0x1: 'Flash déclenché',
                    0x5: 'Flash déclenché, retour non détecté',
                    0x7: 'Flash déclenché, retour détecté',
                    0x8: 'On, Flash non déclenché',
                    0x9: 'Flash déclenché, mode Auto',
                    0xd: 'Flash déclenché, mode Auto, retour non détecté',
                    0xf: 'Flash déclenché, mode Auto, retour détecté',
                    0x10: 'Pas de flash',
                    0x18: 'Flash non déclenché, mode Auto',
                    0x19: 'Flash déclenché, mode Auto',
                    0x1d: 'Flash déclenché, mode Auto, retour non détecté',
                    0x1f: 'Flash déclenché, mode Auto, retour détecté'
                };
                return flashModes[value] || `Mode flash ${value}`;

            // Résolution
            case 'XResolution':
            case 'YResolution':
                return `${value} dpi`;
                
            // Dimensions
            case 'ImageWidth':
            case 'ImageHeight':
                return `${value} pixels`;

            // GPS
            case 'GPSLatitude':
            case 'GPSLongitude':
                return this.convertDMSToDD(value);

            case 'GPSAltitude':
                return `${value} m`;

            // Valeurs par défaut
            default:
                return value.toString();
        }
    }

    convertDMSToDD(dms) {
        if (Array.isArray(dms)) {
            const degrees = dms[0];
            const minutes = dms[1];
            const seconds = dms[2];
            return (degrees + minutes/60 + seconds/3600).toFixed(6);
        }
        return dms;
    }

    formatGPSCoordinates(exifData) {
        try {
            const lat = this.convertDMSToDD(exifData.GPSLatitude);
            const long = this.convertDMSToDD(exifData.GPSLongitude);
            const latRef = exifData.GPSLatitudeRef || 'N';
            const longRef = exifData.GPSLongitudeRef || 'E';
            
            return `${lat}° ${latRef}, ${long}° ${longRef}`;
        } catch (error) {
            console.error('Erreur lors du formatage des coordonnées GPS:', error);
            return 'Format GPS invalide';
        }
    }

    exportAsText(exifData) {
        if (!exifData || Object.keys(exifData).length === 0) {
            return 'Aucune donnée EXIF disponible';
        }

        const sections = {
            'Informations Appareil': [
                'Marque appareil',
                'Modèle appareil',
                'Marque objectif',
                'Modèle objectif',
                'N° série appareil',
                'N° série objectif'
            ],
            'Dates et Logiciel': [
                'Date de prise',
                'Date de création',
                'Date de modification',
                'Logiciel'
            ],
            'Paramètres de Prise de Vue': [
                'Temps d\'exposition',
                'Ouverture',
                'Programme',
                'ISO',
                'Compensation exposition',
                'Ouverture max',
                'Mode de mesure',
                'Source lumière',
                'Flash',
                'Focale',
                'Balance des blancs',
                'Zoom numérique'
            ],
            'Informations Image': [
                'Largeur',
                'Hauteur',
                'Bits par pixel',
                'Interprétation',
                'Orientation',
                'Échantillons/pixel',
                'Résolution X',
                'Résolution Y',
                'Unité résolution',
                'Espace colorimétrique'
            ],
            'Copyright et Auteur': [
                'Photographe',
                'Copyright',
                'Commentaire'
            ],
            'Données GPS': [
                'Latitude',
                'Longitude',
                'Altitude',
                'Heure GPS',
                'Date GPS',
                'Coordonnées GPS'
            ]
        };

        let textOutput = 'INFORMATIONS EXIF\n';
        textOutput += '================\n\n';

        for (const [section, fields] of Object.entries(sections)) {
            const sectionData = fields.filter(field => exifData[field] !== undefined);
            
            if (sectionData.length > 0) {
                textOutput += `${section}\n`;
                textOutput += ''.padEnd(section.length, '-') + '\n';
                
                for (const field of sectionData) {
                    textOutput += `${field}: ${exifData[field]}\n`;
                }
                textOutput += '\n';
            }
        }

        return textOutput;
    }
}