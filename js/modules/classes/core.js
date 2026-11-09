import {
    ARCHER_BURST_DAMAGE_PERCENT,
    BURST_DAMAGE_PERCENT,
    BURST_ENERGY_COST
} from '../../data/constants.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Chiave del core equipaggiato, ricavata dal nome dell'oggetto.
 * @param {DamageContext} context
 * @returns {'mage'|'archer'|null}
 */
export function getCoreKey(context) {
    const core = context.build?.activeEquip?.core;
    if (typeof core?.name !== 'string') return null;

    const name = core.name.toLowerCase();
    if (name.includes('mage')) return 'mage';
    if (name.includes('archer')) return 'archer';
    return null;
}

/**
 * Verifica se il core equipaggiato è un Mage Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasMageCore(context) {
    return getCoreKey(context) === 'mage';
}

/**
 * Verifica se il core equipaggiato è un Archer Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasArcherCore(context) {
    return getCoreKey(context) === 'archer';
}

/**
 * Verifica se il core equipaggiato abilita una burst.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasBurstCore(context) {
    return getCoreKey(context) !== null;
}

/**
 * Configurazione della burst del core equipaggiato.
 *
 * Mage Core e Archer Core condividono durata, cooldown e costo energetico;
 * cambia solo la percentuale di danno del singolo colpo.
 *
 * @param {DamageContext} context
 * @returns {{
 *   key: 'mage'|'archer',
 *   name: string,
 *   damagePercent: number,
 *   energyCost: number
 * }|null}
 */
export function getBurstCore(context) {
    const key = getCoreKey(context);
    if (key === 'mage') {
        return {
            key,
            name: 'Mage Core',
            damagePercent: BURST_DAMAGE_PERCENT,
            energyCost: BURST_ENERGY_COST
        };
    }

    if (key === 'archer') {
        return {
            key,
            name: 'Archer Core',
            damagePercent: ARCHER_BURST_DAMAGE_PERCENT,
            energyCost: BURST_ENERGY_COST
        };
    }

    return null;
}
