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
        const averageDamage = context.results.augmentFinal?.damage
            ?? context.results.criticalDamage?.damage
            ?? 0;
        const attack = context.results.attackSpeed;
        const burst = context.results.burst;
        const baseDps = burst?.enabled ? burst.totalDps : (attack?.dps ?? 0);
        const baseEnergyPerSecond = burst?.enabled
            ? burst.energyPerSecond
            : (attack?.energyPerSecond ?? 0);
        const maxEnergy = attack?.maxEnergy ?? 0;

        const manager = context.specialAbilityManager;
        /** @type {{reverseMultiplier: number, energyRegen: number, abilities: Array<any>}} */
        const effects = manager
            ? manager.getOnClickEffects(context, averageDamage)
            : { reverseMultiplier: 0, energyRegen: 0, abilities: [] };

        /**
         * @param {any} ability
         * @returns {any}
         */
        function mapAbility(ability) {
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
        }
        const abilities = effects.abilities.map(mapAbility);

        /** @param {any} ability */
        const hasEffect = ability => ability.damagePercent > 0
            || ability.extraHitsPerSecond > 0
            || ability.damageTakenIncreasePercent > 0;
        const enabled = effects.reverseMultiplier > 0
            && abilities.some(ability => ability.enabled && hasEffect(ability));
        const visible = effects.reverseMultiplier > 0
            && abilities.some(ability => hasEffect(ability));

        return {
            visible,
            enabled,
            averageDamage,
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
        return result?.visible === true;
    },

    /**
     * @param {SpecialAttackStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        if (!result?.enabled) return [];

        return result.abilities
            .filter(ability => ability.enabled && ability.dps > 0)
            .map(ability => ({ label: ability.ability, dps: ability.dps }));
    },

    /**
     * @param {SpecialAttackStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.visible) return [];
        if (!result.enabled) return [{ label: 'Special Attacks', value: 'Off' }];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [];

        result.abilities.forEach(ability => {
            if (!ability.enabled) return;

            const hasEffect = ability.damagePercent > 0
                || ability.extraHitsPerSecond > 0
                || ability.damageTakenIncreasePercent > 0;
            if (!hasEffect) return;

            if (ability.damagePercent > 0) {
                rows.push({ label: `${ability.ability} / Hit`, value: ability.damagePerHit });
                rows.push({ label: `${ability.ability} Damage`, value: ability.damagePerUse });
            }

            if (ability.dps > 0) {
                rows.push({ label: `${ability.ability} DPS`, value: ability.dps });
            }

            if (ability.extraHitsPerSecond > 0 || ability.hitsPerUse > 1) {
                rows.push({
                    label: `${ability.ability} Hits / s`,
                    value: ability.hitsPerSecond,
                    unit: '/s'
                });
            }

            if (ability.damageTakenIncreasePercent > 0) {
                rows.push({
                    label: 'Damage%',
                    value: ability.damageTakenIncreasePercent,
                    unit: '%'
                });
            }

            if (Number.isFinite(ability.energy) && (ability.energy ?? 0) > 0) {
                rows.push({
                    label: 'Energy per Second',
                    value: ability.energyOnlySpecial,
                    unit: '/s'
                });
            }
        });

        return rows;
    }
};
