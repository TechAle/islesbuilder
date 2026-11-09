import { BASE_CRIT_DAMAGE } from '../../data/constants.js';
import {
    getCriticalPityEffects,
    getDeadeyeEffects,
    getElementalBurstEffects,
    getSharpshooterEffects,
    getUltimateEffects
} from '../classes/archer.js';
import { getTotalHitsPerSecond } from '../classes/mage.js';
import { getItemSetEffects } from '../itemSets.js';
import { findPercent } from './statLookup.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Statistiche critiche condivise.
 *
 * Deadeye e Hot Streak non sono "black box" dentro Critical Damage: qui
 * esponiamo funzioni di supporto che sommano esplicitamente i contributi alla
 * Crit Chance e Crit Damage di base.
 *
 * Regola:
 *   Crit Chance totale = base + Hot Streak + Deadeye + Critical Pity + Ultimate
 *   Crit Damage totale = 50 + statistica + Hot Streak + Perfect Chain + Elemental Burst + Ultimate
 *
 * Deadeye e Critical Pity sono calcolati separatamente, entrambi a partire
 * dalla stessa Crit Chance media indipendente (base + Hot Streak). È una
 * semplificazione: nella realtà i due processi si influenzano, ma combinarli
 * renderebbe il modello molto più complesso.
 *
 * I bonus Ultimate sono già mediati sull'uptime della burst (5s di buff per
 * ogni cast), quindi entrano nelle funzioni condivise come valori medi.
 *
 * Gli hit usati da Deadeye arrivano sempre da `getTotalHitsPerSecond`, la
 * funzione unica che aggrega tutte le fonti di hit.
 *
 * C'è un fixed-point leggero: la Crit Chance effettiva influenza la capacità
 * extra delle Support Orbs, che a sua volta cambia gli hit totali e quindi
 * Deadeye/Hot Streak. Iteriamo poche volte passando esplicitamente la Crit
 * Chance al modello hit, senza richiamare ricorsivamente queste funzioni.
 */

/** Numero massimo di iterazioni del fixed-point. */
const CRIT_STATS_MAX_ITERATIONS = 3;

/** Tolleranza di convergenza sugli hit/s. */
const CRIT_STATS_HIT_TOLERANCE = 1e-9;

/**
 * Calcola una volta per contesto Crit Chance, Crit Damage, Hot Streak e
 * Deadeye, convergendo sul numero di hit/s.
 *
 * @param {DamageContext} context
 * @returns {{
 *   critChancePercent: number,
 *   totalHitsPerSecond: number,
 *   distillableCritDamagePercent: number,
 *   critDamagePercent: number,
 *   sharpshooter: ReturnType<typeof getSharpshooterEffects>,
 *   deadeye: ReturnType<typeof getDeadeyeEffects>,
 *   criticalPity: ReturnType<typeof getCriticalPityEffects>,
 *   elementalBurst: ReturnType<typeof getElementalBurstEffects>,
 *   ultimate: ReturnType<typeof getUltimateEffects>,
 *   itemSets: ReturnType<typeof getItemSetEffects>
 * }}
 */
