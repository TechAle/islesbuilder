import { readNumber } from './statResolver.js';

/** @typedef {import('../../data/types.js').EquipSlotData} EquipSlotData */

/**
 * Tipo di danno dell'arma (es. "Arcane", "Slash").
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {string|null}
 */
export function getWeaponDamageType(weapon) {
    const raw = weapon?.stats?.['Damage Type'];
    if (typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
}

/**
 * Weapon Type dell'arma (es. "magic", "melee", "ranged").
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {string}
 */
export function getWeaponClass(weapon) {
    const raw = weapon?.stats?.['Weapon Type'];
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/**
 * Default Attack dell'arma, espresso in percentuale (85 => 85%).
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {number}
 */
export function getWeaponDefaultAttackPercent(weapon) {
    return readNumber(weapon?.stats?.['Default Attack']);
}

/**
 * Fattore per tornare dal danno "dopo Default Attack" al danno base
 * dell'arma. Esempio: Default Attack 85% → 100 / 85 = 1.17647.
 *
 * Le abilità e le passive usano il danno base dell'arma, non quello già
 * scalato dal Default Attack. Poiché tutti i modificatori del danno sono
 * moltiplicativi rispetto a quel danno scalato, dividere per DefaultAttack%
 * equivale ad applicare gli stessi modificatori al danno base:
 *
 *   dannoScalato = base × (DA / 100) × modificatori
 *   dannoBase    = dannoScalato × (100 / DA)
 *                = base × modificatori
 *
 * Non è quindi `1 + (100 - DA) / 100`: quella formula aggiungerebbe un bonus
 * diverso e non riporterebbe al danno base.
 *
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {number}
 */
export function getDefaultAttackReverseMultiplier(weapon) {
    const defaultAttackPercent = getWeaponDefaultAttackPercent(weapon);
    return defaultAttackPercent > 0 ? 100 / defaultAttackPercent : 0;
}
