// data.js

// FINALE, PRODUKTIVE VERSION - 18.05.2024
const JSON_URLS = [
    "/family_tree/Holl_AI_Studio.json",
    "/family_tree/Koller_AI_Studio.json",
    "/family_tree/Messmer_AI_Studio.json",
    "/family_tree/maier_wolfgang_AI_Studio.json",
    "/family_tree/moergenthaler_AI_Studio.json"
];

export async function loadAndProcessData() {
    console.log("Starte finalen Daten-Ladevorgang...");

    const responses = await Promise.all(JSON_URLS.map(url => fetch(url)));
    const rawDataObjects = await Promise.all(responses.map(res => res.json()));

    const aggregatedData = [];
    const processedIds = new Set(); // Umstellung auf ID für Duplikat-Prüfung

    rawDataObjects.forEach((dataObject, index) => {
        const originFile = JSON_URLS[index].split('/').pop();
        
        if (!dataObject) return;
        const mainKey = Object.keys(dataObject)[0];
        if (!mainKey) return;
        const peopleArray = dataObject[mainKey] ? dataObject[mainKey].persons : undefined;
        if (!peopleArray || !Array.isArray(peopleArray)) return;

        peopleArray.forEach(person => {
            // *** HIER FINDET DIE TRANSFORMATION STATT ***

            // 1. Duplikat-Prüfung über die eindeutige ID
            if (processedIds.has(person.id)) {
                return; // Person wurde bereits aus einer anderen Datei geladen
            }

            // 2. Erstelle den vollen Namen
            person.name = `${person.firstName} ${person.lastName}`;

            // 3. Erstelle das Eltern-Array (und filtere null-Werte heraus)
            person.parents = [];
            if (person.family) {
                if (person.family.fatherId) person.parents.push(person.family.fatherId);
                if (person.family.motherId) person.parents.push(person.family.motherId);
            }

            // 4. Erstelle das Partner-Array
            person.spouses = [];
            if (person.marriages && person.marriages.length > 0) {
                person.spouses = person.marriages.map(m => m.partnerId).filter(id => id);
            }
            
            // 5. Füge die Herkunftsinformation hinzu
            person.origin = originFile;
            person.isBridge = false;

            aggregatedData.push(person);
            processedIds.add(person.id);
        });
    });

    const dataById = new Map(aggregatedData.map(p => [p.id, p]));
    healConnections(aggregatedData, dataById);
    identifyBridgePersons(aggregatedData, dataById);

    console.log(`Datenverarbeitung erfolgreich abgeschlossen. ${aggregatedData.length} Personen geladen.`);
    return aggregatedData;
}

function healConnections(data, dataById) {
    data.forEach(person => {
        // Eltern-Verknüpfungen prüfen (sicherstellen, dass Eltern existieren)
        if (person.parents) {
            person.parents = person.parents.filter(parentId => dataById.has(parentId));
        }
        // Partner-Verknüpfungen heilen (bidirektional machen)
        if (person.spouses) {
            person.spouses.forEach(spouseId => {
                if (dataById.has(spouseId)) {
                    const spouse = dataById.get(spouseId);
                    if (spouse && (!spouse.spouses || !spouse.spouses.includes(person.id))) {
                        if (!spouse.spouses) spouse.spouses = [];
                        spouse.spouses.push(person.id);
                    }
                }
            });
        }
    });
}

function identifyBridgePersons(data, dataById) {
    data.forEach(person => {
        const connectedOrigins = new Set([person.origin]);
        if (person.parents) {
            person.parents.forEach(parentId => {
                const parent = dataById.get(parentId);
                if (parent) connectedOrigins.add(parent.origin);
            });
        }
        if (person.spouses) {
            person.spouses.forEach(spouseId => {
                const spouse = dataById.get(spouseId);
                if (spouse) connectedOrigins.add(spouse.origin);
            });
        }
        if (connectedOrigins.size > 1) {
            person.isBridge = true;
            console.log(`Brücken-Person identifiziert: ${person.name} verbindet [${[...connectedOrigins].join(', ')}]`);
        }
    });
}
