import { getSharpshooterEffects } from '../../../classes/archer.js';
import { getCombatHits } from '../../../classes/mage.js';
import { getCritChancePercent } from '../../critStats.js';

/** @typedef {import('../../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../../data/types.js').SharpshooterStepResult} SharpshooterStepResult */

/**
 * Step 3.5 — Sharpshooter.
 *
 * Stima gli stack in base agli hit/s reali:
 * - ogni hit entro `a` secondi dà uno stack, con cooldown 0.2s;
 * - gli stack si fermano a 10 + Sharpshooter Capacity;
 * - in un fight lungo senza subire danno si arriva al massimo.
 *
 * Il bonus danno viene applicato prima dei critici. Hot Streak aggiunge Crit
 * Chance e Crit Damage quando si raggiungono almeno 10 stack.
 *
 * @type {import('../../../../data/types.js').DamageStep}
 */
export const sharpshooterStep = {
    id: 'sharpshooter',
    label: 'Sharpshooter',

    /**
     * @param {DamageContext} context
     * @returns {SharpshooterStepResult}
     */
    run(context) {
        const previousDamage = context.results.damageMultiplier?.damage
            ?? context.results.damageModifiers?.damage
            ?? 0;

        // Modello hit condiviso: attacchi base, burst, special attacks (anche
        // mage), Ricochet, esplosioni dei cristalli, support orbs e passive.
        const combatHits = getCombatHits(
            context,
            getCritChancePercent(context)
        );
        const totalHitsPerSecond = combatHits.totalHitsPerSecond;

        const effects = getSharpshooterEffects(context, totalHitsPerSecond);
        const damage = previousDamage * (1 + effects.damagePercent / 100);
        const visible = effects.stackValuePercent > 0
            || effects.capacity > 0
            || effects.hotStreakLevel > 0;

        return {
            visible,
            baseDamage: previousDamage,
            damage,
            ricochetHitsPerSecond: combatHits.ricochetHitsPerSecond ?? 0,
            ...effects
        };
    },

    /**
     * @param {SharpshooterStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.visible === true;
    },

    /**
     * @param {SharpshooterStepResult} result
     * @returns {import('../../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.visible) return [];

        if (!result.enabled || !result.canGainStacks) {
            return [{ label: 'Sharpshooter', value: result.reason ?? 'Not active' }];
        }

        const rows = [
            {
                label: 'Time to Max Stacks',
                value: Number.isFinite(result.timeToMaxStacks) ? result.timeToMaxStacks : '∞',
                ...(Number.isFinite(result.timeToMaxStacks) ? { unit: 's' } : {})
            },
            { label: 'Sharpshooter Damage', value: result.damagePercent, unit: '%' }
        ];

        if (result.hotStreakActive) {
            rows.push(
                { label: 'Hot Streak Crit Chance', value: result.hotStreakCritChancePercent, unit: '%' },
                { label: 'Hot Streak Crit Damage', value: result.hotStreakCritDamagePercent, unit: '%' }
            );
        } else if (result.hotStreakLevel > 0) {
            rows.push({ label: 'Hot Streak', value: 'Inactive' });
        }

        return rows;
    }
};
