import { ARCHER_NODES, getArcherNodeParameter } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/** Durata fissa di uno stack di Critical Pity, in secondi. */
export const CRITICAL_PITY_DURATION = 2;

/**
 * Critical Pity: mancare un critico aggiunge uno stack che aumenta la Crit
 * Chance per 2 secondi, fino a un massimo di stack. Un critico rimuove tutti
 * gli stack.
 *
 * Il calcolo è volutamente separato da Deadeye, come richiesto: usa una Crit
 * Chance media indipendente (base + Hot Streak) e assume che i critici siano
 * eventi indipendenti con quella probabilità.
 *
 * Con `q = 1 - p` la probabilità di avere almeno `j` stack consecutivi è
 * `q^j`. Il numero atteso di stack è quindi:
 *
 *   E[stack] = Σ(j=1..cap) q^j
 *
 * dove `cap` è il minimo tra il massimo del nodo e gli hit ottenibili nei 2s
 * di durata. È una semplificazione: non simula l'expiry stack per stack, ma
 * limita gli stack a quelli che possono essere guadagnati nella finestra.
 *
 * @param {DamageContext} context
 * @param {number} totalHitsPerSecond
 * @param {number} averageCritChancePercent
 * @returns {import('../../../data/types.js').CriticalPityEffectsResult}
 */
export function getCriticalPityEffects(
    context,
    totalHitsPerSecond,
    averageCritChancePercent
) {
    const critChancePerStackPercent = getArcherNodeParameter(
        context,
        ARCHER_NODES.criticalPity,
        'a'
    );
    const maxStacks = getArcherNodeParameter(
        context,
        ARCHER_NODES.criticalPity,
        'b'
    );
    const visible = critChancePerStackPercent > 0 && maxStacks > 0;
    const hitsPerSecond = Number.isFinite(totalHitsPerSecond)
        ? Math.max(0, totalHitsPerSecond)
        : 0;
    const critChancePercent = Number.isFinite(averageCritChancePercent)
        ? Math.min(100, Math.max(0, averageCritChancePercent))
        : 0;
    const missChance = 1 - critChancePercent / 100;

    // Stack massimi guadagnabili nella finestra di 2s.
    const reachableStacks = Math.min(
        Math.max(0, maxStacks),
        hitsPerSecond * CRITICAL_PITY_DURATION
    );

    let expectedStacks = 0;
    if (reachableStacks > 0) {
        if (missChance >= 1) {
            expectedStacks = reachableStacks;
        } else if (missChance > 0) {
            expectedStacks = missChance
                * (1 - Math.pow(missChance, reachableStacks))
                / (1 - missChance);
        }
    }

    const critChanceBonusPercent = expectedStacks * critChancePerStackPercent;

    return {
        visible,
        enabled: visible,
        level: context.build?.treeLevels?.archer?.get(ARCHER_NODES.criticalPity) ?? 0,
        critChancePerStackPercent,
        maxStacks,
        durationSeconds: CRITICAL_PITY_DURATION,
        totalHitsPerSecond: hitsPerSecond,
        averageCritChancePercent: critChancePercent,
        missChancePercent: missChance * 100,
        reachableStacks,
        expectedStacks,
        critChanceBonusPercent,
        reason: visible ? null : 'Requires Critical Pity'
    };
}
