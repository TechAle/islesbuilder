import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function makeArcherBuild(treeLevels = {}, augments = []) {
    const build = makeBuild({
        currentClass: 'archer',
        augments,
        weapon: { name: 'Placeholder', stats: {} }
    });
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

function run({
    treeLevels = {},
    mageLevels = {},
    augments = [],
    critChance = 0,
    attackInterval = null,
    firstHit = false
} = {}) {
    const manager = new DpsManager();
    const build = makeArcherBuild(treeLevels, augments);
    build.treeLevels.mage = new Map(
        Object.entries(mageLevels).filter(([, level]) => level > 0)
    );
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: critChance }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({
            slowAttack: attackInterval !== null,
            attackInterval,
            firstHit
        })
    });

    return { manager, steps };
}

describe('Deadeye', () => {
    it('is hidden without Deadeye nodes', () => {
        const { manager, steps } = run();

        expect(steps.criticalDamage.deadeye.visible).toBe(false);
        expect(manager.getStepGroups().some(group => group.id === 'deadeye')).toBe(false);
    });

    it('does not build stacks with zero crit chance', () => {
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 0,
            attackInterval: 0.1
        });

        expect(steps.criticalDamage.deadeye.averageStacks).toBe(0);
        expect(steps.criticalDamage.deadeye.critChanceBonusPercent).toBe(0);
        expect(steps.criticalDamage.deadeye.perfectChainUptime).toBe(0);
        expect(steps.criticalDamage.deadeyeCritChancePercent).toBe(0);
        expect(steps.criticalDamage.deadeyeCritDamagePercent).toBe(0);
    });

    it('requires Deadeye Stacks when only Capacity or Perfect Chain is leveled', () => {
        const { steps } = run({
            treeLevels: { L2a: 5, L2b: 5 },
            critChance: 30
        });

        expect(steps.criticalDamage.deadeye.visible).toBe(true);
        expect(steps.criticalDamage.deadeye.enabled).toBe(false);
        expect(steps.criticalDamage.deadeye.reason).toBe('Requires Deadeye Stacks');
    });

    it('does not grant Perfect Chain Crit Damage without Perfect Chain', () => {
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5 },
            critChance: 30,
            attackInterval: 0.1
        });

        expect(steps.criticalDamage.deadeye.perfectChainLevel).toBe(0);
        expect(steps.criticalDamage.deadeye.perfectChainUptime).toBe(0);
        expect(steps.criticalDamage.deadeye.averagePerfectChainCritDamagePercent).toBe(0);
        expect(steps.criticalDamage.deadeyeCritDamagePercent).toBe(0);
    });

    it('passes its average bonuses to Critical Damage exactly once', () => {
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 30,
            attackInterval: 0.1
        });

        expect(steps.criticalDamage.deadeyeCritChancePercent)
            .toBeCloseTo(steps.criticalDamage.deadeye.critChanceBonusPercent, 10);
        expect(steps.criticalDamage.deadeyeCritDamagePercent)
            .toBeCloseTo(steps.criticalDamage.deadeye.averagePerfectChainCritDamagePercent, 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(
            30 + steps.criticalDamage.deadeye.critChanceBonusPercent,
            10
        );
    });

    it('does not build stacks on the first hit', () => {
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 50,
            firstHit: true
        });

        expect(steps.criticalDamage.deadeye.averageStacks).toBe(0);
        expect(steps.criticalDamage.deadeye.perfectChainUptime).toBe(0);
        expect(steps.criticalDamage.deadeyeCritChancePercent).toBe(0);
        expect(steps.criticalDamage.deadeyeCritDamagePercent).toBe(0);
    });

    it('does not reach max stacks with low crit rate and slow hits', () => {
        const { steps } = run({
            treeLevels: { L2: 1, L2a: 1, L2b: 5 },
            critChance: 10,
            attackInterval: 1
        });

        expect(steps.criticalDamage.deadeye.enabled).toBe(true);
        expect(steps.criticalDamage.deadeye.maxStacks).toBe(4);
        expect(steps.criticalDamage.deadeye.averageStacks).toBeGreaterThan(0);
        expect(steps.criticalDamage.deadeye.averageStacks).toBeLessThan(steps.criticalDamage.deadeye.maxStacks);
        expect(steps.criticalDamage.deadeye.perfectChainUptime).toBeLessThan(0.01);
        expect(steps.criticalDamage.deadeyeCritDamagePercent).toBeLessThan(0.2);
    });

    it('feeds back into Crit Chance and triggers Perfect Chain at high crit rate', () => {
        const baseCrit = 30;
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: baseCrit,
            attackInterval: 0.1
        });

        expect(steps.criticalDamage.deadeye.maxStacks).toBe(8);
        expect(steps.criticalDamage.deadeye.averageStacks).toBeGreaterThan(0);
        expect(steps.criticalDamage.deadeye.critChanceBonusPercent).toBeGreaterThan(0);
        expect(steps.criticalDamage.deadeye.averageCritChancePercent).toBeGreaterThan(baseCrit);
        expect(steps.criticalDamage.critChance).toBeGreaterThan(baseCrit);
        expect(steps.criticalDamage.deadeye.perfectChainUptime).toBeGreaterThan(0);
        expect(steps.criticalDamage.deadeyeCritDamagePercent).toBeGreaterThan(0);
        expect(steps.criticalDamage.critDamagePercent).toBeGreaterThan(50);
    });

    it('increases max stacks with Deadeye Capacity', () => {
        const withoutCapacity = run({
            treeLevels: { L2: 5, L2b: 5 },
            critChance: 30,
            attackInterval: 0.1
        }).steps;
        const withCapacity = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 30,
            attackInterval: 0.1
        }).steps;

        expect(withoutCapacity.criticalDamage.deadeye.maxStacks).toBe(3);
        expect(withCapacity.criticalDamage.deadeye.maxStacks).toBe(8);
        expect(withCapacity.criticalDamage.deadeye.averageStacks)
            .toBeGreaterThan(withoutCapacity.criticalDamage.deadeye.averageStacks);
    });

    it('does not distill temporary Deadeye Crit Damage', () => {
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            mageLevels: { UL2: 5 },
            critChance: 30,
            attackInterval: 0.2
        });

        expect(steps.damageModifiers.naturalDistillationPercent).toBe(25);
        // 25% della sola Crit Damage di statistica: base 50 → 12.5.
        expect(steps.damageModifiers.distilledCritDamagePercent).toBe(12.5);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(
            50 + steps.criticalDamage.deadeyeCritDamagePercent,
            10
        );
        expect(steps.criticalDamage.effectiveCritDamagePercent).toBeCloseTo(
            steps.criticalDamage.critDamagePercent
            - steps.damageModifiers.distilledCritDamagePercent,
            10
        );
    });

    it('keeps crit chance overflow but caps effective crit chance at 100', () => {
        const { steps } = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 95,
            attackInterval: 0.1
        });

        expect(steps.criticalDamage.critChance).toBeGreaterThan(100);
        expect(steps.criticalDamage.effectiveCritChance).toBe(100);
        expect(steps.criticalDamage.critChanceOverflow).toBeGreaterThan(0);
        expect(steps.criticalDamage.damage).toBeCloseTo(
            steps.criticalDamage.baseDamage
            * (1 + steps.criticalDamage.effectiveCritDamagePercent / 100),
            10
        );
    });

    it('feeds the effective Crit Chance into Chain Lightning procs', () => {
        const withoutDeadeye = run({
            augments: ['Chain Lightning 6'],
            critChance: 30,
            attackInterval: 0.2
        }).steps;
        const withDeadeye = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            augments: ['Chain Lightning 6'],
            critChance: 30,
            attackInterval: 0.2
        }).steps;

        expect(withDeadeye.criticalDamage.deadeye.critChanceBonusPercent).toBeGreaterThan(0);
        expect(withDeadeye.augmentDamage.critsPerSecond)
            .toBeGreaterThan(withoutDeadeye.augmentDamage.critsPerSecond);
        expect(withDeadeye.augmentDamage.chainLightningDps)
            .toBeGreaterThan(withoutDeadeye.augmentDamage.chainLightningDps);
    });

    it('is deterministic across repeated calculations', () => {
        const first = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 30,
            attackInterval: 0.2
        }).steps;
        const second = run({
            treeLevels: { L2: 5, L2a: 5, L2b: 5 },
            critChance: 30,
            attackInterval: 0.2
        }).steps;

        expect(second.criticalDamage.deadeye.averageStacks).toBe(first.criticalDamage.deadeye.averageStacks);
        expect(second.criticalDamage.deadeye.averageCritChancePercent)
            .toBe(first.criticalDamage.deadeye.averageCritChancePercent);
        expect(second.criticalDamage.deadeye.perfectChainUptime)
            .toBe(first.criticalDamage.deadeye.perfectChainUptime);
        expect(second.criticalDamage.deadeye.averagePerfectChainCritDamagePercent)
            .toBe(first.criticalDamage.deadeye.averagePerfectChainCritDamagePercent);
    });
});
