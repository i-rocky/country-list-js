const fs = require('fs');
const path = require('path');

const csvPath = path.join(process.env.HOME, 'country-borders', 'GEODATASOURCE-COUNTRY-BORDERS.CSV');
const outputPath = path.join(process.env.HOME, '.hermes', 'geo', 'data', 'country-neighbor.json');

// Read CSV
const csv = fs.readFileSync(csvPath, 'utf8');

// Parse lines
const lines = csv.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('"country_code"'));
const neighbors = {};

lines.forEach(line => {
    const parts = line.split('","');
    if (parts.length >= 4) {
        const countryCode = parts[0].replace('"', '');
        const borderCode = parts[2].replace('"', '');
        
        // Skip if borderCode is empty
        if (!borderCode) return;
        
        if (!neighbors[countryCode]) {
            neighbors[countryCode] = [];
        }
        // Avoid duplicates
        if (!neighbors[countryCode].includes(borderCode)) {
            neighbors[countryCode].push(borderCode);
        }
    }
});

// Write JSON
fs.writeFileSync(outputPath, JSON.stringify(neighbors, null, 2));
console.log('Neighbor data built successfully.');
