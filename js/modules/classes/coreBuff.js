import { getBurstCore } from './core.js';
import { getBurstCycleEffects } from './mage/burst.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Buff di danno del core equipaggiato.
 *
 * Per ora vale per l'Assassin Core: +25% per 6 secondi dopo il cast.
 * Il valore medio è proporzionato all'uptime:
 *
 *   uptime = min(1, activeSeconds / burstCycle)
 *   damagePercent = buffDamagePercent × uptime
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   coreName: string|null,
 *   buffDamagePercent: number,
 *   activeSeconds: number,
 *   burstCycle: number,
 *   uptime: number,
 *   damagePercent: number,
 *   reason: string|null
 * }}
 */
export function getCoreBuffEffects(context) {
    const core = getBurstCore(context);
    const buffDamagePercent = core?.buffDamagePercent ?? 0;
    const activeSeconds = core?.activeSeconds ?? 0;
    const burst = getBurstCycleEffects(context);
    const burstActive = !!context.settings?.useBurst;
    const enabled = buffDamagePercent > 0 && !!core && burstActive;
    const uptime = enabled && burst.burstCycle > 0
        ? Math.min(1, activeSeconds / burst.burstCycle)
        : 0;

    let reason = null;
    if (buffDamagePercent <= 0) {
        reason = 'Core has no damage buff';
    } else if (!core) {
        reason = 'Requires Assassin Core';
    } else if (!burstActive) {
        reason = 'Burst disabled';
    }

    return {
        visible: buffDamagePercent > 0,
        enabled,
        coreName: core?.name ?? null,
        buffDamagePercent,
        activeSeconds,
        burstCycle: burst.burstCycle,
        uptime,
        damagePercent: buffDamagePercent * uptime,
        reason
    };
}
