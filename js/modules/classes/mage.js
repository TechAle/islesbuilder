import { BASE_ENERGY_REGEN, BURST_ACTIVE_SECONDS, BURST_HIT_INTERVAL, BURST_INTERVAL } from '../../data/constants.js';
import { getHitStats } from '../damage/hitStats.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../data/types.js').ElementalKnowledgeEffect} ElementalKnowledgeEffect */

/**
 * Nodi del tree del mago usati dal calcolo danni.
 * @type {{elementalChanneling: string, elementalKnowledge: string, griefInfliction: string, lastSorrow: string, focusStacks: string, focusCapacity: string, crystalInsights: string, naturalDistillation: string, elementalSynergy: string, potentialCharge: string, recoverCrystal: string, powerCrystal: string, crystalCombustion: string}}
 */
const MAGE_NODES = {
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
    crystalCombustion: 'R1b'
};

/**
 * Durata di un Crystal Shard, in secondi.
 * @type {number}
 */
const CRYSTAL_INSIGHTS_DURATION = 8;

/**
 * Cooldown tra due drop di cristalli, in secondi.
 * @type {number}
 */
const CRYSTAL_DROP_COOLDOWN = 0.5;

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
 * Grief Infliction applicato all'uptime scelto.
 * @param {DamageContext} context
 * @param {number} uptimePercent
 * @returns {{griefInflictionPercent: number, griefUptime: number, griefDamagePercent: number}}
 */
