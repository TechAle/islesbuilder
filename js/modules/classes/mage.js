/** @typedef {import('../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../data/types.js').ElementalKnowledgeEffect} ElementalKnowledgeEffect */

/**
 * Nodi del tree del mago usati dal calcolo danni.
 * @type {{elementalChanneling: string, elementalKnowledge: string, griefInfliction: string}}
 */
const MAGE_NODES = {
    elementalChanneling: 'DR',
    elementalKnowledge: 'DR1',
    griefInfliction: 'L2'
};

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
    if (context.build?.currentClass !== 'mage') return 0;

    const node = context.skillTrees?.mage?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.mage?.get(nodeId) ?? 0;

    return getNodeValue(node, level);
}

/**
 * Elemental Channeling: danno elementale extra per ogni elemento.
 * Restituisce 0 se la classe attiva non è Mage.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getElementalChannelingPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.elementalChanneling);
}

/**
 * Elemental Knowledge: moltiplicatore del danno finale.
 * Restituisce valori neutri se la classe attiva non è Mage.
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
 * Restituisce 0 se la classe attiva non è Mage.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getGriefInflictionPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.griefInfliction);
}
