/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Nodi del tree del mago usati dal calcolo danni.
 * @type {{elementalChanneling: string, elementalKnowledge: string, griefInfliction: string, lastSorrow: string, focusStacks: string, focusCapacity: string, crystalInsights: string, naturalDistillation: string, elementalSynergy: string, potentialCharge: string, recoverCrystal: string, powerCrystal: string, crystalCombustion: string, supportOrbs: string}}
 */
export const MAGE_NODES = {
    elementalChanneling: 'DR',
    elementalKnowledge: 'DR1',
    griefInfliction: 'L2',
    lastSorrow: 'L2b',
    focusStacks: 'L1',
    focusCapacity: 'L1a',
    crystalInsights: 'UL1',
    naturalDistillation: 'UL2',
    elementalSynergy: 'UR',
    potentialCharge: 'UR1',
    recoverCrystal: 'R1',
    powerCrystal: 'R1a',
    crystalCombustion: 'R1b',
    supportOrbs: 'R2'
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
 * Legge un nodo del tree del mago dal livello della build.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @returns {number}
 */
export function getMageNodeValue(context, nodeId) {
    const node = context.skillTrees?.mage?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.mage?.get(nodeId) ?? 0;

    return getNodeValue(node, level);
}

/**
 * Legge un parametro specifico di un nodo del mago.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @param {string} parameterKey
 * @returns {number}
 */
export function getMageNodeParameter(context, nodeId, parameterKey) {
    const node = context.skillTrees?.mage?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.mage?.get(nodeId) ?? 0;
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.[parameterKey];
    if (!parameter) return 0;

    return parameter.base + parameter.increase * (level - 1);
}

/**
 * Verifica se il core equipaggiato è un Mage Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasMageCore(context) {
    const core = context.build?.activeEquip?.core;
    return typeof core?.name === 'string' && core.name.toLowerCase().includes('mage');
}
