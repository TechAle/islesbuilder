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
 * Somma le percentuali che aumentano il danno del nostro tipo:
 * - `{Damage Type} Damage` (es. Arcane Damage)
 * - `{Weapon Class} Damage` (Melee / Ranged / Magic, da Weapon Type)
 * - `{Element} Damage` (es. Thunder Damage), se l'arma ha un elemento
 *
 * Le statistiche sono già aggregate da `selectStats`, quindi elisir e talenti
 * sono inclusi automaticamente.
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
            return { baseDamage: 0, percent: 0, damage: 0, modifiers: [] };
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
        if (element) addModifier(`${capitalize(element)} Damage`, `${capitalize(element)} Damage`);

        const percent = modifiers.reduce((sum, modifier) => sum + modifier.percent, 0);
        const damage = Math.max(0, baseDamage * (1 + percent / 100));

        return { baseDamage, percent, damage, modifiers };
    },

    /**
     * @param {DamageModifiersStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        return [
            { label: 'Damage Modifiers', value: result.percent, unit: '%' },
            { label: 'Damage', value: result.damage }
        ];
    }
};
