import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { makeBuild, makeSettings, MAGE_CORE } from '../../helpers/build.js';

function runWithBlueOrb() {
    const special = new SpecialAbilityManager();
    special.reset();
    special.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.'
        }
    ]);

    const build = makeBuild({
        weapon: {
            name: 'Tempest',
            stats: {
                'Damage Type': 'Arcane',
                'Default Attack': 85,
                'Weapon Type': 'magic',
                'Arcane Damage': 100
            }
        },
        core: MAGE_CORE,
        treeLevels: {
            C: 1,
            R: 1,
            R1: 1,
            R1a: 3,
            R1b: 3,
            R2: 5,
            R2a: 3
        }
    });

    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 },
            'Crit Damage': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({
            useBurst: true,
            griefUptime: 0,
            lastSorrowUptime: 0,
            focusStacks: 0,
            potentialChargeKills: 0,
            deathburstKillsPerSecond: 0
        })
    });

    return { manager, steps };
}

describe('blue orb damage propagation', () => {
    it('applies the blue orb multiplier once in Damage Modifiers', () => {
        const { steps } = runWithBlueOrb();
        const modifiers = steps.damageModifiers;

        expect(modifiers.blueDamageMultiplier).toBeGreaterThan(1);
        expect(modifiers.blueDamagePercent).toBeGreaterThan(0);

        const preBlue = modifiers.baseDamage
            * (1 + modifiers.percent / 100)
            * (1 + modifiers.effectiveElementalPercent / 100)
            + modifiers.masteryBonus;

        expect(modifiers.damage).toBeCloseTo(preBlue * modifiers.blueDamageMultiplier, 10);
    });

    it('propagates through attack, Smite, Whirlwind, burst, crystals and orbs', () => {
        const { steps } = runWithBlueOrb();
        const averageDamage = steps.augmentFinal.damage;
        const reverse = steps.specialAttacks.reverseMultiplier;

        expect(steps.criticalDamage.damage).toBeCloseTo(averageDamage, 10);

        const attackDps = steps.attackSpeed.dps - steps.attackSpeed.passiveDps;
        expect(attackDps).toBeCloseTo(averageDamage / steps.attackSpeed.attackInterval, 10);

        const smite = steps.attackSpeed.passiveBreakdown[0];
        expect(smite.dps).toBeCloseTo(
            smite.hitsPerSecond * averageDamage * reverse * (smite.damagePercent / 100),
            10
        );

        const whirlwind = steps.specialAttacks.abilities.find(ability => ability.ability === 'Whirlwind');
        expect(whirlwind.damagePerHit).toBeCloseTo(averageDamage * reverse * 1.35, 10);
        expect(whirlwind.dps).toBeCloseTo(whirlwind.damagePerUse * whirlwind.castsPerSecond, 10);

        expect(steps.burst.burstDamagePerHit).toBeCloseTo(averageDamage * reverse * 0.75, 10);

        expect(steps.crystalCombustion.averageDamage).toBeCloseTo(averageDamage, 10);
        expect(steps.crystalCombustion.combustionDps).toBeCloseTo(
            averageDamage
            * (steps.crystalCombustion.combustionPercent / 100)
            * steps.crystalCombustion.explosionsPerSecond,
            10
        );

        expect(steps.supportOrbs.averageDamage).toBeCloseTo(averageDamage, 10);
        expect(steps.supportOrbs.orbDps).toBeCloseTo(
            averageDamage
            * (steps.supportOrbs.damagePercent / 100)
            * steps.supportOrbs.orbHitsPerSecond,
            10
        );
    });
});
