/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Nodi del tree warrior usati dal calcolo danni.
 * @type {{
 *   relentlessAssault: string,
 *   chainedStrike: string,
 *   ultimateScream: string,
 *   ultimateVengance: string,
 *   bloodlustStacks: string,
 *   bloodlustCapacity: string,
 *   bloodthirsty: string,
 *   potatoMines: string,
 *   poisonedPotatoes: string,
 *   hotPotato: string
 * }}
 */
export const WARRIOR_NODES = {
    relentlessAssault: 'UL1',
    chainedStrike: 'UL2',
    ultimateScream: 'UR1',
    ultimateVengance: 'UR2',
    bloodlustStacks: 'L1',
    bloodlustCapacity: 'L1a',
    bloodthirsty: 'L1b',
    potatoMines: 'R1',
    poisonedPotatoes: 'R1a',
    hotPotato: 'R1b'
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
 * Legge un nodo del tree warrior dal livello della build.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @returns {number}
 */
export function getWarriorNodeValue(context, nodeId) {
    const node = context.skillTrees?.warrior?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.warrior?.get(nodeId) ?? 0;

    return getNodeValue(node, level);
}

/**
 * Legge il livello investito in un nodo warrior.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @returns {number}
 */
export function getWarriorNodeLevel(context, nodeId) {
    return context.build?.treeLevels?.warrior?.get(nodeId) ?? 0;
}

/**
 * Legge un parametro specifico di un nodo warrior.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @param {string} parameterKey
 * @returns {number}
 */
export function getWarriorNodeParameter(context, nodeId, parameterKey) {
    const node = context.skillTrees?.warrior?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.warrior?.get(nodeId) ?? 0;
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.[parameterKey];
    if (!parameter) return 0;

    return parameter.base + parameter.increase * (level - 1);
}
