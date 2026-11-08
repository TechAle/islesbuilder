import { BASE_ATTACK_TIME } from '../../data/constants.js';
import { getCalculatedStrikeEffects } from '../classes/archer.js';
import { findPercent } from './statLookup.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Intervallo effettivo tra attacchi, considerando Attack Cooldown e
 * l'eventuale override "Slow attack".
 * @param {DamageContext} context
 * @returns {number}
 */
export function getAttackInterval(context) {
    const cooldownPercent = findPercent(context.statsValues, 'Attack Cooldown');
    const calculatedStrike = getCalculatedStrikeEffects(
        context,
        context.settings?.calculatedStrikeKillsPerSecond ?? 0
    );
    const totalCooldownPercent = cooldownPercent - calculatedStrike.attackCooldownReduction;
    const computedInterval = BASE_ATTACK_TIME * (1 + totalCooldownPercent / 100);

    const override = context.settings?.slowAttack ? context.settings.attackInterval : null;
    const validOverride = typeof override === 'number' && Number.isFinite(override) && override > 0;

    return Math.max(0.05, validOverride ? override : computedInterval);
}
