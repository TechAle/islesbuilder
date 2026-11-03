import { findPercent } from './statLookup.js';

/** @typedef {import('../../data/types.js').StatTotals} StatTotals */

/**
 * Statistica di consumo energetico in base alla classe dell'arma.
 * @type {Record<string, string>}
 */
export const ENERGY_CONSUMPTION_STAT = {
    melee: 'Melee Energy Consumption',
    ranged: 'Ranged Energy Consumption',
    magic: 'Magic Energy Consumption'
};

/**
 * Percentuale di consumo energetico della classe arma.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} weaponClass
 * @returns {number}
 */
export function getClassEnergyConsumptionPercent(statsValues, weaponClass) {
    const statName = ENERGY_CONSUMPTION_STAT[weaponClass];
    return statName ? findPercent(statsValues, statName) : 0;
}

/**
 * Moltiplicatore del costo energetico: `1 + (costo% + consumo classe%) / 100`.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} costStatName - Nome della statistica costo (es. "Attack Costs")
 * @param {string} weaponClass
 * @returns {number}
 */
export function getEnergyCostMultiplier(statsValues, costStatName, weaponClass) {
    const costPercent = findPercent(statsValues, costStatName);
    const consumptionPercent = getClassEnergyConsumptionPercent(statsValues, weaponClass);
    return 1 + (costPercent + consumptionPercent) / 100;
}
