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
