import { BASE_CRIT_DAMAGE, BASE_ELEMENTAL_POWER, CLASS_KEYS } from '../data/constants.js';

/** @typedef {import('../data/types.js').BuildState} BuildState */
/** @typedef {import('../data/types.js').ClassKey} ClassKey */
/** @typedef {import('../data/types.js').DomainData} DomainData */
/** @typedef {import('../data/types.js').StatTotals} StatTotals */

/**
 * Crea la struttura vuota dei valori delle skill per ogni classe.
 * @returns {Record<ClassKey, Record<string, number>>}
 */
function createSkillValues() {
    /** @type {Record<ClassKey, Record<string, number>>} */
    const values = /** @type {Record<ClassKey, Record<string, number>>} */ ({});
    CLASS_KEYS.forEach(classKey => {
        values[classKey] = {};
    });
    return values;
}

/**
 * Aggiunge un contributo a una statistica, separando flat e percentuale.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} stat
 * @param {number} value
 * @param {boolean} percent
 */
function addStat(statsValues, stat, value, percent) {
    if (!Number.isFinite(value) || value === 0) return;

    const statKey = stat.replace(/%$/, '').trim();
    if (!statKey) return;

    const totals = statsValues[statKey] || (statsValues[statKey] = { flat: 0, percent: 0 });
    if (percent) totals.percent += value;
    else totals.flat += value;
}

/**
 * Calcola le statistiche derivate dalla build e dal catalogo.
 * Funzione pura: non muta gli argomenti e non tocca il DOM.
 * @param {DomainData} catalog
 * @param {BuildState} build
 * @returns {{statsValues: Record<string, StatTotals>, skillValues: Record<ClassKey, Record<string, number>>}}
 */
export function selectStats(catalog, build) {
    /** @type {Record<string, StatTotals>} */
    const statsValues = {};
    const skillValues = createSkillValues();

    Object.values(build.activeEquip).forEach(item => {
        if (!item.stats) return;

        Object.entries(item.stats).forEach(([stat, val]) => {
            if (stat.includes("Augment") || stat.includes("Level") || stat.includes("Damage Type"))
                return;

            let numericVal = 0;
            let isPercent = false;

            if (typeof val === 'number') {
                numericVal = val;
            } else if (typeof val === 'string') {
                if (val.includes('%')) {
                    numericVal = parseFloat(val.replace('%', '').replace(',', '.'));
                    isPercent = true;
                } else {
                    numericVal = parseFloat(val.replace(',', '.'));
                }
            }

            if (!isNaN(numericVal)) {
                addStat(statsValues, stat, numericVal, isPercent || stat.endsWith('%'));
            }
        });
    });

    build.elixirs.forEach(elixir => {
        if (elixir.val > 0) {
            addStat(statsValues, elixir.stat, elixir.val * elixir.perLevel, elixir.percent);
        }
    });

    for (const classKey of CLASS_KEYS) {
        const nodes = catalog.skillTrees[classKey].nodes;
        const levels = build.treeLevels[classKey];

        Object.keys(nodes).forEach(id => {
            const node = nodes[id];
            const level = levels.get(id) || 0;

            if (level <= 0 || !node.statKey) return;

            let rawStat = node.statKey;

            if (node.parameters) {
                for (const [key, param] of Object.entries(node.parameters)) {
                    const calculatedVal = param.base + (param.increase * (level - 1));
                    rawStat = rawStat.replaceAll(`{${key}}`, String(calculatedVal));
                }
            }
            rawStat = rawStat.replaceAll("{level}", String(level)).trim();

            const numberMatch = rawStat.match(/^-?\d+(?:[.,]\d+)?%?/);
            if (!numberMatch) return;

            const numericVal = parseFloat(numberMatch[0].replace('%', '').replace(',', '.')) || 0;
            const isPercent = numberMatch[0].includes('%');
            const isNegative = rawStat.startsWith('-');
            const finalStatKey = rawStat.slice(numberMatch[0].length).trim();

            if (!isNaN(numericVal) && numericVal !== 0 && finalStatKey) {
                const value = isNegative ? -Math.abs(numericVal) : numericVal;

                if (node.isDirect) {
                    addStat(statsValues, finalStatKey, value, isPercent);
                } else {
                    skillValues[classKey][finalStatKey] = value;
                }
            }
        });
    }

    return { statsValues, skillValues };
}

/**
 * Aggiunge le statistiche di base del personaggio per la sola visualizzazione:
 * - Elemental Power: 100 flat di base
 * - Crit Damage: 50% di base
 *
 * Non va usata nel calcolo del danno, dove le basi sono applicate dagli step.
 * @param {Record<string, StatTotals>} statsValues
 * @returns {Record<string, StatTotals>}
 */
export function withBaseStats(statsValues) {
    const displayStats = structuredClone(statsValues);

    const elementalPower = displayStats['Elemental Power'] || { flat: 0, percent: 0 };
    displayStats['Elemental Power'] = {
        flat: elementalPower.flat + BASE_ELEMENTAL_POWER,
        percent: elementalPower.percent
    };

    const critDamage = displayStats['Crit Damage'] || { flat: 0, percent: 0 };
    displayStats['Crit Damage'] = {
        flat: critDamage.flat,
        percent: critDamage.percent + BASE_CRIT_DAMAGE
    };

    return displayStats;
}
