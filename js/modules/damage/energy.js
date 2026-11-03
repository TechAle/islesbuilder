import { POTION_COOLDOWN, POTION_ENERGY } from '../../data/constants.js';

/**
 * Stato energetico derivato da un saldo al secondo.
 * @typedef {Object} EnergyState
 * @property {number} secondsToEmpty - Secondi prima di esaurire l'energia (Infinity se non si esaurisce)
 * @property {boolean} sustain - True se il saldo è >= 0
 * @property {number} potionInterval - Secondi tra una pozione e l'altra
 * @property {boolean} potionSustainable - True se il cooldown delle pozioni basta
 */

/**
 * @param {number} energyPerSecond
 * @param {number} maxEnergy
 * @returns {EnergyState}
 */
export function computeEnergyState(energyPerSecond, maxEnergy) {
    const secondsToEmpty = energyPerSecond < 0
        ? maxEnergy / -energyPerSecond
        : Infinity;

    const sustain = energyPerSecond >= 0;
    const deficit = energyPerSecond < 0 ? -energyPerSecond : 0;
    const potionInterval = deficit > 0 ? POTION_ENERGY / deficit : Infinity;
    const potionSustainable = potionInterval >= POTION_COOLDOWN;

    return { secondsToEmpty, sustain, potionInterval, potionSustainable };
}

/**
 * Etichetta della riga "Sustain".
 * @param {Pick<EnergyState, 'sustain'|'potionSustainable'|'potionInterval'>} state
 * @returns {string}
 */
export function getSustainLabel(state) {
    if (state.sustain) return 'Yes';
    if (state.potionSustainable) return `Yes but pot every ${formatSeconds(state.potionInterval)}s`;
    return 'No';
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatSeconds(value) {
    return value.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
