import { getStatFlat } from '../statResolver.js';
import { getWeaponDamageType, getWeaponDefaultAttackPercent } from '../weaponProps.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').BaseDamageStepResult} BaseDamageStepResult */

/**
 * Step 1 — Base Damage.
 *
 * Regola: si prende il valore flat della statistica `{Damage Type} Damage`
 * (es. Arcane Damage) e lo si moltiplica per il Default Attack dell'arma, che
 * è una percentuale (85 => 85%). I contributi percentuali vengono applicati
 * dallo step "Damage Modifiers".
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const baseDamageStep = {
    id: 'baseDamage',
    label: 'Base Damage',

    /**
     * @param {DamageContext} context
     * @returns {BaseDamageStepResult}
     */
    run(context) {
        const damageType = getWeaponDamageType(context.weapon);

        if (!damageType) {
            return {
                damageType: null,
                statName: null,
                damageStat: 0,
                defaultAttackPercent: 0,
                baseDamage: 0,
                missing: 'Damage Type'
            };
        }

        const statName = `${damageType} Damage`;
        const damageStat = getStatFlat(context.statsValues, statName);
        const defaultAttackPercent = getWeaponDefaultAttackPercent(context.weapon);

        if (damageStat <= 0) {
            return {
                damageType,
                statName,
                damageStat,
                defaultAttackPercent,
                baseDamage: 0,
                missing: statName
            };
        }

        if (!defaultAttackPercent) {
            return {
                damageType,
                statName,
                damageStat,
                defaultAttackPercent,
                baseDamage: 0,
                missing: 'Default Attack'
            };
        }

        const baseDamage = damageStat * (defaultAttackPercent / 100);

        return {
            damageType,
            statName,
            damageStat,
            defaultAttackPercent,
            baseDamage
        };
    },

    /**
     * @param {BaseDamageStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        return [
            { label: 'Base Damage', value: result.baseDamage }
        ];
    }
};
