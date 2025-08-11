// data.js

// FINALE KORREKTUR 2: Die Struktur der JSON-Dateien berücksichtigen.
const JSON_URLS = [
    "/family_tree/Holl_AI_Studio.json",
    "/family_tree/Koller_AI_Studio.json",
    "/family_tree/Messmer_AI_Studio.json",
    "/family_tree/maier_wolfgang_AI_Studio.json",
    "/family_tree/moergenthaler_AI_Studio.json"
];

export async function loadAndProcessData() {
    console.log("Starte Daten-Ladevorgang von Projekt-relativen Pfaden...");

    const responses = await Promise.all(JSON_URLS.map(url => fetch(url)));
    const rawDataObjects = await Promise.all(responses.map(res => res.json()));

    const aggregatedData = [];
    const processedNames = new Set();

    // HIER IST DIE ÄNDERUNG:
    rawDataObjects.forEach((dataObject, index) => {
        const originFile = JSON_URLS[index].split('/').pop();
        
        // Wir greifen auf die Liste *innerhalb* des Objekts zu.
        const peopleArray = dataObject.family_tree_data_layer;

        // Jetzt führen wir die Schleife auf der korrekten Liste aus.
        peopleArray.forEach(person => {
            if (!processedNames.has(person.name)) {
                person.origin = originFile;
                person.isBridge = false;
                aggregatedData.push(person);
                processedNames.add(person.name);
            } else {
                console.warn(`Duplikat gefunden und übersprungen: "${person.name}" in ${originFile}`);
            }
        });
    });

    const dataById = new Map(aggregatedData.map(p => [p.id, p]));
    healConnections(aggregatedData, dataById);
    identifyBridgePersons(aggregatedData, dataById);

    console.log(`Datenverarbeitung abgeschlossen. ${aggregatedData.length} Personen geladen.`);
    return aggregatedData;
}

function healConnections(data, dataById) {
    data.forEach(person => {
        if (person.parents) {
            person.parents = person.parents.filter(parentId => dataById.has(parentId));
        }
        if (person.spouses) {
            person.spouses.forEach(spouseId => {
                const spouse = dataById.get(spouseId);
                if (spouse && (!spouse.spouses || !spouse.spouses.includes(person.id))) {
                    if (!spouse.spouses) spouse.spouses = [];
                    spouse.spouses.push(person.id);
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
