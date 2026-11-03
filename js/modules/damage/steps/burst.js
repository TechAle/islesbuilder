import {
    BURST_ACTIVE_SECONDS,
    BURST_DAMAGE_PERCENT,
    BURST_ENERGY_COST,
    BURST_INTERVAL
} from '../../../data/constants.js';
import { computeEnergyState, getSustainLabel } from '../energy.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').BurstStepResult} BurstStepResult */

/**
 * Verifica se il core equipaggiato è un Mage Core.
 * @param {DamageContext} context
 * @returns {boolean}
 */
function hasMageCore(context) {
    const core = context.build?.activeEquip?.core;
    return typeof core?.name === 'string' && core.name.toLowerCase().includes('mage');
}

/**
 * Step 5 — Burst DPS.
 *
 * Con il Mage Core equipaggiato, ogni secondo per 10 secondi infligge il 75%
 * del "Critical Damage → Average Damage". Poi ci sono 20 secondi di
 * cooldown, quindi su 30 secondi l'effetto è attivo solo per 10.
 *
 * - Burst DPS = averageDamage × 75% × 10 / 30
 * - Costo energetico = 50 / 30 al secondo
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const burstStep = {
    id: 'burst',
    label: 'Burst DPS',

    /**
     * @param {DamageContext} context
     * @returns {BurstStepResult}
     */
    run(context) {
        const attack = context.results.attackSpeed;
        const attackDps = attack?.dps ?? 0;
        const visible = !!context.settings?.useBurst;
        const available = hasMageCore(context);

        /** @type {BurstStepResult} */
        const inactive = {
            visible,
            available,
            enabled: false,
            burstDps: 0,
            burstDamagePerSecond: 0,
            burstEnergyPerSecond: 0,
            attackDps,
            totalDps: attackDps,
            energyPerSecond: attack?.energyPerSecond ?? 0,
            maxEnergy: attack?.maxEnergy ?? 0,
            secondsToEmpty: attack?.secondsToEmpty ?? Infinity,
            sustain: attack?.sustain ?? true,
            potionInterval: attack?.potionInterval ?? Infinity,
            potionSustainable: attack?.potionSustainable ?? true
        };

        if (!visible || !available || !attack || attack.damage <= 0) {
            return inactive;
        }

        const damage = context.results.criticalDamage?.damage ?? 0;
        const burstDamagePerSecond = damage * (BURST_DAMAGE_PERCENT / 100);
        const burstDps = burstDamagePerSecond * BURST_ACTIVE_SECONDS / BURST_INTERVAL;
        const burstEnergyPerSecond = BURST_ENERGY_COST / BURST_INTERVAL;

        const totalDps = attackDps + burstDps;
        const energyPerSecond = attack.energyPerSecond - burstEnergyPerSecond;
        const energyState = computeEnergyState(energyPerSecond, attack.maxEnergy);

        return {
            visible: true,
            available: true,
            enabled: true,
            burstDps,
            burstDamagePerSecond,
            burstEnergyPerSecond,
            attackDps,
            totalDps,
            energyPerSecond,
            maxEnergy: attack.maxEnergy,
            ...energyState
        };
    },

    /**
     * @param {BurstStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.visible === true;
    },

    /**
     * @param {BurstStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.visible) return [];

        if (!result.available) {
            return [{ label: 'Burst', value: 'Requires Mage Core' }];
        }

        const seconds = Number.isFinite(result.secondsToEmpty)
            ? { value: result.secondsToEmpty, unit: 's' }
            : { value: '∞' };

        return [
            { label: 'Burst Damage / s', value: result.burstDamagePerSecond },
            { label: 'Burst DPS', value: result.burstDps },
            { label: 'Attack DPS', value: result.attackDps },
            { label: 'Total DPS', value: result.totalDps },
            { label: 'Burst Energy Cost', value: result.burstEnergyPerSecond, unit: '/s' },
            { label: 'Energy per Second', value: result.energyPerSecond, unit: '/s' },
            { label: 'Time to 0 Energy', ...seconds },
            { label: 'Sustain', value: getSustainLabel(result) }
        ];
    }
};
