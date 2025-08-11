// data.js

// FINALE DEBUG-VERSION ZUR ANALYSE DES PERSONEN-OBJEKTS
const JSON_URLS = [
    "/family_tree/Holl_AI_Studio.json",
    "/family_tree/Koller_AI_Studio.json",
    "/family_tree/Messmer_AI_Studio.json",
    "/family_tree/maier_wolfgang_AI_Studio.json",
    "/family_tree/moergenthaler_AI_Studio.json"
];

export async function loadAndProcessData() {
    console.log("Starte Daten-Ladevorgang...");

    const responses = await Promise.all(JSON_URLS.map(url => fetch(url)));
    const rawDataObjects = await Promise.all(responses.map(res => res.json()));

    const aggregatedData = [];
    const processedNames = new Set();
    let firstPersonLogged = false; // Eine Flagge, damit wir nur einmal loggen

    rawDataObjects.forEach((dataObject, index) => {
        const originFile = JSON_URLS[index].split('/').pop();
        
        if (!dataObject) return;
        const mainKey = Object.keys(dataObject)[0];
        if (!mainKey) return;
        const peopleArray = dataObject[mainKey] ? dataObject[mainKey].persons : undefined;
        if (!peopleArray || !Array.isArray(peopleArray)) return;

        peopleArray.forEach(person => {
            
            // *** NEUER DEBUG-CODE: Loggt das erste gefundene Personen-Objekt ***
            if (!firstPersonLogged) {
                console.log("DEBUG: Die Struktur des ersten Personen-Objekts ist:", person);
                firstPersonLogged = true;
            }
            // ********************************************************************

            // Dieser Teil wird weiterhin fehlschlagen, das ist OK für den Test.
            if (!processedNames.has(person.name)) {
                person.origin = originFile;
                person.isBridge = false;
                aggregatedData.push(person);
                processedNames.add(person.name);
            } else {
                // Diese Warnung wird weiterhin erscheinen, das ist OK.
            }
        });
    });

    console.log(`Datenverarbeitung abgeschlossen. ${aggregatedData.length} Personen geladen.`);
    return aggregatedData;
}

// Die Hilfsfunktionen bleiben unverändert, sie werden aber nicht korrekt laufen.
function healConnections(data, dataById) { /* ... */ }
function identifyBridgePersons(data, dataById) { /* ... */ }
