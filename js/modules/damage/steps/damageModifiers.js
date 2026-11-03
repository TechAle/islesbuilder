import { BASE_ELEMENTAL_POWER } from '../../../data/constants.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').DamageModifiersStepResult} DamageModifiersStepResult */
/** @typedef {import('../../../data/types.js').EquipSlotData} EquipSlotData */
/** @typedef {import('../../../data/types.js').StatTotals} StatTotals */

/**
 * Cerca una statistica senza distinguere maiuscole/minuscole.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {StatTotals|null}
 */
function findStat(statsValues, statName) {
    const target = statName.trim().toLowerCase();
    if (!target) return null;

    const key = Object.keys(statsValues).find(stat => stat.trim().toLowerCase() === target);
    return key ? statsValues[key] : null;
}

/**
 * Legge un modificatore percentuale, ignorando flat e maiuscole/minuscole.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
function findPercent(statsValues, statName) {
    return findStat(statsValues, statName)?.percent ?? 0;
}

/**
 * Legge un valore flat, ignorando maiuscole/minuscole.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
function findFlat(statsValues, statName) {
    return findStat(statsValues, statName)?.flat ?? 0;
}

/**
 * Weapon Type dell'arma (es. "magic", "melee", "ranged").
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {string}
 */
function getWeaponClass(weapon) {
    const raw = weapon?.stats?.['Weapon Type'];
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/**
 * Elemento dell'arma (es. "thunder", "nature", "void", "radiant").
 * @param {EquipSlotData|null|undefined} weapon
 * @returns {string}
 */
function getWeaponElement(weapon) {
    const raw = weapon?.stats?.['element'];
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/**
 * Trasforma una chiave lowercase in una label leggibile (magic => Magic).
 * @param {string} value
 * @returns {string}
 */
function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Step 2 — Damage Modifiers.
 *
 * Il danno è il prodotto di due fattori moltiplicativi:
 *   1) `1 + (damageType% + weaponClass%)`  — danni dell'elemento principale
 *   2) `1 + elementalDamage% * (EP / 100)`  — danni elementali scalati dall'EP
 *
 * L'Elemental Power totale è `(BASE + flat) * (1 + percent / 100)` e scala
 * la percentuale del danno elementale del nostro elemento.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const damageModifiersStep = {
    id: 'damageModifiers',
    label: 'Damage Modifiers',

    /**
     * @param {DamageContext} context
     * @returns {DamageModifiersStepResult}
     */
    run(context) {
        const base = context.results.baseDamage;
        const baseDamage = base?.baseDamage ?? 0;

        if (baseDamage <= 0) {
            return {
                baseDamage: 0,
                percent: 0,
                elementalPower: BASE_ELEMENTAL_POWER,
                elementalDamagePercent: 0,
                effectiveElementalPercent: 0,
                damage: 0,
                modifiers: []
            };
        }

        const damageType = base.damageType;
        const weaponClass = getWeaponClass(context.weapon);
        const element = getWeaponElement(context.weapon);

        /** @type {Array<{label: string, percent: number}>} */
        const modifiers = [];
        const seen = new Set();

        /**
         * @param {string} statName
         * @param {string} label
         */
        const addModifier = (statName, label) => {
            const key = label.toLowerCase();
            if (!statName || seen.has(key)) return;

            seen.add(key);
            modifiers.push({ label, percent: findPercent(context.statsValues, statName) });
        };

        addModifier(`${damageType} Damage`, `${damageType} Damage`);
        if (weaponClass) addModifier(`${capitalize(weaponClass)} Damage`, `${capitalize(weaponClass)} Damage`);

        const typePercent = modifiers.reduce((sum, modifier) => sum + modifier.percent, 0);

        // Danno elementale del nostro elemento (es. Nature Damage per nature).
        const elementalDamagePercent = element
            ? findPercent(context.statsValues, `${capitalize(element)} Damage`)
            : 0;

        // Elemental Power totale: (base + flat) * (1 + percent/100).
        const elementalPowerFlat = findFlat(context.statsValues, 'Elemental Power');
        const elementalPowerPercent = findPercent(context.statsValues, 'Elemental Power');
        const elementalPower = (BASE_ELEMENTAL_POWER + elementalPowerFlat) * (1 + elementalPowerPercent / 100);

        // Scaling: percent * (EP / 100).
        const effectiveElementalPercent = elementalDamagePercent * (elementalPower / 100);

        const damage = Math.max(0,
            baseDamage * (1 + typePercent / 100) * (1 + effectiveElementalPercent / 100)
        );

        return {
            baseDamage,
            percent: typePercent,
            elementalPower,
            elementalDamagePercent,
            effectiveElementalPercent,
            damage,
            modifiers
        };
    },

    /**
     * @param {DamageModifiersStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [
            { label: 'Damage Modifiers', value: result.percent, unit: '%' }
        ];

        const hasElementalDamage = result.elementalDamagePercent !== 0;
        if (hasElementalDamage) {
            rows.push({ label: 'Elemental Power', value: result.elementalPower });
            rows.push({
                label: 'Elemental Damage (EP)',
                value: result.effectiveElementalPercent,
                unit: '%'
            });
        }

        rows.push({ label: 'Damage', value: result.damage });
        return rows;
    }
};
