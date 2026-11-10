import { ULTIMATE_BUFF_SECONDS } from '../../../data/constants.js';
import { getBurstCycleEffects } from '../mage/burst.js';
import { hasBurstCore } from '../core.js';
import { WARRIOR_NODES, getWarriorNodeLevel, getWarriorNodeValue } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').WarriorUltimateEffectsResult} WarriorUltimateEffectsResult */

/**
 * Ultimatum Scream / Ultimatum Vengance.
 *
 * Ogni cast dell'Ultimate applica un buff di 5 secondi:
 *
 * - Ultimate Scream: +val% ai default attacks.
 * - Ultimate Vengance: +val% alle weapon abilities.
 *
 * Il valore medio è proporzionato all'uptime della burst:
 *
 *   uptime = min(1, 5 / burstCycle)
 *
 * Come per gli Ultimate di arciere e mago, serve una burst attiva:
 * `useBurst` + un core che la abiliti. Il ciclo include Potential Charge
 * e Second Wind quando presenti.
 *
 * @param {DamageContext} context
 * @returns {WarriorUltimateEffectsResult}
 */
export function getWarriorUltimateEffects(context) {
    const screamNodePercent = getWarriorNodeValue(
        context,
        WARRIOR_NODES.ultimateScream
    );
    const venganceNodePercent = getWarriorNodeValue(
        context,
        WARRIOR_NODES.ultimateVengance
    );
    const visible = screamNodePercent > 0 || venganceNodePercent > 0;

    const burst = getBurstCycleEffects(context);
    const burstImplemented = hasBurstCore(context);
    const burstActive = !!context.settings?.useBurst;
    const enabled = visible && burstImplemented && burstActive;
    const uptime = enabled && burst.burstCycle > 0
        ? Math.min(1, ULTIMATE_BUFF_SECONDS / burst.burstCycle)
        : 0;

    let reason = null;
    if (!visible) {
        reason = 'Requires Ultimate Scream or Vengance';
    } else if (!burstImplemented) {
        reason = 'Requires burst core';
    } else if (!burstActive) {
        reason = 'Burst disabled';
    }

    return {
        visible,
        enabled,
        durationSeconds: ULTIMATE_BUFF_SECONDS,
        burstCycle: burst.burstCycle,
        burstCastsPerSecond: burst.burstCastsPerSecond,
        uptime,
        screamNodePercent,
        venganceNodePercent,
        screamDamagePercent: screamNodePercent * uptime,
        venganceDamagePercent: venganceNodePercent * uptime,
        screamLevel: getWarriorNodeLevel(context, WARRIOR_NODES.ultimateScream),
        venganceLevel: getWarriorNodeLevel(context, WARRIOR_NODES.ultimateVengance),
        secondWindChancePercent: burst.secondWindChancePercent,
        secondWindCooldownSeconds: burst.secondWindCooldownSeconds,
        secondWindResetsPerSecond: burst.secondWindResetsPerSecond,
        hasSecondWind: burst.hasSecondWind,
        reason
    };
}
