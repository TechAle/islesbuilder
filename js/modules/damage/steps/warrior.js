import {
    getBloodlustEffects,
    getChainedStrikeEffects,
    getPotatoMinesEffects,
    getRelentlessAssaultEffects
} from '../../classes/warrior.js';
import { getTotalHitsPerSecond } from '../../classes/mage.js';
import { applyAdditiveMultipliers } from '../applyMultipliers.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').WarriorStepResult} WarriorStepResult */

/**
 * Step 3.75 — Warrior damage modifiers.
 *
 * - Relentless Assault: la kill successiva potenzia il prossimo hit. Il bonus
 *   medio è `val × min(1, kills/s / hit/s)`.
 * - Chained Strike: ogni 5° hit fa più danno, quindi il bonus medio è `val/5`.
 *
 * I due bonus vengono sommati sulla stessa base e applicati prima dei critici.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const warriorStep = {
    id: 'warrior',
    label: 'Warrior',

    /**
     * @param {DamageContext} context
     * @returns {WarriorStepResult}
     */
    run(context) {
        const previousDamage = context.results.sharpshooter?.damage
            ?? context.results.damageMultiplier?.damage
            ?? context.results.damageModifiers?.damage
            ?? 0;

        const totalHitsPerSecond = getTotalHitsPerSecond(context);
        const relentlessAssault = getRelentlessAssaultEffects(
            context,
            totalHitsPerSecond
        );
        const chainedStrike = getChainedStrikeEffects(context);
        const bloodlust = getBloodlustEffects(context);
        const potatoMines = getPotatoMinesEffects(context, totalHitsPerSecond);

        const applied = applyAdditiveMultipliers(previousDamage, [
            relentlessAssault.damagePercent,
            chainedStrike.damagePercent,
            bloodlust.damagePercent,
            bloodlust.bloodthirstyDamagePercent,
            potatoMines.hotPotatoDamagePercent
        ]);

        const visible = relentlessAssault.visible
            || chainedStrike.visible
            || bloodlust.visible
            || potatoMines.visible;

        return {
            visible,
            enabled: visible,
            baseDamage: previousDamage,
            damage: applied.damage,
            totalHitsPerSecond,
            relentlessAssault,
            chainedStrike,
            bloodlust,
            potatoMines,
            relentlessAssaultNodePercent: relentlessAssault.nodePercent,
            chainedStrikeNodePercent: chainedStrike.nodePercent,
            bloodlustNodePercent: bloodlust.dmgPerStackPercent,
            potatoMinesNodePercent: potatoMines.explosionDamagePercent,
            relentlessAssaultDamagePercent: relentlessAssault.damagePercent,
            chainedStrikeDamagePercent: chainedStrike.damagePercent,
            bloodlustDamagePercent: bloodlust.damagePercent,
            bloodthirstyDamagePercent: bloodlust.bloodthirstyDamagePercent,
            hotPotatoDamagePercent: potatoMines.hotPotatoDamagePercent,
            totalDamagePercent: applied.totalPercent,
            multiplier: applied.multiplier
        };
    },

    /**
     * @param {WarriorStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.visible === true;
    },

    /**
     * @param {WarriorStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.visible) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [];

        if (result.relentlessAssaultNodePercent > 0) {
            rows.push(
                {
                    label: 'Relentless Assault',
                    value: result.relentlessAssaultNodePercent,
                    unit: '%'
                },
                {
                    label: 'Relentless Kills / s',
                    value: result.relentlessAssault.killsPerSecond,
                    unit: '/s'
                },
                {
                    label: 'Relentless Coverage',
                    value: result.relentlessAssault.coverage * 100,
                    unit: '%'
                },
                {
                    label: 'Relentless Damage',
                    value: result.relentlessAssaultDamagePercent,
                    unit: '%'
                }
            );
        }

        if (result.chainedStrikeNodePercent > 0) {
            rows.push(
                {
                    label: 'Chained Strike',
                    value: result.chainedStrikeNodePercent,
                    unit: '%'
                },
                {
                    label: 'Chained Strike Damage',
                    value: result.chainedStrikeDamagePercent,
                    unit: '%'
                }
            );
        }

        if (result.bloodlustNodePercent > 0) {
            rows.push(
                {
                    label: 'Bloodlust / Stack',
                    value: result.bloodlust.dmgPerStackPercent,
                    unit: '%'
                },
                {
                    label: 'Bloodlust Hits / s',
                    value: result.bloodlust.hitsTakenPerSecond,
                    unit: '/s'
                },
                {
                    label: 'Bloodlust Window',
                    value: result.bloodlust.windowSeconds,
                    unit: 's'
                },
                {
                    label: 'Bloodlust Stacks',
                    value: result.bloodlust.averageStacks
                },
                {
                    label: 'Bloodlust Damage',
                    value: result.bloodlustDamagePercent,
                    unit: '%'
                }
            );

            if (result.bloodlust.bloodthirstyPerStackPercent > 0) {
                rows.push({
                    label: 'Bloodthirsty Damage',
                    value: result.bloodthirstyDamagePercent,
                    unit: '%'
                });
            }
        }

        if (result.hotPotatoDamagePercent > 0) {
            rows.push(
                {
                    label: 'Hot Potato / Hit',
                    value: result.potatoMines.hotPotatoPerStackPercent,
                    unit: '%'
                },
                {
                    label: 'Hot Potato Coverage',
                    value: result.potatoMines.hotPotatoCoverage * 100,
                    unit: '%'
                },
                {
                    label: 'Hot Potato Damage',
                    value: result.hotPotatoDamagePercent,
                    unit: '%'
                }
            );
        }

        rows.push(
            { label: 'Warrior Damage', value: result.totalDamagePercent, unit: '%' },
            { label: 'Damage', value: result.damage }
        );

        return rows;
    }
};
