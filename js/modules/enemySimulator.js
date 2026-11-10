import { POTION_COOLDOWN, POTION_ENERGY } from '../data/constants.js';

/**
 * Danno reale dopo la difesa del nemico.
 *
 * Formula:
 * `damage * (damage / (damage + defence)) + defence * (damage / (damage + 10 * defence))`
 *
 * @param {number} damage
 * @param {number} defense
 * @returns {number}
 */
export function applyDefenseDamage(damage, defense) {
    const d = Math.max(0, Number(damage) || 0);
    const def = Math.max(0, Number(defense) || 0);

    if (d <= 0) return 0;
    if (def <= 0) return d;

    return d * (d / (d + def)) + def * (d / (d + 10 * def));
}

/**
 * @typedef {Object} EnemySimulationAbility
 * @property {string} name
 * @property {string} [ability]
 * @property {boolean} enabled
 * @property {number} castsPerSecond
 * @property {number} damagePercent
 * @property {number} damageTakenIncreasePercent
 * @property {number} extraHitsPerSecond
 */

/**
 * @typedef {ReturnType<typeof simulateEnemy>} EnemySimulationResult
 */

/**
 * Simula il combattimento contro un nemico con vita e difesa.
 *
 * @param {Object} input
 * @param {number} input.health
 * @param {number} input.defense
 * @param {number} input.firstHitDamage
 * @param {number} input.dps
 * @param {number} input.energyPerSecond
 * @param {number} input.maxEnergy
 * @param {number} [input.damagePercent] - Danno percentuale extra (es. resistenza elementale)
 * @param {number} [input.defenseReductionPercent] - Riduzione media della difesa nemica
 * @param {number} [input.firstStrikePercent] - Bonus First Strike sul primo colpo
 * @param {EnemySimulationAbility[]} [input.abilities]
 * @returns {{
 *   health: number,
 *   defense: number,
 *   effectiveDefense: number,
 *   defenseReductionPercent: number,
 *   damagePercent: number,
 *   firstHitDamage: number,
 *   realFirstHitDamage: number,
 *   dps: number,
 *   realDps: number,
 *   firstStrikePercent: number,
 *   oneshot: boolean,
 *   timeToKill: number,
 *   potionsNeeded: number,
 *   potionCooldownEnough: boolean,
 *   abilities: Array<{name: string, casts: number}>
 * }}
 */
export function simulateEnemy({
    health,
    defense,
    firstHitDamage,
    dps,
    energyPerSecond,
    maxEnergy,
    damagePercent = 0,
    defenseReductionPercent = 0,
    firstStrikePercent = 0,
    abilities = []
}) {
    const safeHealth = Math.max(0, Number(health) || 0);
    const safeDefense = Math.max(0, Number(defense) || 0);
    const safeDefenseReductionPercent = Math.max(
        0,
        Math.min(100, Number(defenseReductionPercent) || 0)
    );
    const effectiveDefense = safeDefense * (1 - safeDefenseReductionPercent / 100);
    const safeDamagePercent = Number(damagePercent) || 0;
    const damageMultiplier = Math.max(0, 1 + safeDamagePercent / 100);
    const adjustedFirstHitDamage = Math.max(0, (Number(firstHitDamage) || 0) * damageMultiplier);
    const adjustedDps = Math.max(0, (Number(dps) || 0) * damageMultiplier);
    const realFirstHitDamage = applyDefenseDamage(adjustedFirstHitDamage, effectiveDefense);
    const realDps = applyDefenseDamage(adjustedDps, effectiveDefense);

    const oneshot = safeHealth > 0 && realFirstHitDamage >= safeHealth;
    const remainingHealth = oneshot
        ? 0
        : Math.max(0, safeHealth - realFirstHitDamage);

    const firstStrikeBonusTime = Number(firstStrikePercent) > 0 ? 0.6 : 0;
    const timeToKill = oneshot
        ? 0
        : (realDps > 0 ? remainingHealth / realDps + firstStrikeBonusTime : Infinity);

    const deficit = Math.max(0, -(Number(energyPerSecond) || 0));
    const energyAtEnd = Number.isFinite(timeToKill)
        ? (Number(maxEnergy) || 0) - deficit * timeToKill
        : -Infinity;
    const potionsNeeded = deficit <= 0
        ? 0
        : (Number.isFinite(energyAtEnd)
            ? Math.max(0, Math.ceil(-energyAtEnd / POTION_ENERGY))
            : Infinity);
    const maxPotionsInFight = Number.isFinite(timeToKill)
        ? Math.floor(timeToKill / POTION_COOLDOWN) + 1
        : Infinity;
    const potionCooldownEnough = !Number.isFinite(potionsNeeded)
        || potionsNeeded <= maxPotionsInFight;

    const abilityCasts = abilities
        .filter(ability => ability.enabled
            && ability.castsPerSecond > 0
            && (ability.damagePercent > 0
                || ability.damageTakenIncreasePercent > 0
                || ability.extraHitsPerSecond > 0))
        .map(ability => ({
            name: ability.ability ?? ability.name,
            casts: Number.isFinite(timeToKill)
                ? Math.ceil(ability.castsPerSecond * timeToKill)
                : Infinity
        }));

    return {
        health: safeHealth,
        defense: safeDefense,
        effectiveDefense,
        defenseReductionPercent: safeDefenseReductionPercent,
        damagePercent: safeDamagePercent,
        firstHitDamage: adjustedFirstHitDamage,
        realFirstHitDamage,
        dps: adjustedDps,
        realDps,
        firstStrikePercent: Math.max(0, Number(firstStrikePercent) || 0),
        oneshot,
        timeToKill,
        potionsNeeded,
        potionCooldownEnough,
        abilities: abilityCasts
    };
}
