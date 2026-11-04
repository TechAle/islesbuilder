import { getBurstHitsPerSecond } from './burst.js';
import { getHitStats } from '../../damage/hitStats.js';
import { findPercent } from '../../damage/statLookup.js';
import { getMageNodeParameter, getMageNodeValue, MAGE_NODES } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

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
 * Probabilità che un Support Orb spawnato sia RED/BLUE.
 * @type {number}
 */
const SUPPORT_ORB_COLOR_CHANCE = 1 / 3;

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
    const combatHits = getCombatHitModel(context, baseHitsPerSecond);
    const critsPerSecond = combatHits.totalHitsPerSecond * critRate;
    const shardsPerSecond = critsPerSecond * (insights.chancePercent / 100);
    const averageActiveShards = shardsPerSecond * CRYSTAL_INSIGHTS_DURATION;

    return averageActiveShards * insights.elementalPowerPercent;
}

/**
 * Crystal Combustion: drop rate dei cristalli e percentuale di danno.
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
    const hitStats = getHitStats(context, getBurstHitsPerSecond(context));
    const model = getCombatHitModel(context, hitStats.totalHitsPerSecond);

    return {
        recoverChancePercent: model.crystalConfig.recoverChancePercent,
        powerChancePercent: model.crystalConfig.powerChancePercent,
        combustionPercent: getMageNodeValue(context, MAGE_NODES.crystalCombustion),
        crystalTypesActive: model.crystalConfig.crystalTypesActive,
        maxExplosions: model.crystalConfig.maxExplosions,
        hitStats,
        explosionsPerSecond: model.explosionsPerSecond,
        totalHitsPerSecond: model.totalHitsPerSecond,
        recoverCrystalsPerSecond: model.drops.recoverCrystalsPerSecond,
        powerCrystalsPerSecond: model.drops.powerCrystalsPerSecond,
        crystalsPerSecond: model.drops.crystalsPerSecond
    };
}

/**
 * Configurazione dei Support Orbs.
 * @param {DamageContext} context
 * @returns {{
 *   spawnChancePercent: number,
 *   durationSeconds: number,
 *   damagePercent: number,
 *   debuffPercent: number,
 *   maxOrbs: number,
 *   rechargeSeconds: number,
 *   extraCapacityChancePercent: number,
 *   extraCapacityDuration: number
 * }}
 */
function getSupportOrbConfig(context) {
    const magicalCapacityRecharge = getMageNodeParameter(
        context,
        MAGE_NODES.magicalCapacity,
        'a'
    );
    const magicalCapacityChance = getMageNodeParameter(
        context,
        MAGE_NODES.magicalCapacity,
        'val'
    );

    return {
        spawnChancePercent: getMageNodeParameter(context, MAGE_NODES.supportOrbs, 'a'),
        durationSeconds: getMageNodeParameter(context, MAGE_NODES.supportOrbs, 'b'),
        damagePercent: getMageNodeParameter(context, MAGE_NODES.supportOrbs, 'c'),
        debuffPercent: getMageNodeParameter(context, MAGE_NODES.supportOrbs, 'e'),
        maxOrbs: 3,
        rechargeSeconds: magicalCapacityRecharge > 0 ? magicalCapacityRecharge : 12,
        extraCapacityChancePercent: magicalCapacityChance,
        extraCapacityDuration: magicalCapacityRecharge > 0 ? magicalCapacityRecharge : 0
    };
}

/**
 * Support Orbs: hit/s RED e moltiplicatore BLUE.
 * @param {DamageContext} context
 * @returns {{
 *   spawnChancePercent: number,
 *   durationSeconds: number,
 *   damagePercent: number,
 *   maxOrbs: number,
 *   hitStats: ReturnType<typeof getHitStats>,
 *   totalHitsPerSecond: number,
 *   explosionsPerSecond: number,
 *   orbHitsPerSecond: number,
 *   activeOrbs: number,
 *   activeRedOrbs: number,
 *   activeBlueOrbs: number,
 *   blueUptime: number,
 *   blueDamageMultiplier: number,
 *   normalActiveOrbs: number,
 *   specialActiveOrbs: number,
 *   extraCapacity: number
 * }}
 */
