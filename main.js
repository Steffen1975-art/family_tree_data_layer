// main.js

import { loadAndProcessData } from './data.js';
import { initializeView } from './view.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const familyData = await loadAndProcessData();
        
        if (!familyData || familyData.length === 0) {
            document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;"><h2>Fehler</h2><p>Es konnten keine Personendaten geladen werden.</p></div>`;
            return;
        }

        initializeView(familyData);

    } catch (error) {
        console.error("Ein kritischer Fehler ist beim Initialisieren der Anwendung aufgetreten:", error);
        document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;"><h2>Fehler</h2><p>Die Anwendung konnte nicht gestartet werden. Details in der Konsole.</p></div>`;
    }
});
