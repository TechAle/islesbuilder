import { getAugmentEffects } from '../../augmentManager.js';
import { getCritTotalHitsPerSecond } from '../critStats.js';
import { getDefaultAttackReverseMultiplier } from '../weaponProps.js';
import { getCritChancePercent } from '../critStats.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').AugmentDamageStepResult} AugmentDamageStepResult */

/**
 * Step 10 — Danno extra degli augment.
 *
 * Combo, Chain Lightning e Deathburst non aumentano il danno base: producono
 * colpi/danni aggiuntivi e vengono mostrati come fonti DPS separate.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const augmentDamageStep = {
    id: 'augmentDamage',
    label: 'Augments',

    /**
     * @param {DamageContext} context
     * @returns {AugmentDamageStepResult}
     */
    run(context) {
        const averageDamage = context.results.augmentFinal?.damage ?? context.results.criticalDamage?.damage ?? 0;
        const reverseMultiplier = getDefaultAttackReverseMultiplier(
            context.weapon ?? context.build?.activeEquip?.weapon
        );
        const augmentBaseDamage = averageDamage * reverseMultiplier;
        const effects = getAugmentEffects(context);
        const totalHitsPerSecond = getCritTotalHitsPerSecond(context);
        // Chain Lightning procca sui CRIT: usa la funzione condivisa che somma
        // base + Hot Streak + Deadeye, senza controlli opzionali sparsi.
        const critChance = Math.min(
            1,
            Math.max(0, getCritChancePercent(context) / 100)
        );
        const critsPerSecond = totalHitsPerSecond * critChance;

        const comboDps = effects.combo.reduce((sum, combo) => (
            sum
            + totalHitsPerSecond
            * (combo.chance / 100)
            * (combo.damagePercent / 100)
            * augmentBaseDamage
        ), 0);

        const chainLightningDps = effects.chainLightning.reduce((sum, chain) => {
            const procRate = Math.min(
                1 / Math.max(0.01, chain.cooldown),
                critsPerSecond * (chain.chance / 100)
            );
            return sum
                + procRate
                * chain.enemies
                * (chain.damagePercent / 100)
                * augmentBaseDamage;
        }, 0);

        const killsSetting = Number(context.settings?.deathburstKillsPerSecond);
        const killsPerSecond = Number.isFinite(killsSetting) ? killsSetting : 0.2;
        const deathburstDps = effects.deathburst.reduce((sum, burst) => {
            const procRate = Math.min(
                Math.max(0, killsPerSecond),
                1 / Math.max(0.01, burst.cooldown)
            );
            return sum + procRate * (burst.damagePercent / 100) * augmentBaseDamage;
        }, 0);

        const totalDps = comboDps + chainLightningDps + deathburstDps;
        const enabled = totalDps > 0 && averageDamage > 0;

        return {
            enabled,
            hasAny: effects.hasEffects,
            hasHpAugments: effects.hasEnraged || effects.hasHunter,
            hasEnemyHpAugments: effects.hasExecution || effects.hasProsecution,
            hasExecution: effects.hasExecution,
            hasProsecution: effects.hasProsecution,
            hasHunter: effects.hasHunter,
            hasEnraged: effects.hasEnraged,
            hasInfected: effects.hasInfected,
            hasFirstStrike: effects.hasFirstStrike,
            firstStrikePercent: effects.firstStrikePercent,
            averageDamage,
            reverseMultiplier,
            augmentBaseDamage,
            totalHitsPerSecond,
            critsPerSecond,
            killsPerSecond,
            comboDps: enabled ? comboDps : 0,
            chainLightningDps: enabled ? chainLightningDps : 0,
            deathburstDps: enabled ? deathburstDps : 0,
            totalDps: enabled ? totalDps : 0,
            hasCombo: effects.combo.length > 0,
            hasChainLightning: effects.chainLightning.length > 0,
            hasDeathburst: effects.deathburst.length > 0
        };
    },

    /**
     * @param {AugmentDamageStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.hasAny === true;
    },

    /**
     * @param {AugmentDamageStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        if (!result?.enabled) return [];

        /** @type {Array<{label: string, dps: number}>} */
        const parts = [];
        if (result.comboDps > 0) parts.push({ label: 'Combo', dps: result.comboDps });
        if (result.chainLightningDps > 0) parts.push({ label: 'Chain Lightning', dps: result.chainLightningDps });
        if (result.deathburstDps > 0) parts.push({ label: 'Deathburst', dps: result.deathburstDps });
        return parts;
    },

    /**
     * @param {AugmentDamageStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.hasAny) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [];

        if (!result.enabled) {
            if (result.hasCombo || result.hasChainLightning || result.hasDeathburst) {
                rows.push({ label: 'Augment DPS', value: 0 });
            }
        } else {
            if (result.comboDps > 0) {
                rows.push({ label: 'Combo DPS', value: result.comboDps });
            }
            if (result.chainLightningDps > 0) {
                rows.push({ label: 'Chain Lightning DPS', value: result.chainLightningDps });
            }
            if (result.deathburstDps > 0) {
                rows.push({ label: 'Deathburst DPS', value: result.deathburstDps });
            }
            rows.push({ label: 'Augment DPS', value: result.totalDps });
        }

        if (result.firstStrikePercent > 0) {
            rows.push({
                label: 'First Strike',
                value: result.firstStrikePercent,
                unit: '%',
                help: 'Applies only to the first hit, not to sustained DPS.'
            });
        }

        return rows;
    }
};