export function getSupportOrbEffects(context) {
    const config = getSupportOrbConfig(context);
    const hitStats = getHitStats(context, getBurstHitsPerSecond(context));
    const model = getCombatHitModel(context, hitStats.totalHitsPerSecond);

    const activeBlueOrbs = model.totalActiveOrbs * SUPPORT_ORB_COLOR_CHANCE;
    const blueUptime = Math.min(1, activeBlueOrbs);
    const blueDamageMultiplier = 1 + (blueUptime * config.debuffPercent / 100);

    return {
        ...config,
        hitStats,
        totalHitsPerSecond: model.totalHitsPerSecond,
        explosionsPerSecond: model.explosionsPerSecond,
        orbHitsPerSecond: model.redOrbHitsPerSecond,
        activeOrbs: model.totalActiveOrbs,
        activeRedOrbs: model.redOrbHitsPerSecond,
        activeBlueOrbs,
        blueUptime,
        blueDamageMultiplier,
        normalActiveOrbs: model.normalActiveOrbs,
        specialActiveOrbs: model.specialActiveOrbs,
        extraCapacity: model.extraCapacity
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
 * Modello a equilibrio di hit, esplosioni e orb.
 * Il risultato viene cachato nel contesto per evitare di rieseguire
 * l'iterazione più volte nello stesso calcolo.
 *
 * @param {DamageContext} context
 * @param {number} baseHitsPerSecond
 * @returns {{
 *   baseHitsPerSecond: number,
 *   totalHitsPerSecond: number,
 *   explosionsPerSecond: number,
 *   redOrbHitsPerSecond: number,
 *   totalActiveOrbs: number,
 *   normalActiveOrbs: number,
 *   specialActiveOrbs: number,
 *   extraCapacity: number,
 *   drops: ReturnType<typeof getCrystalDropRates>,
 *   crystalConfig: ReturnType<typeof getCrystalDropConfig>,
 *   orbConfig: ReturnType<typeof getSupportOrbConfig>
 * }}
 */
function getCombatHitModel(context, baseHitsPerSecond) {
    const crystalConfig = getCrystalDropConfig(context);
    const orbConfig = getSupportOrbConfig(context);

    const override = !!context.settings?.crystalExplosionOverride;
    const fixedExplosions = Math.min(
        crystalConfig.maxExplosions,
        Math.max(0, context.settings?.crystalExplosionsPerSecond ?? 0)
    );

    const cache = context.cache ?? (context.cache = {});
    const cacheKey = `${baseHitsPerSecond.toFixed(10)}|${override ? 1 : 0}|${fixedExplosions}`;
    const cached = cache.combatHitModels?.[cacheKey];
    if (cached) return cached;

    let explosions = override ? fixedExplosions : 0;
    let redOrbHits = 0;
    const critRate = Math.min(100, Math.max(0, findPercent(context.statsValues ?? {}, 'Crit Chance'))) / 100;

    for (let i = 0; i < 200; i++) {
        const totalHits = baseHitsPerSecond + explosions + redOrbHits;
        const drops = getCrystalDropRates(context, totalHits);
        const orbs = getActiveOrbCounts(orbConfig, totalHits, critRate);

        const nextExplosions = override
            ? fixedExplosions
            : Math.min(crystalConfig.maxExplosions, drops.crystalsPerSecond);
        const nextRedOrbHits = orbs.totalActiveOrbs * SUPPORT_ORB_COLOR_CHANCE;

        if (Math.abs(nextExplosions - explosions) < 1e-12
            && Math.abs(nextRedOrbHits - redOrbHits) < 1e-12) {
            explosions = nextExplosions;
            redOrbHits = nextRedOrbHits;
            break;
        }

        explosions = nextExplosions;
        redOrbHits = nextRedOrbHits;
    }

    const totalHits = baseHitsPerSecond + explosions + redOrbHits;
    const drops = getCrystalDropRates(context, totalHits);
    const orbs = getActiveOrbCounts(orbConfig, totalHits, critRate);

    const model = {
        baseHitsPerSecond,
        totalHitsPerSecond: totalHits,
        explosionsPerSecond: explosions,
        redOrbHitsPerSecond: redOrbHits,
        totalActiveOrbs: orbs.totalActiveOrbs,
        normalActiveOrbs: orbs.normalActiveOrbs,
        specialActiveOrbs: orbs.specialActiveOrbs,
        extraCapacity: orbs.extraCapacity,
        drops,
        crystalConfig,
        orbConfig
    };

    cache.combatHitModels = cache.combatHitModels ?? {};
    cache.combatHitModels[cacheKey] = model;
    return model;
}

/**
 * Orb normali + orb speciali attive in media.
 * @param {ReturnType<typeof getSupportOrbConfig>} orbConfig
 * @param {number} totalHitsPerSecond
 * @param {number} critRate
 * @returns {{
 *   normalActiveOrbs: number,
 *   specialActiveOrbs: number,
 *   totalActiveOrbs: number,
 *   extraCapacity: number
 * }}
 */
function getActiveOrbCounts(orbConfig, totalHitsPerSecond, critRate) {
    if (orbConfig.spawnChancePercent <= 0 || orbConfig.durationSeconds <= 0) {
        return {
            normalActiveOrbs: 0,
            specialActiveOrbs: 0,
            totalActiveOrbs: 0,
            extraCapacity: 0
        };
    }

    const critsPerSecond = totalHitsPerSecond * critRate;
    const spawnAttempts = totalHitsPerSecond * (orbConfig.spawnChancePercent / 100);

    const extraCapacity = orbConfig.extraCapacityDuration > 0
        ? Math.min(
            3,
            critsPerSecond
            * (orbConfig.extraCapacityChancePercent / 100)
            * orbConfig.extraCapacityDuration
        )
        : 0;

    const maxOrbs = orbConfig.maxOrbs + extraCapacity;
    const chargeCap = maxOrbs
        * Math.min(1, orbConfig.durationSeconds / orbConfig.rechargeSeconds);

    const totalActiveOrbs = Math.min(
        maxOrbs,
        spawnAttempts * orbConfig.durationSeconds,
        chargeCap
    );

    return {
        normalActiveOrbs: Math.min(orbConfig.maxOrbs, totalActiveOrbs),
        specialActiveOrbs: Math.max(0, totalActiveOrbs - orbConfig.maxOrbs),
        totalActiveOrbs,
        extraCapacity
    };
}
