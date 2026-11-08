import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { DAMAGE_STEPS } from '../../../js/modules/damage/damagePipeline.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function goldenBuild(augments = ['Arcane Damage 6', 'Arcane Damage 6']) {
    const special = new SpecialAbilityManager();
    special.reset();
    const build = makeBuild({
        weapon: makeArcaneWeapon(),
        augments
    });
    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Magic Damage': { flat: 0, percent: 50 },
            'Crit Chance': { flat: 0, percent: 100 },
            'Crit Damage': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        settings: makeSettings()
    });
    return { manager, steps };
}

describe('damage pipeline order', () => {
    it('runs the steps in the expected order', () => {
        expect(DAMAGE_STEPS.map(step => step.id)).toEqual([
            'baseDamage',
            'damageModifiers',
            'damageMultiplier',
            'criticalDamage',
            'augmentFinal',
            'attackSpeed',
            'burst',
            'specialAttacks',
            'augmentDamage',
            'crystalCombustion',
            'supportOrbs'
        ]);
    });

    it('computes a full golden build step by step', () => {
        const { manager, steps } = goldenBuild();

        expect(steps.baseDamage.baseDamage).toBe(100);
        expect(steps.damageModifiers.percent).toBe(0);
        expect(steps.damageModifiers.masteryPercent).toBe(50);
        expect(steps.damageModifiers.damage).toBe(150);
        expect(steps.damageMultiplier.damage).toBe(150);
        expect(steps.criticalDamage.critChance).toBe(100);
        expect(steps.criticalDamage.averageDamage).toBe(225);
        expect(steps.augmentFinal.damage).toBe(292.5);
        expect(steps.attackSpeed.dps).toBe(487.5);
        expect(manager.getDps()).toBeCloseTo(487.5, 10);
    });

    it('does not change earlier steps when augment damage is added', () => {
        const withoutAugments = goldenBuild([]);
        const withAugments = goldenBuild(['Arcane Damage 6', 'Arcane Damage 6']);

        expect(withAugments.steps.damageModifiers.damage).toBe(withoutAugments.steps.damageModifiers.damage);
        expect(withAugments.steps.damageMultiplier.damage).toBe(withoutAugments.steps.damageMultiplier.damage);
        expect(withAugments.steps.criticalDamage.damage).toBe(withoutAugments.steps.criticalDamage.damage);
        expect(withAugments.steps.augmentFinal.damage).toBeGreaterThan(withoutAugments.steps.augmentFinal.damage);
    });

    it('applies the augment multiplier after crit', () => {
        const { steps } = goldenBuild();

        expect(steps.criticalDamage.damage).toBe(225);
        expect(steps.augmentFinal.damage).toBe(292.5);
        expect(steps.augmentFinal.damageBefore).toBe(225);
        expect(steps.augmentFinal.multiplier).toBeCloseTo(1.3, 10);
    });
});

describe('damage pipeline edge cases', () => {
    it('handles a weapon without damage type', () => {
        const build = makeBuild({
            weapon: {
                name: 'No Type',
                stats: { 'Default Attack': 100, 'Weapon Type': 'magic', 'Arcane Damage': 100 }
            }
        });
        const manager = new DpsManager();
        const steps = manager.recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            settings: makeSettings()
        });

        expect(steps.baseDamage.baseDamage).toBe(0);
        expect(steps.baseDamage.missing).toBe('Damage Type');
        expect(steps.attackSpeed.dps).toBe(0);
        expect(manager.getDps()).toBeNull();
    });

    it('reads the damage stat case-insensitively', () => {
        const build = makeBuild({ weapon: makeArcaneWeapon() });
        const steps = new DpsManager().recalculate({
            statsValues: { 'arcane damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            settings: makeSettings()
        });

        expect(steps.baseDamage.statName).toBe('Arcane Damage');
        expect(steps.baseDamage.damageStat).toBe(100);
        expect(steps.baseDamage.baseDamage).toBe(100);
    });

    it('handles a weapon without default attack', () => {
        const build = makeBuild({
            weapon: {
                name: 'No Default',
                stats: { 'Damage Type': 'Arcane', 'Weapon Type': 'magic', 'Arcane Damage': 100 }
            }
        });
        const steps = new DpsManager().recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            settings: makeSettings()
        });

        expect(steps.baseDamage.baseDamage).toBe(0);
        expect(steps.baseDamage.missing).toBe('Default Attack');
    });

    it('keeps crit chance overflow without breaking average damage', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        const build = makeBuild({ weapon: makeArcaneWeapon() });
        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: {
                'Arcane Damage': { flat: 100, percent: 0 },
                'Crit Chance': { flat: 0, percent: 150 },
                'Crit Damage': { flat: 0, percent: 0 }
            },
            skillValues: {},
            build,
            settings: makeSettings()
        });

        expect(steps.criticalDamage.critChance).toBe(150);
        expect(steps.criticalDamage.effectiveCritChance).toBe(100);
        expect(steps.criticalDamage.critChanceOverflow).toBe(50);
        expect(steps.criticalDamage.criticalHit).toBe(150);
        expect(steps.criticalDamage.averageDamage).toBe(150);
    });

    it('clamps negative crit chance to zero', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        const build = makeBuild({ weapon: makeArcaneWeapon() });
        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: {
                'Arcane Damage': { flat: 100, percent: 0 },
                'Crit Chance': { flat: 0, percent: -30 }
            },
            skillValues: {},
            build,
            settings: makeSettings()
        });

        expect(steps.criticalDamage.critChance).toBe(0);
        expect(steps.criticalDamage.damage).toBe(100);
    });

    it('returns no DPS parts for an empty build', () => {
        const manager = new DpsManager();
        manager.recalculate({
            statsValues: {},
            skillValues: {},
            build: makeBuild(),
            settings: makeSettings()
        });

        expect(manager.getDpsParts()).toEqual([]);
        expect(manager.getDps()).toBeNull();
    });
});
