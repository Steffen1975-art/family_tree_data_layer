// data.js

// ALLERLETZTE DEBUG-VERSION: Loggt das erste geladene Objekt komplett.
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

    // *** NEUER, EINFACHERER DEBUG-CODE ***
    // Wir loggen die Struktur des ersten geladenen Objekts, um den Schlüsselnamen zu finden.
    if (rawDataObjects && rawDataObjects.length > 0) {
        console.log("DEBUG: Die Struktur des ersten geladenen Objekts (aus Holl_AI_Studio.json) ist:", rawDataObjects[0]);
    }
    // *************************************

    // Vorerst geben wir eine leere Liste zurück, um Fehler zu analysieren.
    return []; 
}
