import { store } from '../store.js';

export class DpsManager {
    constructor() {
        this.dpsEl = document.querySelector('.damage-dps');
    }

    /** Calcola e aggiorna i dettagli del danno e DPS */
    recalculate() {
        // Logica di calcolo del DPS sulla base delle statistiche dello store
    }
}