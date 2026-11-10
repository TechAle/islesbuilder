import { getPotatoMinesEffects } from '../../classes/warrior.js';
import { getTotalHitsPerSecond } from '../../classes/mage.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').PotatoMinesStepResult} PotatoMinesStepResult */

/**
 * Step — Potato Mines.
 *
 * Ogni esplosione infligge `b%` del danno medio. Il rate è limitato dalla
 * probabilità di spawn per hit subito e dal numero massimo di mine/ricarica.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const potatoMinesStep = {
    id: 'potatoMines',
    label: 'Potato Mines',

    /**
     * @param {DamageContext} context
     * @returns {PotatoMinesStepResult}
     */
    run(context) {
        const averageDamage = context.results.augmentFinal?.damage
            ?? context.results.criticalDamage?.damage
            ?? 0;
        const effects = getPotatoMinesEffects(
            context,
            getTotalHitsPerSecond(context)
        );
        const damagePerExplosion = averageDamage * (
            effects.explosionDamagePercent / 100
        );
        const dps = effects.explosionsPerSecond * damagePerExplosion;
        const enabled = effects.enabled && averageDamage > 0;

        return {
            ...effects,
            enabled,
            averageDamage,
            damagePerExplosion,
            dps: enabled ? dps : 0
        };
    },

    /**
     * @param {PotatoMinesStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.visible === true;
    },

    /**
     * @param {PotatoMinesStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        return result?.enabled && result.dps > 0
            ? [{ label: 'Potato Mines', dps: result.dps }]
            : [];
    },

    /**
     * @param {PotatoMinesStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.visible) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [
            { label: 'Hits Taken / s', value: result.hitsTakenPerSecond, unit: '/s' },
            { label: 'Spawn Chance', value: result.spawnChancePercent, unit: '%' },
            { label: 'Spawn Attempts / s', value: result.spawnAttemptsPerSecond, unit: '/s' },
            { label: 'Explosions / s', value: result.explosionsPerSecond, unit: '/s' },
            { label: 'Damage per Explosion', value: result.damagePerExplosion },
            { label: 'Potato Mines DPS', value: result.dps }
        ];

        if (result.poisonDefenseReductionPercent > 0) {
            rows.push(
                {
                    label: 'Poisoned Potatoes Defense',
                    value: result.poisonDefenseReductionPercent,
                    unit: '%'
                },
                {
                    label: 'Poisoned Potatoes Uptime',
                    value: result.poisonUptime * 100,
                    unit: '%'
                },
                {
                    label: 'Average Defense Reduction',
                    value: result.averageDefenseReductionPercent,
                    unit: '%'
                }
            );
        }

        if (result.hotPotatoPerStackPercent > 0) {
            rows.push(
                {
                    label: 'Hot Potato / Hit',
                    value: result.hotPotatoPerStackPercent,
                    unit: '%'
                },
                {
                    label: 'Hot Potato Damage',
                    value: result.hotPotatoDamagePercent,
                    unit: '%'
                }
            );
        }

        return rows;
    }
};
