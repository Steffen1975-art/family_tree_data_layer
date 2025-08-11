// main.js

import { loadAndProcessData } from './data.js';
import { createFamilyTree } from './view.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const familyData = await loadAndProcessData();
        createFamilyTree(familyData);
    } catch (error) {
        console.error("Ein kritischer Fehler ist beim Erstellen des Stammbaums aufgetreten:", error);
        document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;">
            <h2>Fehler beim Laden des Stammbaums</h2>
            <p>Die Daten konnten nicht geladen oder verarbeitet werden. Bitte prüfen Sie die Browser-Konsole für technische Details.</p>
        </div>`;
    }
});
