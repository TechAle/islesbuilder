import { getSupportOrbEffects } from '../../classes/mage.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').SupportOrbsStepResult} SupportOrbsStepResult */

/**
 * Step 9 — Support Orbs (RED orb).
 *
 * Le hit hanno una probabilità di spawnare un'orb; le orb attaccano 1 volta
 * al secondo per la loro durata. Ogni hit dell'orb infligge `c%` dell'Average
 * Damage.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const supportOrbsStep = {
    id: 'supportOrbs',
    label: 'Support Orbs',

    /**
     * @param {DamageContext} context
     * @returns {SupportOrbsStepResult}
     */
    run(context) {
        const effects = getSupportOrbEffects(context);
        const averageDamage = context.results.criticalDamage?.damage ?? 0;
        const orbDamage = averageDamage * (effects.damagePercent / 100);
        const orbDps = effects.orbHitsPerSecond * orbDamage;

        const attack = context.results.attackSpeed;
        const burst = context.results.burst;
        const combustion = context.results.crystalCombustion;
        const previousTotalDps = combustion?.enabled
            ? combustion.totalDps
            : (burst?.enabled ? burst.totalDps : (attack?.dps ?? 0));

        const enabled = effects.damagePercent > 0
            && effects.orbHitsPerSecond > 0
            && averageDamage > 0;

        return {
            enabled,
            averageDamage,
            spawnChancePercent: effects.spawnChancePercent,
            durationSeconds: effects.durationSeconds,
            damagePercent: effects.damagePercent,
            activeOrbs: effects.activeOrbs,
            baseCapacity: effects.maxOrbs,
            extraCapacity: effects.extraCapacity,
            normalActiveOrbs: effects.normalActiveOrbs,
            specialActiveOrbs: effects.specialActiveOrbs,
            activeRedOrbs: effects.activeRedOrbs,
            activeBlueOrbs: effects.activeBlueOrbs,
            blueUptime: effects.blueUptime,
            blueDamageMultiplier: effects.blueDamageMultiplier,
            blueDamagePercent: (effects.blueDamageMultiplier - 1) * 100,
            hitsPerSecond: effects.totalHitsPerSecond,
            explosionsPerSecond: effects.explosionsPerSecond,
            orbHitsPerSecond: effects.orbHitsPerSecond,
            orbDamage,
            orbDps: enabled ? orbDps : 0,
            totalDps: previousTotalDps + (enabled ? orbDps : 0)
        };
    },

    /**
     * @param {SupportOrbsStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.enabled === true;
    },

    /**
     * @param {SupportOrbsStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        return result?.enabled && result.orbDps > 0
            ? [{ label: 'Support Orbs', dps: result.orbDps }]
            : [];
    },

    /**
     * @param {SupportOrbsStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.enabled) return [];

        return [
            { label: 'Orb Spawn Chance', value: result.spawnChancePercent, unit: '%' },
            { label: 'Active Orbs', value: result.activeOrbs },
            { label: 'Base Capacity', value: result.baseCapacity },
            { label: 'Extra Capacity', value: result.extraCapacity },
            { label: 'Normal Orbs', value: result.normalActiveOrbs },
            { label: 'Special Orbs', value: result.specialActiveOrbs },
            { label: 'Red Orbs', value: result.activeRedOrbs },
            { label: 'Blue Orbs', value: result.activeBlueOrbs },
            { label: 'Orb Hits / s', value: result.orbHitsPerSecond, unit: '/s' },
            { label: 'Support Orb DPS', value: result.orbDps },
            { label: 'Blue Uptime', value: result.blueUptime * 100, unit: '%' },
            { label: 'Blue Orb Bonus', value: result.blueDamagePercent, unit: '%' }
        ];
    }
};
