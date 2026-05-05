const fs = require('fs');
const path = require('path');

const adminPath = path.join(process.env.HOME, '.hermes', 'geo', 'data', 'country-admin.json');
const regionPath = path.join(process.env.HOME, '.hermes', 'geo', 'data', 'region.json');

const adminData = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
const regionData = JSON.parse(fs.readFileSync(regionPath, 'utf8'));

// For each country in adminData, add regions from regionData
for (const [countryCode, countryObj] of Object.entries(adminData)) {
    const regions = regionData[countryCode];
    if (regions) {
        // Add regions to each division? Or to the country level?
        // The current structure has divisions (states/provinces). 
        // Region data appears to be at country level (broad regions). 
        // We could add a top-level "regions" field to the country object, or add regions to each division.
        // Since regionData seems to describe the country's broad geographical region, I'll add it at the country level.
        // But the current structure only has "divisions". I'll add a "regions" field to the country object.
        countryObj.regions = regions.split(', ');
    }
}

fs.writeFileSync(adminPath, JSON.stringify(adminData, null, 2));
console.log('Regional data expanded to all countries.');
