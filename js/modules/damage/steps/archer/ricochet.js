import { getRicochetEffects } from '../../../classes/archer.js';

/** @typedef {import('../../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../../data/types.js').RicochetStepResult} RicochetStepResult */

/**
 * Step 8.5 — Ricochet.
 *
 * Gli attacchi ranged hanno una probabilità di scagliare una freccia verso il
 * nemico più vicino. La freccia è danno abilità: usa il reverse del Default
 * Attack e viene aumentata da `Ability Damage%`.
 *
 * Non funziona con armi magic o melee: serve un'arma ranged.
 *
 * @type {import('../../../../data/types.js').DamageStep}
 */
export const ricochetStep = {
    id: 'ricochet',
    label: 'Ricochet',

    /**
     * @param {DamageContext} context
     * @returns {RicochetStepResult}
     */
    run(context) {
        const attack = context.results.attackSpeed;
        const averageDamage = context.results.augmentFinal?.damage
            ?? context.results.criticalDamage?.damage
            ?? 0;

        return getRicochetEffects(
            context,
            attack?.attacksPerSecond ?? 0,
            averageDamage
        );
    },

    /**
     * @param {RicochetStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return (result?.ricochetPercent ?? 0) > 0;
    },

    /**
     * @param {RicochetStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        return result?.enabled && result.dps > 0
            ? [{ label: 'Ricochet', dps: result.dps }]
            : [];
    },

    /**
     * @param {RicochetStepResult} result
     * @returns {import('../../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.ricochetPercent <= 0) return [];

        if (!result.enabled) {
            return [{
                label: 'Ricochet',
                value: result.reason ?? 'Not active'
            }];
        }

        /** @type {import('../../../../data/types.js').DamageResult[]} */
        const rows = [
            { label: 'Ricochet Chance', value: result.ricochetPercent, unit: '%' },
            { label: 'Ricochet Procs / s', value: result.procsPerSecond, unit: '/s' },
            { label: 'Ricochet Damage per Proc', value: result.damagePerProc },
            { label: 'Ricochet DPS', value: result.dps }
        ];

        if (result.abilityDamagePercent !== 0) {
            rows.push({
                label: 'Ability Damage%',
                value: result.abilityDamagePercent,
                unit: '%'
            });
        }

        return rows;
    }
};