export function getGriefInflictionEffects(context, uptimePercent) {
    const griefInflictionPercent = getGriefInflictionPercent(context);
    const griefUptime = Math.min(100, Math.max(1, uptimePercent));
    const griefDamagePercent = griefInflictionPercent * (griefUptime / 100);

    return { griefInflictionPercent, griefUptime, griefDamagePercent };
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
 * Last Sorrow applicato all'uptime scelto.
 * @param {DamageContext} context
 * @param {number} uptimePercent
 * @returns {{lastSorrowPercent: number, lastSorrowUptime: number, lastSorrowDamagePercent: number}}
 */
export function getLastSorrowEffects(context, uptimePercent) {
    const lastSorrowPercent = getLastSorrowPercent(context);
    const lastSorrowUptime = Math.min(100, Math.max(1, uptimePercent));
    const lastSorrowDamagePercent = lastSorrowPercent * (lastSorrowUptime / 100);

    return { lastSorrowPercent, lastSorrowUptime, lastSorrowDamagePercent };
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
 * Focus Stacks applicati agli stack medi scelti, con clamp alla capacità.
 * @param {DamageContext} context
 * @param {number} selectedStacks
 * @returns {{
 *   focusStacksPercent: number,
 *   focusCapacity: number,
 *   maxStacks: number,
 *   focusStacks: number,
 *   focusDamagePercent: number
 * }}
 */
export function getFocusStacksEffects(context, selectedStacks) {
    const focus = getFocusStacks(context);
    const focusStacks = Math.min(focus.maxStacks, Math.max(0, selectedStacks));
    const focusDamagePercent = focusStacks * focus.focusStacksPercent;

    return {
        ...focus,
        focusStacks,
        focusDamagePercent
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
 * Verifica se il core equipaggiato è un Mage Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
export function hasMageCore(context) {
    const core = context.build?.activeEquip?.core;
    return typeof core?.name === 'string' && core.name.toLowerCase().includes('mage');
}

/**
 * Hits al secondo aggiunti dalla burst, mediati sul ciclo della burst.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getBurstHitsPerSecond(context) {
    if (!context.settings?.useBurst || !hasMageCore(context)) return 0;

    const potentialCharge = getPotentialChargeEffects(
        context,
        context.settings?.potentialChargeKills ?? 0
    );

    return (BURST_ACTIVE_SECONDS / BURST_HIT_INTERVAL) / potentialCharge.burstCycle;
}

/**
 * Stima media di Elemental Power% data da Crystal Insights.
 *
 * crit/s = critChance × attackSpeed
 * + crit/s della burst, se attiva: colpi/s × critChance
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
    const baseHitsPerSecond = (1 / attackInterval) + getBurstHitsPerSecond(context);
    const explosionsPerSecond = getCrystalExplosionsPerSecond(context, baseHitsPerSecond);
    const critsPerSecond = (baseHitsPerSecond + explosionsPerSecond) * critRate;
    const shardsPerSecond = critsPerSecond * (insights.chancePercent / 100);
    const averageActiveShards = shardsPerSecond * CRYSTAL_INSIGHTS_DURATION;

    return averageActiveShards * insights.elementalPowerPercent;
}

/**
 * Natural Distillation applicata a un dato Crit Damage totale.
 * Tutta la logica del nodo (percentuale, conversione e ×2) sta qui.
 *
 * @param {DamageContext} context
 * @param {number} critDamagePercent
 * @returns {import('../../data/types.js').NaturalDistillationEffect}
 */
export function getNaturalDistillationEffects(context, critDamagePercent) {
    const distillationPercent = getMageNodeValue(context, MAGE_NODES.naturalDistillation);
    const convertedCritDamagePercent = critDamagePercent * (distillationPercent / 100);

    return {
        distillationPercent,
        convertedCritDamagePercent,
        critDamageModifier: -convertedCritDamagePercent,
        elementalPowerFlat: convertedCritDamagePercent * 2
    };
}

/**
 * Elemental Synergy: EP flat per ogni punto intero di Energy Regen sopra 10/s.
 * @param {DamageContext} context
 * @param {number} energyRegen
 * @returns {{
 *   a: number,
 *   b: number,
 *   energyRegen: number,
 *   extraRegen: number,
 *   steps: number,
 *   elementalPowerFlat: number
 * }}
 */
export function getElementalSynergyEffects(context, energyRegen) {
    const a = getMageNodeParameter(context, MAGE_NODES.elementalSynergy, 'a');
    const b = getMageNodeParameter(context, MAGE_NODES.elementalSynergy, 'b');
    const extraRegen = Math.max(0, energyRegen - BASE_ENERGY_REGEN);
    const steps = Math.floor(extraRegen);
    const elementalPowerFlat = Math.min(steps * a, b);

    return { a, b, energyRegen, extraRegen, steps, elementalPowerFlat };
}

/**
 * Potential Charge: riduce il cooldown della burst in base ai kill.
 * @param {DamageContext} context
 * @param {number} kills
 * @returns {{
 *   potentialChargeSeconds: number,
 *   potentialChargeKills: number,
 *   cooldownReduction: number,
 *   burstCooldown: number,
 *   burstCycle: number
 * }}
 */
export function getPotentialChargeEffects(context, kills) {
    const potentialChargeSeconds = getMageNodeValue(context, MAGE_NODES.potentialCharge);
    const potentialChargeKills = Math.min(30, Math.max(0, kills));
    const cooldownReduction = potentialChargeSeconds * potentialChargeKills;

    const baseCooldown = Math.max(0, BURST_INTERVAL - BURST_ACTIVE_SECONDS);
    const burstCooldown = Math.max(0, baseCooldown - cooldownReduction);
    const burstCycle = BURST_ACTIVE_SECONDS + burstCooldown;

    return {
        potentialChargeSeconds,
        potentialChargeKills,
        cooldownReduction,
        burstCooldown,
        burstCycle
    };
}

/**
 * Crystal Combustion: drop rate dei cristalli e percentuale di danno.
 *
 * I due drop sono indipendenti e ognuno ha un cooldown di 0.5s.
 *
 * @param {DamageContext} context
 * @returns {{
 *   recoverChancePercent: number,
 *   powerChancePercent: number,
 *   combustionPercent: number,
 *   crystalTypesActive: number,
 *   maxExplosions: number,
 *   hitStats: ReturnType<typeof getHitStats>,
 *   explosionsPerSecond: number,
 *   totalHitsPerSecond: number,
 *   recoverCrystalsPerSecond: number,
 *   powerCrystalsPerSecond: number,
 *   crystalsPerSecond: number
 * }}
 */
export function getCrystalCombustionEffects(context) {
    const recoverChancePercent = getMageNodeParameter(context, MAGE_NODES.recoverCrystal, 'a');
    const powerChancePercent = getMageNodeParameter(context, MAGE_NODES.powerCrystal, 'a');
    const combustionPercent = getMageNodeValue(context, MAGE_NODES.crystalCombustion);
    const crystalTypesActive = (recoverChancePercent > 0 ? 1 : 0)
        + (powerChancePercent > 0 ? 1 : 0);
    const maxExplosions = crystalTypesActive * (1 / CRYSTAL_DROP_COOLDOWN);

    const hitStats = getHitStats(context, getBurstHitsPerSecond(context));
    const explosionsPerSecond = getCrystalExplosionsPerSecond(
        context,
        hitStats.totalHitsPerSecond
    );
    const drops = getCrystalDropRates(
        context,
        hitStats.totalHitsPerSecond + explosionsPerSecond
    );

    return {
        recoverChancePercent,
        powerChancePercent,
        combustionPercent,
        crystalTypesActive,
        maxExplosions,
        hitStats,
        explosionsPerSecond,
        totalHitsPerSecond: hitStats.totalHitsPerSecond + explosionsPerSecond,
        recoverCrystalsPerSecond: drops.recoverCrystalsPerSecond,
        powerCrystalsPerSecond: drops.powerCrystalsPerSecond,
        crystalsPerSecond: drops.crystalsPerSecond
    };
}

/**
 * Configurazione dei due drop di cristalli.
 * @param {DamageContext} context
 * @returns {{
 *   recoverChancePercent: number,
 *   powerChancePercent: number,
 *   crystalTypesActive: number,
 *   maxExplosions: number
 * }}
 */
function getCrystalDropConfig(context) {
    const recoverChancePercent = getMageNodeParameter(context, MAGE_NODES.recoverCrystal, 'a');
    const powerChancePercent = getMageNodeParameter(context, MAGE_NODES.powerCrystal, 'a');
    const crystalTypesActive = (recoverChancePercent > 0 ? 1 : 0)
        + (powerChancePercent > 0 ? 1 : 0);

    return {
        recoverChancePercent,
        powerChancePercent,
        crystalTypesActive,
        maxExplosions: crystalTypesActive * (1 / CRYSTAL_DROP_COOLDOWN)
    };
}

/**
 * Drop rate dei cristalli per un dato numero di hit/s.
 * @param {DamageContext} context
 * @param {number} hitsPerSecond
 * @returns {{
 *   recoverCrystalsPerSecond: number,
 *   powerCrystalsPerSecond: number,
 *   crystalsPerSecond: number
 * }}
 */
function getCrystalDropRates(context, hitsPerSecond) {
    const config = getCrystalDropConfig(context);
    const maxDropsPerSecond = 1 / CRYSTAL_DROP_COOLDOWN;

    const recoverCrystalsPerSecond = Math.min(
        hitsPerSecond * (config.recoverChancePercent / 100),
        maxDropsPerSecond
    );
    const powerCrystalsPerSecond = Math.min(
        hitsPerSecond * (config.powerChancePercent / 100),
        maxDropsPerSecond
    );

    return {
        recoverCrystalsPerSecond,
        powerCrystalsPerSecond,
        crystalsPerSecond: recoverCrystalsPerSecond + powerCrystalsPerSecond
    };
}

/**
 * Cristalli che esplodono al secondo.
 *
 * Se l'override è attivo usa lo slider, altrimenti cerca l'equilibrio:
 * le esplosioni sono hit e possono generare nuovi cristalli.
 *
 * @param {DamageContext} context
 * @param {number} baseHitsPerSecond
 * @returns {number}
 */
export function getCrystalExplosionsPerSecond(context, baseHitsPerSecond) {
    const config = getCrystalDropConfig(context);
    if (config.maxExplosions <= 0) return 0;

    if (context.settings?.crystalExplosionOverride) {
        return Math.min(
            config.maxExplosions,
            Math.max(0, context.settings?.crystalExplosionsPerSecond ?? 0)
        );
    }

    let explosions = 0;
    for (let i = 0; i < 100; i++) {
        const drops = getCrystalDropRates(context, baseHitsPerSecond + explosions);
        const next = Math.min(config.maxExplosions, drops.crystalsPerSecond);
        if (Math.abs(next - explosions) < 1e-12) {
            return next;
        }
        explosions = next;
    }

    return explosions;
}
