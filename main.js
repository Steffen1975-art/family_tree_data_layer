// main.js

// KORRIGIERTE VERSION - importiert jetzt die korrekte Funktion 'initializeView'
import { loadAndProcessData } from './data.js';
import { initializeView } from './view.js'; // DIESE ZEILE IST JETZT KORREKT

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Lade und verarbeite alle Daten von den JSON-Dateien
        const familyData = await loadAndProcessData();
        
        if (!familyData || familyData.length === 0) {
            document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;"><h2>Fehler</h2><p>Es konnten keine Personendaten geladen werden.</p></div>`;
            return;
        }

        // 2. Initialisiere die komplette Visualisierung mit den geladenen Daten
        initializeView(familyData); // DIESE ZEILE IST JETZT KORREKT

    } catch (error) {
        console.error("Ein kritischer Fehler ist beim Initialisieren der Anwendung aufgetreten:", error);
        document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;"><h2>Fehler</h2><p>Die Anwendung konnte nicht gestartet werden. Details in der Konsole.</p></div>`;
    }
});
