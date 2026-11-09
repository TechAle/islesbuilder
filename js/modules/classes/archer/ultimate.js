import { ULTIMATE_BUFF_SECONDS } from '../../../data/constants.js';
import { getBurstCycleEffects } from '../mage/burst.js';
import { hasBurstCore } from '../core.js';
import { ARCHER_NODES, getArcherNodeValue } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Ultimatum Criterium / Ultimatum Vagrus.
 *
 * Ogni cast della burst applica un buff di 5 secondi. Il valore medio è:
 *
 *   buff medio = valore nodo × min(1, 5 / burstCycle)
 *
 * dove `burstCycle` include la riduzione cooldown di Potential Charge e i
 * reset di Second Wind.
 *
 * Vale per qualunque burst/Ultimate, ma solo se la burst è effettivamente
 * attiva: servono sia un core con burst (Mage Core o Archer Core) sia
 * `useBurst`. Senza core, o con la burst spenta, il nodo non dà nulla.
 * Il buff dipende da quanto spesso viene castata l'Ultimate; la burst del Mage
 * resta l'unica di cui simuliamo il danno, ma il suo ciclo è lo stesso usato
 * per calcolare l'uptime del buff.
 *
 * @param {DamageContext} context
 * @returns {import('../../../data/types.js').UltimateEffectsResult}
 */
export function getUltimateEffects(context) {
    const rawCritChancePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.ultimateCriterium
    );
    const rawCritDamagePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.ultimateVagrus
    );
    const visible = rawCritChancePercent > 0 || rawCritDamagePercent > 0;

    const burst = getBurstCycleEffects(context);
    const burstImplemented = hasBurstCore(context);
    const burstActive = !!context.settings?.useBurst;
    const enabled = visible && burstImplemented && burstActive;
    const uptime = enabled && burst.burstCycle > 0
        ? Math.min(1, ULTIMATE_BUFF_SECONDS / burst.burstCycle)
        : 0;

    let reason = null;
    if (!visible) {
        reason = 'Requires Ultimatum Criterium or Vagrus';
    } else if (!burstImplemented) {
        reason = 'Requires Mage Core or Archer Core';
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
        critChancePercent: rawCritChancePercent * uptime,
        critDamagePercent: rawCritDamagePercent * uptime,
        rawCritChancePercent,
        rawCritDamagePercent,
        secondWindChancePercent: burst.secondWindChancePercent,
        secondWindCooldownSeconds: burst.secondWindCooldownSeconds,
        secondWindResetsPerSecond: burst.secondWindResetsPerSecond,
        hasSecondWind: burst.hasSecondWind,
        reason
    };
}
