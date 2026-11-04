/** @typedef {import('../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../data/types.js').ElementalKnowledgeEffect} ElementalKnowledgeEffect */

/**
 * Nodi del tree del mago usati dal calcolo danni.
 * @type {{elementalChanneling: string, elementalKnowledge: string, griefInfliction: string, lastSorrow: string, focusStacks: string, focusCapacity: string, crystalInsights: string}}
 */
const MAGE_NODES = {
    elementalChanneling: 'DR',
    elementalKnowledge: 'DR1',
    griefInfliction: 'L2',
    lastSorrow: 'L2b',
    focusStacks: 'L1',
    focusCapacity: 'L1a',
    crystalInsights: 'UL1'
};

/**
 * Durata di un Crystal Shard, in secondi.
 * @type {number}
 */
const CRYSTAL_INSIGHTS_DURATION = 8;

/**
 * Ogni 1% di Elemental Knowledge aumenta il danno finale del 9%.
 * @type {number}
 */
const ELEMENTAL_KNOWLEDGE_MULTIPLIER = 9;

/**
 * Legge il valore scalato di un nodo per il livello corrente.
 * Usa il parametro `val` del nodo (es. 2.5 per livello di Channeling).
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
function getMageNodeValue(context, nodeId) {
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
function getMageNodeParameter(context, nodeId, parameterKey) {
    const node = context.skillTrees?.mage?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.mage?.get(nodeId) ?? 0;
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.[parameterKey];
    if (!parameter) return 0;

    return parameter.base + parameter.increase * (level - 1);
}

/**
 * Elemental Channeling: danno elementale extra per ogni elemento.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getElementalChannelingPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.elementalChanneling);
}

/**
 * Elemental Knowledge: moltiplicatore del danno finale.
 * @param {DamageContext} context
 * @returns {ElementalKnowledgeEffect}
 */
export function getElementalKnowledge(context) {
    const elementalKnowledgePercent = getMageNodeValue(context, MAGE_NODES.elementalKnowledge);
    const damageMultiplierPercent = elementalKnowledgePercent * ELEMENTAL_KNOWLEDGE_MULTIPLIER;

    return {
        elementalKnowledgePercent,
        damageMultiplierPercent,
        damageMultiplier: 1 + damageMultiplierPercent / 100
    };
}

/**
 * Grief Infliction: percentuale di danno extra subita dai nemici afflitti.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getGriefInflictionPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.griefInfliction);
}

/**
 * Last Sorrow: danno extra sul colpo successivo quando Grief scade.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getLastSorrowPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.lastSorrow);
}

/**
 * Focus Stacks: danno% per stack e capacità massima.
 * La base è 3 stack, aumentata da Focus Capacity.
 * @param {DamageContext} context
 * @returns {{focusStacksPercent: number, focusCapacity: number, maxStacks: number}}
 */
export function getFocusStacks(context) {
    const focusStacksPercent = getMageNodeValue(context, MAGE_NODES.focusStacks);
    const focusCapacity = getMageNodeValue(context, MAGE_NODES.focusCapacity);

    return {
        focusStacksPercent,
        focusCapacity,
        maxStacks: 3 + focusCapacity
    };
}

/**
 * Crystal Insights: probabilità e potenza del buff di Elemental Power.
 * @param {DamageContext} context
 * @returns {{chancePercent: number, elementalPowerPercent: number}}
 */
export function getCrystalInsights(context) {
    return {
        chancePercent: getMageNodeParameter(context, MAGE_NODES.crystalInsights, 'a'),
        elementalPowerPercent: getMageNodeParameter(context, MAGE_NODES.crystalInsights, 'b')
    };
}

/**
 * Stima media di Elemental Power% data da Crystal Insights.
 *
 * crit/s = critChance × attackSpeed
 * shard/s = crit/s × chance%
 * shard medi attivi = shard/s × 8s
 * EP% medio = shard medi × b%
 *
 * @param {DamageContext} context
 * @param {number} critChancePercent
 * @param {number} attackInterval
 * @returns {number}
 */
export function getCrystalInsightsElementalPowerPercent(context, critChancePercent, attackInterval) {
    const insights = getCrystalInsights(context);

    if (insights.chancePercent <= 0 || insights.elementalPowerPercent <= 0) return 0;
    if (!Number.isFinite(attackInterval) || attackInterval <= 0) return 0;

    const critRate = Math.min(100, Math.max(0, critChancePercent)) / 100;
    const critsPerSecond = critRate / attackInterval;
    const shardsPerSecond = critsPerSecond * (insights.chancePercent / 100);
    const averageActiveShards = shardsPerSecond * CRYSTAL_INSIGHTS_DURATION;

    return averageActiveShards * insights.elementalPowerPercent;
}
