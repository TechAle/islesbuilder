import { getElementalKnowledge, getGriefInflictionPercent, getLastSorrowPercent, getFocusStacks } from '../../classes/mage.js';
import { applyAdditiveMultipliers } from '../applyMultipliers.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').DamageMultiplierStepResult} DamageMultiplierStepResult */

/**
 * Limita un valore tra min e max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Step 3 — Damage Multiplier.
 *
 * Tutti gli aumenti percentuali vengono sommati sulla stessa base, non
 * moltiplicati tra loro:
 *
 * - Elemental Knowledge: 9% per ogni 1% del nodo.
 * - Grief Infliction: val% del nodo, scalato dal Grief uptime.
 * - Last Sorrow: val% del nodo, scalato dal Last Sorrow uptime.
 * - Focus Stacks: stacks medi × val% per stack (max 3 + Focus Capacity).
 *
 * Esempio: 9% + 15% → +24%, non 1.09 × 1.15.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const damageMultiplierStep = {
    id: 'damageMultiplier',
    label: 'Damage Multiplier',

    /**
     * @param {DamageContext} context
     * @returns {DamageMultiplierStepResult}
     */
    run(context) {
        const previous = context.results.damageModifiers?.damage ?? 0;

        const knowledge = getElementalKnowledge(context);
        const elementalKnowledge = knowledge.elementalKnowledgePercent;

        const griefInflictionPercent = getGriefInflictionPercent(context);
        const griefUptime = clamp(context.settings?.griefUptime ?? 100, 1, 100);
        const griefDamagePercent = griefInflictionPercent * (griefUptime / 100);

        const lastSorrowPercent = getLastSorrowPercent(context);
        const lastSorrowUptime = clamp(context.settings?.lastSorrowUptime ?? 100, 1, 100);
        const lastSorrowDamagePercent = lastSorrowPercent * (lastSorrowUptime / 100);

        const focus = getFocusStacks(context);
        const focusStacks = clamp(context.settings?.focusStacks ?? 0, 0, focus.maxStacks);
        const focusDamagePercent = focusStacks * focus.focusStacksPercent;

        const applied = applyAdditiveMultipliers(previous, [
            knowledge.damageMultiplierPercent,
            griefDamagePercent,
            lastSorrowDamagePercent,
            focusDamagePercent
        ]);

        return {
            baseDamage: previous,
            elementalKnowledge,
            elementalKnowledgeDamagePercent: knowledge.damageMultiplierPercent,
            griefInflictionPercent,
            griefUptime,
            griefDamagePercent,
            lastSorrowPercent,
            lastSorrowUptime,
            lastSorrowDamagePercent,
            focusStacksPercent: focus.focusStacksPercent,
            focusCapacity: focus.focusCapacity,
            focusMaxStacks: focus.maxStacks,
            focusStacks,
            focusDamagePercent,
            multiplierPercent: applied.totalPercent,
            multiplier: applied.multiplier,
            damage: applied.damage
        };
    },

    /**
     * @param {DamageMultiplierStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return (result?.elementalKnowledge ?? 0) > 0
            || (result?.griefInflictionPercent ?? 0) > 0
            || (result?.lastSorrowPercent ?? 0) > 0
            || (result?.focusStacksPercent ?? 0) > 0;
    },

    /**
     * @param {DamageMultiplierStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [];

        if (result.elementalKnowledge > 0) {
            rows.push({ label: 'Elemental Knowledge', value: result.elementalKnowledge, unit: '%' });
        }

        if (result.griefInflictionPercent > 0) {
            rows.push({ label: 'Grief Infliction', value: result.griefInflictionPercent, unit: '%' });
            rows.push({ label: 'Grief Uptime', value: result.griefUptime, unit: '%' });
        }

        if (result.lastSorrowPercent > 0) {
            rows.push({ label: 'Last Sorrow', value: result.lastSorrowPercent, unit: '%' });
            rows.push({ label: 'Last Sorrow Uptime', value: result.lastSorrowUptime, unit: '%' });
        }

        if (result.focusStacksPercent > 0) {
            rows.push({ label: 'Focus Stacks', value: result.focusStacks });
            rows.push({ label: 'Focus Damage', value: result.focusDamagePercent, unit: '%' });
        }

        rows.push({ label: 'Damage Multiplier', value: result.multiplierPercent, unit: '%' });
        rows.push({ label: 'Damage', value: result.damage });
        return rows;
    }
};
