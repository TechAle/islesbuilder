/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Nodi del tree dell'arciere usati dal calcolo danni.
 * @type {{calculatedStrike: string}}
 */
export const ARCHER_NODES = {
    calculatedStrike: 'UL'
};

/**
 * Legge il valore scalato di un nodo per il livello corrente.
 * @param {{parameters?: Record<string, {base: number, increase: number}>}|undefined} node
 * @param {number} level
 * @returns {number}
 */
function getNodeValue(node, level) {
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.val;
    if (!parameter) return level;

    return parameter.base + parameter.increase * (level - 1);
}

/**
 * Legge un nodo del tree dell'arciere dal livello della build.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @returns {number}
 */
export function getArcherNodeValue(context, nodeId) {
    const node = context.skillTrees?.archer?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.archer?.get(nodeId) ?? 0;

    return getNodeValue(node, level);
}

/**
 * Calculated Strike: ogni kill ha una probabilità di resettare il cooldown
 * dell'attacco. Trattiamo il reset come attack speed extra, cioè come una
 * riduzione del cooldown proporzionale alle kill al secondo.
 *
 * @param {DamageContext} context
 * @param {number} killsPerSecond
 * @returns {{
 *   calculatedStrikePercent: number,
 *   killsPerSecond: number,
 *   attackCooldownReduction: number
 * }}
 */
export function getCalculatedStrikeEffects(context, killsPerSecond) {
    const calculatedStrikePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.calculatedStrike
    );
    const kills = Math.min(4, Math.max(0, Number(killsPerSecond) || 0));
    const attackCooldownReduction = calculatedStrikePercent * kills;

    return {
        calculatedStrikePercent,
        killsPerSecond: kills,
        attackCooldownReduction
    };
}