function computeCritStats(context) {
    const cache = context.cache ?? (context.cache = {});
    if (cache.critStats) return cache.critStats;

    const baseCritChanceStatPercent = findPercent(
        context.statsValues ?? {},
        'Crit Chance'
    );
    // Alliance è una Crit Chance statica: entra nella base usata anche da
    // Deadeye/Pity, non solo nel totale finale.
    const itemSets = getItemSetEffects(context);
    const baseCritChancePercent = baseCritChanceStatPercent
        + itemSets.allianceCritChancePercent;
    // L'uptime della burst non dipende dalla Crit Chance: calcoliamolo una
    // volta sola e usiamolo per entrambe le statistiche critiche.
    const ultimate = getUltimateEffects(context);
    // Elemental Burst dipende solo dalle difese elementali equipaggiate.
    const elementalBurst = getElementalBurstEffects(context);

    let totalHitsPerSecond = getTotalHitsPerSecond(context);
    /** @type {ReturnType<typeof getSharpshooterEffects>} */
    let sharpshooter;
    /** @type {ReturnType<typeof getDeadeyeEffects>} */
    let deadeye;
    /** @type {ReturnType<typeof getCriticalPityEffects>} */
    let criticalPity;
    let critChancePercent = baseCritChancePercent;

    for (let i = 0; i < CRIT_STATS_MAX_ITERATIONS; i++) {
        // Gli stack dipendono dagli hit; il loro crit bonus dipende dagli stack.
        sharpshooter = getSharpshooterEffects(context, totalHitsPerSecond);
        const independentCritChancePercent = baseCritChancePercent
            + sharpshooter.hotStreakCritChancePercent;
        deadeye = getDeadeyeEffects(
            context,
            totalHitsPerSecond,
            independentCritChancePercent
        );
        // Critical Pity è indipendente da Deadeye: usa la stessa Crit Chance
        // media di partenza, senza il bonus di Deadeye.
        criticalPity = getCriticalPityEffects(
            context,
            totalHitsPerSecond,
            independentCritChancePercent
        );

        critChancePercent = independentCritChancePercent
            + deadeye.critChanceBonusPercent
            + criticalPity.critChanceBonusPercent
            + ultimate.critChancePercent;

        // La Crit Chance effettiva può cambiare la capacità delle Support
        // Orbs e quindi gli hit totali. Ricalcoliamo il modello hit passando
        // esplicitamente la Crit Chance: nessuna chiamata ricorsiva.
        const nextHitsPerSecond = getTotalHitsPerSecond(
            context,
            critChancePercent
        );

        if (Math.abs(nextHitsPerSecond - totalHitsPerSecond) < CRIT_STATS_HIT_TOLERANCE) {
            break;
        }

        totalHitsPerSecond = nextHitsPerSecond;
    }

    // Riallinea gli effetti all'ultimo numero di hit/s.
    sharpshooter = getSharpshooterEffects(context, totalHitsPerSecond);
    const independentCritChancePercent = baseCritChancePercent
        + sharpshooter.hotStreakCritChancePercent;
    deadeye = getDeadeyeEffects(
        context,
        totalHitsPerSecond,
        independentCritChancePercent
    );
    criticalPity = getCriticalPityEffects(
        context,
        totalHitsPerSecond,
        independentCritChancePercent
    );
    critChancePercent = independentCritChancePercent
        + deadeye.critChanceBonusPercent
        + criticalPity.critChanceBonusPercent
        + ultimate.critChancePercent;

    // Base distillabile: solo Crit Damage permanente. I buff temporanei
    // (Hot Streak, Perfect Chain, Ultimate) restano fuori.
    const distillableCritDamagePercent = BASE_CRIT_DAMAGE
        + findPercent(context.statsValues ?? {}, 'Crit Damage')
        + elementalBurst.critDamageBonusPercent;
    const critDamagePercent = distillableCritDamagePercent
        + sharpshooter.hotStreakCritDamagePercent
        + deadeye.averagePerfectChainCritDamagePercent
        + ultimate.critDamagePercent;

    const stats = {
        critChancePercent,
        totalHitsPerSecond,
        distillableCritDamagePercent,
        critDamagePercent,
        sharpshooter,
        deadeye,
        criticalPity,
        elementalBurst,
        ultimate,
        itemSets
    };

    cache.critStats = stats;
    return stats;
}

/**
 * @param {DamageContext} context
 * @returns {ReturnType<typeof getSharpshooterEffects>}
 */
export function getSharpshooterCritStats(context) {
    return computeCritStats(context).sharpshooter;
}

/**
 * @param {DamageContext} context
 * @returns {ReturnType<typeof getDeadeyeEffects>}
 */
export function getDeadeyeCritStats(context) {
    return computeCritStats(context).deadeye;
}

/**
 * @param {DamageContext} context
 * @returns {ReturnType<typeof getCriticalPityEffects>}
 */
export function getCriticalPityCritStats(context) {
    return computeCritStats(context).criticalPity;
}

/**
 * @param {DamageContext} context
 * @returns {ReturnType<typeof getElementalBurstEffects>}
 */
export function getElementalBurstCritStats(context) {
    return computeCritStats(context).elementalBurst;
}

/**
 * @param {DamageContext} context
 * @returns {ReturnType<typeof getItemSetEffects>}
 */
export function getItemSetCritStats(context) {
    return computeCritStats(context).itemSets;
}

/**
 * @param {DamageContext} context
 * @returns {ReturnType<typeof getUltimateEffects>}
 */
export function getUltimateCritStats(context) {
    return computeCritStats(context).ultimate;
}

/**
 * Crit Chance effettiva: base + Hot Streak + Deadeye + Critical Pity + Ultimate.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getCritChancePercent(context) {
    return computeCritStats(context).critChancePercent;
}

/**
 * Totale hit/s usato dal calcolo critico. Include l'effetto della Crit Chance
 * effettiva sulle Support Orbs.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getCritTotalHitsPerSecond(context) {
    return computeCritStats(context).totalHitsPerSecond;
}

/**
 * Crit Damage permanente/passiva che Natural Distillation può convertire:
 * base 50 + statistica + Elemental Burst.
 *
 * Qui va aggiunta qualsiasi futura fonte permanente di Crit Damage. I buff
 * temporanei (Hot Streak, Perfect Chain, Ultimate) non vanno inclusi.
 *
 * @param {DamageContext} context
 * @returns {number}
 */
export function getDistillableCritDamagePercent(context) {
    return computeCritStats(context).distillableCritDamagePercent;
}

/**
 * Crit Damage effettiva prima di Natural Distillation:
 * base 50 + statistica + Hot Streak + Perfect Chain + Elemental Burst + Ultimate.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getCritDamagePercent(context) {
    return computeCritStats(context).critDamagePercent;
}
