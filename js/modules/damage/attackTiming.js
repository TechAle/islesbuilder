import { BASE_ATTACK_TIME } from '../../data/constants.js';
import { getCalculatedStrikeEffects } from '../classes/archer.js';
import { findPercent } from './statLookup.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Intervallo tra attacchi dato solo da `Attack Cooldown%`, senza Calculated
 * Strike. Serve anche a calcolare l'aumento equivalente di attack speed.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getBaseAttackInterval(context) {
    const cooldownPercent = findPercent(context.statsValues ?? {}, 'Attack Cooldown');
    return Math.max(0.05, BASE_ATTACK_TIME * (1 + cooldownPercent / 100));
}

/**
 * Intervallo effettivo tra attacchi, considerando Attack Cooldown,
 * Calculated Strike e l'eventuale override "Slow attack".
 *
 * Calculated Strike non riduce il cooldown: aggiunge attacchi extra.
 *   attacchi/s = 1 / intervalloBase + reset/s
 *
 * @param {DamageContext} context
 * @returns {number}
 */
export function getAttackInterval(context) {
    const override = context.settings?.slowAttack ? context.settings.attackInterval : null;
    const validOverride = typeof override === 'number' && Number.isFinite(override) && override > 0;

    if (validOverride) return Math.max(0.05, override);

    const baseInterval = getBaseAttackInterval(context);
    const calculatedStrike = getCalculatedStrikeEffects(
        context,
        context.settings?.calculatedStrikeKillsPerSecond ?? 0
    );
    const attacksPerSecond = 1 / baseInterval + calculatedStrike.extraAttacksPerSecond;

    return Math.max(0.05, 1 / attacksPerSecond);
}
