import { computeEnergyState, getSustainLabel } from '../energy.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').SpecialAttackStepResult} SpecialAttackStepResult */

/**
 * Step 7 — Special Attacks.
 *
 * Le abilità onClick usano l'Average Damage senza il Default Attack
 * dell'arma. Il danno di ogni uso è:
 *
 * `Average Damage × (100 / DefaultAttack) × damage% × times`
 *
 * Ogni abilità consuma `energy` e ha un cooldown (default 1.6s). Il cast rate
 * è limitato sia dal cooldown sia dall'energia rigenerata.
 *
 * Lo step gira dopo Attack Speed & Energy per poter confrontare:
 * - energia con la sola abilità;
 * - energia con abilità + attacco normale.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const specialAttacksStep = {
    id: 'specialAttacks',
    label: 'Special Attacks',

    /**
     * @param {DamageContext} context
     * @returns {SpecialAttackStepResult}
     */
    run(context) {
        const baseDamage = context.results.criticalDamage?.baseDamage ?? 0;
        const attack = context.results.attackSpeed;
        const burst = context.results.burst;
        const baseDps = burst?.enabled ? burst.totalDps : (attack?.dps ?? 0);
        const baseEnergyPerSecond = burst?.enabled
            ? burst.energyPerSecond
            : (attack?.energyPerSecond ?? 0);
        const maxEnergy = attack?.maxEnergy ?? 0;

        const manager = context.specialAbilityManager;
        const effects = manager
            ? manager.getOnClickEffects(context, baseDamage)
            : { reverseMultiplier: 0, energyRegen: 0, abilities: [] };

        const abilities = effects.abilities.map(ability => {
            const netOnlySpecial = effects.energyRegen - ability.energyPerSecond;
            const energyOnlySpecial = -ability.energyPerSecond;
            const energyWithAttack = baseEnergyPerSecond - ability.energyPerSecond;

            const specialEnergyState = computeEnergyState(netOnlySpecial, maxEnergy);
            const attackEnergyState = computeEnergyState(energyWithAttack, maxEnergy);

            return {
                ...ability,
                totalDps: baseDps + ability.dps,
                energyOnlySpecial,
                sustainOnlySpecial: getSustainLabel(specialEnergyState),
                specialPotionInterval: specialEnergyState.potionInterval,
                energyWithAttack,
                sustainWithAttack: getSustainLabel(attackEnergyState),
                attackPotionInterval: attackEnergyState.potionInterval
            };
        });

        const enabled = effects.reverseMultiplier > 0
            && abilities.some(ability => ability.enabled && ability.damagePercent > 0);

        return {
            enabled,
            baseDamage,
            reverseMultiplier: effects.reverseMultiplier,
            energyRegen: effects.energyRegen,
            baseDps,
            maxEnergy,
            abilities
        };
    },

    /**
     * @param {SpecialAttackStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.enabled === true;
    },

    /**
     * @param {SpecialAttackStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.enabled) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [];

        result.abilities.forEach(ability => {
            if (!ability.enabled || ability.damagePercent <= 0) return;

            rows.push({ label: `${ability.ability} / Hit`, value: ability.damagePerHit });
            rows.push({ label: `${ability.ability} Damage`, value: ability.damagePerUse });
            rows.push({ label: `${ability.ability} DPS`, value: ability.dps });
            rows.push({
                label: `Energy per Second (${ability.ability} only)`,
                value: ability.energyOnlySpecial,
                unit: '/s'
            });
        });

        return rows;
    }
};
