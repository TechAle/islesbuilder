import { beforeEach, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeBuild, makeSettings, MAGE_CORE } from '../../helpers/build.js';

function makeArcherBuild(treeLevels = {}) {
    const build = makeBuild({ currentClass: 'archer' });
    build.treeLevels.archer = new Map(
        Object.entries(treeLevels).filter(([, level]) => level > 0)
    );
    build.activeEquip.weapon = {
        ...build.activeEquip.weapon,
        name: 'Test Bow',
        stats: {
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'ranged',
            'Arcane Damage': 100
        }
    };
    return build;
}

function run({ treeLevels = {}, stats = {}, settings = {} } = {}) {
    const manager = new DpsManager();
    const build = makeArcherBuild(treeLevels);
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            ...stats
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });

    return { manager, steps };
}

describe('Sharpshooter', () => {
    beforeEach(() => {
        new SpecialAbilityManager().reset();
    });

    it('estimates max stacks, capacity and Hot Streak from hits/s', () => {
        const { steps } = run({
            treeLevels: { L1: 5, L1a: 5, L1b: 5 },
            settings: { slowAttack: true, attackInterval: 0.6 }
        });

        // 25 stack × 1.5% = 37.5% danno.
        expect(steps.sharpshooter.maxStacks).toBe(25);
        expect(steps.sharpshooter.stacks).toBe(25);
        expect(steps.sharpshooter.damagePercent).toBeCloseTo(37.5, 10);
        expect(steps.sharpshooter.damage).toBeCloseTo(137.5, 10);
        expect(steps.criticalDamage.baseDamage).toBeCloseTo(137.5, 10);

        // Hot Streak: 1.5% × 5 = 7.5 Crit Chance, 4% × 5 = 20 Crit Damage.
        expect(steps.sharpshooter.hotStreakActive).toBe(true);
        expect(steps.criticalDamage.critChance).toBeCloseTo(7.5, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(70, 10);
    });

    it('does not gain stacks when hits are slower than the node window', () => {
        const { steps } = run({ treeLevels: { L1: 1 } });

        // 1.667 hit/s < 2.5 hit/s richiesti dalla finestra di 0.4s.
        expect(steps.sharpshooter.windowSeconds).toBeCloseTo(0.4, 10);
        expect(steps.sharpshooter.canGainStacks).toBe(false);
        expect(steps.sharpshooter.stacks).toBe(0);
        expect(steps.sharpshooter.damagePercent).toBe(0);
        expect(steps.sharpshooter.reason).toBe('Hits too slow to gain stacks');
    });

    it('gains stacks when the window is high enough', () => {
        const { steps } = run({ treeLevels: { L1: 2 } });

        // Finestra 0.8s → servono 1.25 hit/s; 1.667 è sufficiente.
        expect(steps.sharpshooter.windowSeconds).toBeCloseTo(0.8, 10);
        expect(steps.sharpshooter.canGainStacks).toBe(true);
        expect(steps.sharpshooter.stacks).toBe(10);
        expect(steps.sharpshooter.damagePercent).toBeCloseTo(6, 10);
        expect(steps.sharpshooter.damage).toBeCloseTo(106, 10);
    });

    it('includes Ricochet hits in the stack estimate', () => {
        const withoutRicochet = run({ treeLevels: { L1: 1 } }).steps;
        const withRicochet = run({
            treeLevels: { L1: 1, UL1: 5 },
            settings: { slowAttack: true, attackInterval: 0.2 }
        }).steps;

        expect(withoutRicochet.sharpshooter.totalHitsPerSecond).toBeCloseTo(1 / 0.6, 10);
        expect(withRicochet.sharpshooter.ricochetHitsPerSecond).toBeCloseTo(0.5, 10);
        expect(withRicochet.sharpshooter.totalHitsPerSecond).toBeCloseTo(5.5, 10);
        expect(withRicochet.sharpshooter.canGainStacks).toBe(true);
        expect(withRicochet.sharpshooter.stacks).toBe(10);
    });

    it('counts special attack hits in the stack estimate', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Bow', [
            {
                kind: 'ability',
                name: 'Dummy A',
                energy: 0,
                text: 'Deal 100% damage',
                key: 'Right click'
            },
            {
                kind: 'ability',
                name: 'Dummy B',
                energy: 0,
                text: 'Deal 100% damage',
                key: 'Right click'
            }
        ]);

        const build = makeArcherBuild({ L1: 1 });
        build.activeEquip.weapon.stats['Ability 1'] = 'Dummy A';
        build.activeEquip.weapon.stats['Ability 2'] = 'Dummy B';
        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        // 1.667 hit/s base + 2 abilità × 0.625 cast/s = 2.917 hit/s.
        expect(steps.sharpshooter.totalHitsPerSecond).toBeCloseTo(35 / 12, 10);
        expect(steps.sharpshooter.canGainStacks).toBe(true);
        expect(steps.sharpshooter.stacks).toBe(10);
    });

    it('counts mage abilities and burst hits in the stack estimate', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Tempest', [{
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }]);

        const build = makeBuild({
            currentClass: 'mage',
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
            treeLevels: { L1: 2 }
        });
        build.treeLevels.archer = new Map([['L1', 2]]);

        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ useBurst: true })
        });

        // base 1.667 + Whirlwind 0.625 + burst 0.444 = 2.736 hit/s.
        expect(steps.sharpshooter.totalHitsPerSecond).toBeCloseTo(
            1 / 0.6 + 1 / 1.6 + (10 / 0.75) / 30,
            10
        );
        expect(steps.sharpshooter.canGainStacks).toBe(true);
        expect(steps.sharpshooter.stacks).toBe(10);
    });

    it('counts mage crystal explosions and support orb hits', () => {
        const build = makeBuild({
            currentClass: 'mage',
            weapon: {
                name: 'Test Staff',
                stats: {
                    'Damage Type': 'Arcane',
                    'Default Attack': 100,
                    'Weapon Type': 'magic',
                    'Arcane Damage': 100
                }
            },
            treeLevels: { R1: 5, R1a: 5, R1b: 5, R2: 5, R2a: 3 }
        });
        build.treeLevels.archer = new Map([['L1', 2]]);

        const steps = new DpsManager().recalculate({
            statsValues: {
                'Arcane Damage': { flat: 100, percent: 0 },
                'Crit Chance': { flat: 0, percent: 100 }
            },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        expect(steps.sharpshooter.totalHitsPerSecond)
            .toBeGreaterThan(steps.attackSpeed.attacksPerSecond + 2);
        expect(steps.sharpshooter.canGainStacks).toBe(true);
        expect(steps.sharpshooter.stacks).toBe(10);
    });

    it('Capacity increases the maximum number of stacks', () => {
        const base = run({ treeLevels: { L1: 5 } }).steps;
        const capacity = run({ treeLevels: { L1: 5, L1a: 5 } }).steps;

        expect(base.sharpshooter.maxStacks).toBe(10);
        expect(base.sharpshooter.damagePercent).toBeCloseTo(15, 10);
        expect(capacity.sharpshooter.maxStacks).toBe(25);
        expect(capacity.sharpshooter.damagePercent).toBeCloseTo(37.5, 10);
    });

    it('Hot Streak requires at least 10 stacks and the node', () => {
        const withoutNode = run({ treeLevels: { L1: 5 } }).steps;
        const withNode = run({ treeLevels: { L1: 5, L1b: 5 } }).steps;

        expect(withoutNode.sharpshooter.hotStreakActive).toBe(false);
        expect(withNode.sharpshooter.hotStreakActive).toBe(true);
        expect(withNode.criticalDamage.sharpshooterCritChancePercent).toBeCloseTo(7.5, 10);
        expect(withNode.criticalDamage.sharpshooterCritDamagePercent).toBeCloseTo(20, 10);
    });

    it('does not apply Hot Streak without reaching 10 stacks', () => {
        const { steps } = run({ treeLevels: { L1: 1, L1b: 5 } });

        expect(steps.sharpshooter.canGainStacks).toBe(false);
        expect(steps.sharpshooter.stacks).toBe(0);
        expect(steps.sharpshooter.hotStreakActive).toBe(false);
        expect(steps.criticalDamage.critChance).toBe(0);
    });

    it('has no stacks on the first hit', () => {
        const { steps } = run({
            treeLevels: { L1: 5, L1a: 5, L1b: 5 },
            settings: { firstHit: true }
        });

        expect(steps.sharpshooter.stacks).toBe(0);
        expect(steps.sharpshooter.damagePercent).toBe(0);
        expect(steps.sharpshooter.hotStreakActive).toBe(false);
        expect(steps.criticalDamage.baseDamage).toBeCloseTo(100, 10);
        expect(steps.criticalDamage.critChance).toBe(0);
    });

    it('is hidden when none of its nodes are leveled', () => {
        const { manager, steps } = run({ treeLevels: {} });

        expect(steps.sharpshooter.visible).toBe(false);
        expect(manager.getStepGroups().some(group => group.id === 'sharpshooter')).toBe(false);
    });
});
