// main.js

import { loadAndProcessData } from './data.js';
import { createFamilyTree } from './view.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const familyData = await loadAndProcessData();
        
        // *** DIESE PRÜFUNG IST ENTSCHEIDEND ***
        if (!familyData || familyData.length === 0) {
            console.error("FEHLER: Es konnten keine Personendaten geladen werden. Der Stammbaum wird nicht gezeichnet. Bitte prüfen Sie die DEBUG-Ausgabe oben.");
            
            document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;">
                <h2>Fehler beim Laden des Stammbaums</h2>
                <p>Die Daten konnten nicht verarbeitet werden. Bitte prüfen Sie die Browser-Konsole für technische Details. Die DEBUG-Ausgabe dort ist der Schlüssel zur Lösung.</p>
            </div>`;
            return; 
        }
        
        createFamilyTree(familyData);

    } catch (error) {
        console.error("Ein kritischer Fehler ist aufgetreten:", error);
    }
});
