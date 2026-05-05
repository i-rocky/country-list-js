const fs = require('fs');
const path = require('path');

const neighborsPath = path.join(process.env.HOME, '.hermes', 'geo', 'data', 'country-neighbor.json');
const countriesPath = path.join(process.env.HOME, '.hermes', 'geo', 'countries.json');

const neighbors = JSON.parse(fs.readFileSync(neighborsPath, 'utf8'));
const countries = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));

// Build mapping from ISO2 (cca2) to lat/lng
const iso2ToLatLon = {};
for (const country of countries) {
    const iso2 = country.cca2;
    if (country.latlng) {
        iso2ToLatLon[iso2] = country.latlng; // [lat, lon]
    } else {
        iso2ToLatLon[iso2] = null;
    }
}

// Function to determine direction from country A to country B
function getDirection(latA, lonA, latB, lonB) {
    if (!latA || !lonA || !latB || !lonB) return null;
    const latDiff = latB - latA;
    const lonDiff = lonB - lonA;
    const latPos = latDiff > 0;
    const lonPos = lonB > lonA; // Note: lon increasing eastward, but we just compare positions
    
    if (latPos && lonPos) return 'NE';
    if (latPos && !lonPos) return 'NW';
    if (!latPos && lonPos) return 'SE';
    if (!latPos && !lonPos) return 'SW';
    // Pure N/S/E/W might be when one diff is zero? But we can treat zero as either? Usually if latDiff=0 and lonDiff>0 => E, etc.
    if (latDiff === 0 && lonDiff > 0) return 'E';
    if (latDiff === 0 && lonDiff < 0) return 'W';
    if (lonDiff === 0 && latDiff > 0) return 'N';
    if (lonDiff === 0 && latDiff < 0) return 'S';
    // If both zero, same place, but not possible.
    return null;
}

// Transform neighbor data to include directions
const directedNeighbors = {};

for (const [country, neighborsList] of Object.entries(neighbors)) {
    const latLonA = iso2ToLatLon[country];
    if (!latLonA) {
        // If we don't have coordinates for this country, skip adding directions for its neighbors
        directedNeighbors[country] = { N: [], S: [], E: [], W: [], NE: [], NW: [], SE: [], SW: [] };
        // But we can still add the neighbors as a list? The original format had arrays per direction. We'll initialize empty.
        continue;
    }
    const [latA, lonA] = latLonA;
    
    // Initialize direction arrays
    const dirs = { N: [], S: [], E: [], W: [], NE: [], NW: [], SE: [], SW: [] };
    
    for (const neighbor of neighborsList) {
        const latLonB = iso2ToLatLon[neighbor];
        if (!latLonB) continue;
        const [latB, lonB] = latLonB;
        const direction = getDirection(latA, lonA, latB, lonB);
        if (direction && dirs[direction] !== undefined) {
            dirs[direction].push(neighbor);
        }
    }
    directedNeighbors[country] = dirs;
}

// Write the result
const outputPath = path.join(path.dirname(neighborsPath), 'country-neighbor-directed.json');
fs.writeFileSync(outputPath, JSON.stringify(directedNeighbors, null, 2));
console.log('Directed neighbor data created.');
