const fs = require('fs');
const path = require('path');

const filePath = path.join(process.env.HOME, '.hermes', 'geo', 'data', 'country-admin.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// US state mapping
const usStates = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA", "Colorado": "CO",
    "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
    "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
    "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
    "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA",
    "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY"
};

// Example counties (a few per state)
const usCounties = {
    CA: ["Los Angeles", "San Bernardino", "Orange"], 
    NY: ["New York", "Kings", "Queens"],
    TX: ["Harris", "Dallas", "Tarrant"],
    FL: ["Miami-Dade", "Broward", "Palm Beach"],
    IL: ["Cook", "DuPage", "Lake"],
    PA: ["Philadelphia", "Allegheny", "Montgomery"],
    OH: ["Franklin", "Cuyahoga", "Hamilton"],
    GA: ["Fulton", "Gwinnett", "Cobb"],
    NC: ["Mecklenburg", "Wake", "Guilford"],
    MI: ["Wayne", "Oakland", "Macomb"],
    NJ: ["Bergen", "Hudson", "Middlesex"],
    VA: ["Fairfax", "Prince William", "Loudoun"],
    WA: ["King", "Pierce", "Snohomish"],
    MA: ["Middlesex", "Worcester", "Suffolk"],
    IN: ["Marion", "Lake", "Allen"],
    AZ: ["Maricopa", "Pima", "Pinal"],
    TN: ["Davidson", "Shelby", "Knox"],
    MO: ["Jackson", "St. Louis", "Clay"],
    MD: ["Montgomery", "Prince George's", "Baltimore"],
    WI: ["Milwaukee", "Dane", "Waukesha"],
    CO: ["Denver", "El Paso", "Arapahoe"],
    MN: ["Hennepin", "Ramsey", "Dakota"],
    SC: ["Greenville", "Richland", "Charleston"],
    AL: ["Jefferson", "Mobile", "Montgomery"],
    LA: ["East Baton Rouge", "Jefferson", "Orleans"],
    KY: ["Jefferson", "Fayette", "Kenton"],
    OR: ["Multnomah", "Washington", "Clackamas"],
    OK: ["Oklahoma", "Tulsa", "Cleveland"],
    CT: ["Hartford", "Fairfield", "New Haven"],
    IA: ["Polk", "Linn", "Scott"],
    MS: ["Harrison", "Jackson", "Hinds"],
    AR: ["Pulaski", "Benton", "Washington"],
    KS: ["Johnson", "Sedgwick", "Wyandotte"],
    UT: ["Salt Lake", "Utah", "Davis"],
    NE: ["Douglas", "Lancaster", "Sarpy"],
    WV: ["Kanawha", "Berkeley", "Monongalia"],
    NV: ["Clark", "Washoe", "Carson City"],
    NM: ["Bernalillo", "Doña Ana", "Santa Fe"],
    ME: ["Cumberland", "York", "Penobscot"],
    ID: ["Ada", "Bannock", "Bonner"],
    HI: ["Honolulu", "Hawaii", "Maui"],
    NH: ["Hillsborough", "Rockingham", "Merrimack"],
    MT: ["Yellowstone", "Missoula", "Gallatin"],
    DE: ["New Castle", "Sussex", "Kent"],
    SD: ["Minnehaha", "Pennington", "Lincoln"],
    ND: ["Cass", "Burleigh", "Grand Forks"],
    AK: ["Anchorage", "Fairbanks North Star", "Matanuska-Susitna"],
    VT: ["Chittenden", "Rutland", "Windsor"],
    RI: ["Providence", "Kent", "Washington"],
    WY: ["Laramie", "Natrona", "Campbell"],
    SC: ["Greenville", "Richland", "Charleston"],
    DC: ["Washington"] // though not a state
};

// US regions
const usRegions = {
    "Pacific Northwest": ["WA", "OR"],
    "South": ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "MO", "NC", "SC", "TN", "VA", "WV"],
    "New England": ["CT", "ME", "MA", "NH", "RI", "VT"],
    "Mid-Atlantic": ["NJ", "NY", "PA"],
    "East Coast": ["ME", "NH", "MA", "RI", "CT", "NY", "NJ", "DE", "MD", "VA", "NC", "SC", "GA", "FL"],
    "West Coast": ["CA", "OR", "WA"],
    "Mountain West": ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY"],
    "Southwest": ["AZ", "NM", "TX"],
    "Great Plains": ["ND", "SD", "NE", "KS", "OK", "TX"],
    "Midwest": ["OH", "IN", "IL", "MI", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"]
};

