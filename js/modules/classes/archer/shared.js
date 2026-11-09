/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/** Cooldown fisso di Ricochet, in secondi. */
export const RICOCHET_COOLDOWN = 2;

/** Cooldown condiviso tra i gain di Sharpshooter, in secondi. */
export const SHARPSHOOTER_GAIN_COOLDOWN = 0.2;

/** Stack massimi base di Sharpshooter, prima di Sharpshooter Capacity. */
export const SHARPSHOOTER_BASE_MAX_STACKS = 10;

/**
 * Nodi del tree dell'arciere usati dal calcolo danni.
 * @type {{
 *   calculatedStrike: string,
 *   ricochet: string,
 *   sharpshooterStacks: string,
 *   sharpshooterCapacity: string,
 *   hotStreak: string,
 *   deadeyeStacks: string,
 *   deadeyeCapacity: string,
 *   perfectChain: string,
 *   criticalPity: string,
 *   elementalBurst: string,
 *   ultimateCriterium: string,
 *   ultimateVagrus: string
 * }}
 */
export const ARCHER_NODES = {
    calculatedStrike: 'UL',
    ricochet: 'UL1',
    sharpshooterStacks: 'L1',
    sharpshooterCapacity: 'L1a',
    hotStreak: 'L1b',
    deadeyeStacks: 'L2',
    deadeyeCapacity: 'L2a',
    perfectChain: 'L2b',
    criticalPity: 'UL2',
    elementalBurst: 'UR',
    ultimateCriterium: 'UR1',
    ultimateVagrus: 'UR2'
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
 * Legge il livello investito in un nodo arciere.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @returns {number}
 */
export function getArcherNodeLevel(context, nodeId) {
    return context.build?.treeLevels?.archer?.get(nodeId) ?? 0;
}

/**
 * Legge un parametro specifico di un nodo arciere.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @param {string} parameterKey
 * @returns {number}
 */
export function getArcherNodeParameter(context, nodeId, parameterKey) {
    const node = context.skillTrees?.archer?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.archer?.get(nodeId) ?? 0;
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.[parameterKey];
    if (!parameter) return 0;

    return parameter.base + parameter.increase * (level - 1);
}
