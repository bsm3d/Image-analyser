/*
    Author : Benoit (BSM3D) Saint-Moulin
    2025 © BSM3D
    www.bsm3d.com
    Free to use and for Learning purpose.
    
*/

class ExifReader {
    constructor() {
        if (typeof EXIF === 'undefined') {
            console.error('EXIF.js library is not loaded');
            throw new Error('EXIF.js library is required');
        }
        console.log('ExifReader initialized');
    }

    readExif(file) {
        const self = this;
        return new Promise((resolve, reject) => {
            EXIF.getData(file, function() {
                try {
                    console.log('Reading EXIF data...');
                    const exifData = EXIF.getAllTags(this);
                    console.log('EXIF data found:', exifData);
                    resolve(self.formatExifData(exifData));
                } catch (error) {
                    console.error('Error reading EXIF data:', error);
                    reject(error);
                }
            });
        });
    }

    formatExifData(exifData) {
        const relevantTags = {
            // Camera information
            'Make': 'Camera Make',
            'Model': 'Camera Model',
            'LensMake': 'Lens Make',
            'LensModel': 'Lens Model',
            'CameraSerialNumber': 'Camera Serial Number',
            'LensSerialNumber': 'Lens Serial Number',

            // Date and software
            'DateTimeOriginal': 'Date Taken',
            'CreateDate': 'Creation Date',
            'ModifyDate': 'Modification Date',
            'Software': 'Software',
            
            // Shooting parameters
            'ExposureTime': 'Exposure Time',
            'FNumber': 'Aperture',
            'ExposureProgram': 'Program',
            'ISOSpeedRatings': 'ISO',
            'ExposureBiasValue': 'Exposure Compensation',
            'MaxApertureValue': 'Max Aperture',
            'MeteringMode': 'Metering Mode',
            'LightSource': 'Light Source',
            'Flash': 'Flash',
            'FocalLength': 'Focal Length',
            'WhiteBalance': 'White Balance',
            'DigitalZoomRatio': 'Digital Zoom',

            // Image information
            'ImageWidth': 'Width',
            'ImageHeight': 'Height',
            'BitsPerSample': 'Bits per Sample',
            'PhotometricInterpretation': 'Interpretation',
            'Orientation': 'Orientation',
            'SamplesPerPixel': 'Samples per Pixel',
            'XResolution': 'X Resolution',
            'YResolution': 'Y Resolution',
            'ResolutionUnit': 'Resolution Unit',
            'ColorSpace': 'Color Space',

            // Copyright and author
            'Artist': 'Photographer',
            'Copyright': 'Copyright',
            'UserComment': 'Comment',

            // GPS
            'GPSLatitude': 'Latitude',
            'GPSLongitude': 'Longitude',
            'GPSAltitude': 'Altitude',
            'GPSTimeStamp': 'GPS Time',
            'GPSDateStamp': 'GPS Date'
        };

        const formatted = {};
        
        for (const [key, label] of Object.entries(relevantTags)) {
            if (exifData[key] !== undefined) {
                formatted[label] = this.formatExifValue(key, exifData[key]);
            }
        }

        // Add GPS coordinates if available
        if (exifData.GPSLatitude && exifData.GPSLongitude) {
            formatted['GPS Coordinates'] = this.formatGPSCoordinates(exifData);
        }

        return formatted;
    }

    formatExifValue(key, value) {
        if (value === undefined || value === null) return 'Not available';

        // Handle empty byte arrays (like empty UserComment)
        if (Array.isArray(value) && value.every(v => v === 0)) {
            return 'Not available';
        }

        // Handle string-like byte arrays
        if (Array.isArray(value) && typeof value[0] === 'number') {
            // Convert byte array to string, filter out null bytes
            const str = String.fromCharCode(...value.filter(v => v !== 0));
            if (str.trim().length === 0) {
                return 'Not available';
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

            // Exposure values
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
                
            // Modes and programs
            case 'ExposureProgram':
                const programs = {
                    0: 'Not defined',
                    1: 'Manual',
                    2: 'Normal program',
                    3: 'Aperture priority',
                    4: 'Shutter priority',
                    5: 'Creative program',
                    6: 'Action program',
                    7: 'Portrait',
                    8: 'Landscape'
                };
                return programs[value] || value;
                
            case 'MeteringMode':
                const meteringModes = {
                    0: 'Unknown',
                    1: 'Average',
                    2: 'Center weighted average',
                    3: 'Spot',
                    4: 'MultiSpot',
                    5: 'Pattern',
                    6: 'Partial',
                    255: 'Other'
                };
                return meteringModes[value] || value;
                
            case 'WhiteBalance':
                return value === 0 ? 'Auto' : 'Manual';
                
            case 'Flash':
                const flashModes = {
                    0x0: 'No flash',
                    0x1: 'Flash fired',
                    0x5: 'Flash fired, return not detected',
                    0x7: 'Flash fired, return detected',
                    0x8: 'On, flash did not fire',
                    0x9: 'Flash fired, auto mode',
                    0xd: 'Flash fired, auto mode, return not detected',
                    0xf: 'Flash fired, auto mode, return detected',
                    0x10: 'No flash',
                    0x18: 'Flash did not fire, auto mode',
                    0x19: 'Flash fired, auto mode',
                    0x1d: 'Flash fired, auto mode, return not detected',
                    0x1f: 'Flash fired, auto mode, return detected'
                };
                return flashModes[value] || `Flash mode ${value}`;

            // Resolution
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

            // Default values
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
            console.error('Error formatting GPS coordinates:', error);
            return 'Invalid GPS format';
        }
    }

    exportAsText(exifData) {
        if (!exifData || Object.keys(exifData).length === 0) {
            return 'No EXIF data available';
        }

        const sections = {
            'Camera Information': [
                'Camera Make',
                'Camera Model',
                'Lens Make',
                'Lens Model',
                'Camera Serial Number',
                'Lens Serial Number'
            ],
            'Dates and Software': [
                'Date Taken',
                'Creation Date',
                'Modification Date',
                'Software'
            ],
            'Shooting Parameters': [
                'Exposure Time',
                'Aperture',
                'Program',
                'ISO',
                'Exposure Compensation',
                'Max Aperture',
                'Metering Mode',
                'Light Source',
                'Flash',
                'Focal Length',
                'White Balance',
                'Digital Zoom'
            ],
            'Image Information': [
                'Width',
                'Height',
                'Bits per Sample',
                'Interpretation',
                'Orientation',
                'Samples per Pixel',
                'X Resolution',
                'Y Resolution',
                'Resolution Unit',
                'Color Space'
            ],
            'Copyright and Author': [
                'Photographer',
                'Copyright',
                'Comment'
            ],
            'GPS Data': [
                'Latitude',
                'Longitude',
                'Altitude',
                'GPS Time',
                'GPS Date',
                'GPS Coordinates'
            ]
        };

        let textOutput = 'EXIF INFORMATION\n';
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