// For other countries, define mappings if needed
const countryMappings = {
    CA: {
        names: {
            "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB", "New Brunswick": "NB",
            "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
            "Nunavut": "NU", "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
            "Saskatchewan": "SK", "Yukon": "YT"
        },
        regions: {} // could add regions if known
    },
    AU: {
        names: {
            "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD", "South Australia": "SA",
            "Western Australia": "WA", "Tasmania": "TAS", "Australian Capital Territory": "ACT",
            "Northern Territory": "NT"
        }
    },
    DE: {
        names: {
            "Baden-Württemberg": "BW", "Bavaria": "BY", "Berlin": "BE", "Brandenburg": "BB",
            "Bremen": "HB", "Hamburg": "HH", "Hesse": "HE", "Lower Saxony": "NI",
            "Mecklenburg-Vorpommern": "MV", "North Rhine-Westphalia": "NW", "Rhineland-Palatinate": "RP",
            "Saarland": "SL", "Saxony": "SN", "Saxony-Anhalt": "ST", "Schleswig-Holstein": "SH", "Thuringia": "TH"
        }
    },
    JP: {
        names: {
            "Hokkaido": "HK", "Aomori": "AO", "Iwate": "IW", "Miyagi": "MY", "Akita": "AK", "Yamagata": "YG", "Fukushima": "FS",
            "Ibaraki": "IB", "Tochigi": "TO", "Gunma": "GU", "Saitama": "ST", "Chiba": "CB", "Tokyo": "TK", "Kanagawa": "KN",
            "Niigata": "NI", "Toyama": "TY", "Ishikawa": "IS", "Fukui": "FU", "Yamanashi": "YM", "Nagano": "NG", "Gifu": "GI", "Shizuoka": "SZ", "Aichi": "AI",
            "Mie": "MI", "Shiga": "SH", "Kyoto": "KY", "Osaka": "OS", "Hyogo": "HY", "Nara": "NR", "Wakayama": "WK",
            "Tottori": "TT", "Shimane": "SM", "Okayama": "OY", "Hiroshima": "HR", "Yamaguchi": "YG",
            "Tokushima": "TS", "Kagawa": "KG", "Ehime": "EH", "Kochi": "KO",
            "Fukuoka": "FK", "Saga": "SG", "Nagasaki": "NS", "Kumamoto": "KM", "Oita": "OI", "Miyazaki": "MZ", "Kagoshima": "KS", "Okinawa": "ON"
        },
        regions: {
            "Hokkaido": ["Hokkaido"],
            "Tohoku": ["Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima"],
            "Kanto": ["Ibaraki", "Tochigi", "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa"],
            "Chubu": ["Niigata", "Toyama", "Ishikawa", "Fukui", "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi"],
            "Kansai": ["Mie", "Shiga", "Kyoto", "Osaka", "Hyogo", "Nara", "Wakayama"],
            "Chugoku": ["Tottori", "Shimane", "Okayama", "Hiroshima", "Yamaguchi"],
            "Shikoku": ["Tokushima", "Kagawa", "Ehime", "Kochi"],
            "Kyushu": ["Fukuoka", "Saga", "Nagasaki", "Kumamoto", "Oita", "Miyazaki", "Kagoshima", "Okinawa"]
        }
    }
    // Add more as needed
};

const newData = {};

for (const [countryCode, divisions] of Object.entries(data)) {
    const countryObj = { divisions: {} };
    
    if (countryCode === 'US') {
        divisions.forEach(div => {
            const stateName = div.name;
            const shortCode = usStates[stateName];
            if (shortCode) {
                countryObj.divisions[shortCode] = {
                    name: stateName,
                    alias: div.alias || [],
                    counties: usCounties[shortCode] || [],
                    regions: []
                };
                // Add regions
                for (const [regionName, states] of Object.entries(usRegions)) {
                    if (states.includes(shortCode)) {
                        countryObj.divisions[shortCode].regions.push(regionName);
                    }
                }
            }
        });
    } else {
        // Check if we have a mapping for this country
        const mapping = countryMappings[countryCode];
        divisions.forEach(div => {
            const name = div.name;
            let shortCode = null;
            if (mapping && mapping.names) {
                shortCode = mapping.names[name];
            }
            if (!shortCode) {
                // Derive short code: first two letters of each word
                const words = name.split(' ');
                if (words.length >= 2) {
                    shortCode = (words[0].substring(0,1) + words[1].substring(0,1)).toUpperCase();
                } else if (words.length === 1) {
                    shortCode = words[0].substring(0,3).toUpperCase();
                } else {
                    shortCode = name.substring(0,4).toUpperCase();
                }
            }
            // Avoid key collisions? Unlikely but possible. We'll assume uniqueness.
            countryObj.divisions[shortCode] = {
                name: name,
                alias: div.alias || [],
                regions: mapping && mapping.regions ? (mapping.regions[name] || []) : []
            };
        });
    }
    
    newData[countryCode] = countryObj;
}

fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
console.log('Transformed country-admin.json written successfully.');
