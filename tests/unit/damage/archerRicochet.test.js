import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeArcherBuild({ treeLevels = {}, weapon = {} } = {}) {
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
            'Arcane Damage': 100,
            ...weapon
        }
    };
    return build;
}

function run({ treeLevels = {}, weapon = {}, stats = {}, settings = {} } = {}) {
    const manager = new DpsManager();
    const build = makeArcherBuild({ treeLevels, weapon });
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

describe('Ricochet', () => {
    it('adds one arrow per proc, scaled by the node chance', () => {
        const { steps } = run({ treeLevels: { UL1: 1 } });

        expect(steps.ricochet.enabled).toBe(true);
        expect(steps.ricochet.ricochetPercent).toBe(10);
        expect(steps.ricochet.procChance).toBeCloseTo(0.1, 10);
        expect(steps.ricochet.procsPerSecond).toBeCloseTo(1 / 6, 10);
        expect(steps.ricochet.damagePerProc).toBeCloseTo(100, 10);
        expect(steps.ricochet.dps).toBeCloseTo(100 / 6, 10);
    });

    it('caps procs at the 2s cooldown', () => {
        const { steps } = run({ treeLevels: { UL1: 5 } });

        // 50% × 1.667 attacchi/s = 0.833 proc/s, ma il cooldown limita a 0.5/s.
        expect(steps.ricochet.ricochetPercent).toBe(50);
        expect(steps.ricochet.maxProcsPerSecond).toBe(0.5);
        expect(steps.ricochet.procsPerSecond).toBeCloseTo(0.5, 10);
        expect(steps.ricochet.dps).toBeCloseTo(50, 10);
    });

    it('does not work with magic weapons', () => {
        const { manager, steps } = run({
            treeLevels: { UL1: 5 },
            weapon: { 'Weapon Type': 'magic' }
        });

        expect(steps.ricochet.enabled).toBe(false);
        expect(steps.ricochet.reason).toBe('Requires ranged weapon');
        expect(steps.ricochet.dps).toBe(0);

        const group = manager.getStepGroups().find(entry => entry.id === 'ricochet');
        expect(group.results).toEqual([{ label: 'Ricochet', value: 'Requires ranged weapon' }]);
    });

    it('does not work with melee weapons', () => {
        const { steps } = run({
            treeLevels: { UL1: 5 },
            weapon: { 'Weapon Type': 'melee' }
        });

        expect(steps.ricochet.enabled).toBe(false);
        expect(steps.ricochet.dps).toBe(0);
    });

    it('uses the ability damage reverse scaling', () => {
        // Default Attack 50% → base weapon damage 50, reverse 2×.
        const { steps } = run({
            treeLevels: { UL1: 1 },
            weapon: { 'Default Attack': 50 }
        });

        expect(steps.baseDamage.baseDamage).toBeCloseTo(50, 10);
        expect(steps.ricochet.reverseMultiplier).toBeCloseTo(2, 10);
        expect(steps.ricochet.damagePerProc).toBeCloseTo(100, 10);
    });

    it('is increased by Ability Damage%', () => {
        const { steps } = run({
            treeLevels: { UL1: 1 },
            stats: { 'Ability Damage': { flat: 0, percent: 50 } }
        });

        expect(steps.ricochet.abilityDamagePercent).toBe(50);
        expect(steps.ricochet.damagePerProc).toBeCloseTo(150, 10);
        expect(steps.ricochet.dps).toBeCloseTo(25, 10);
    });

    it('adds its DPS to the total and the breakdown', () => {
        const { manager } = run({ treeLevels: { UL1: 5 } });
        const parts = manager.getDpsParts();

        expect(parts.some(part => part.label === 'Ricochet')).toBe(true);
        expect(manager.getDamageBreakdown().sources.some(source => source.label === 'Ricochet')).toBe(true);
    });

    it('feeds the shared hit model only for ranged weapons', () => {
        const ranged = run({ treeLevels: { UL1: 5 } }).steps;
        const magic = run({
            treeLevels: { UL1: 5 },
            weapon: { 'Weapon Type': 'magic' }
        }).steps;

        expect(ranged.crystalCombustion.hitsPerSecond).toBeCloseTo(1 / 0.6 + 0.5, 10);
        expect(magic.crystalCombustion.hitsPerSecond).toBeCloseTo(1 / 0.6, 10);
    });

    it('is hidden when the node is not leveled', () => {
        const { manager, steps } = run({ treeLevels: {} });

        expect(steps.ricochet.ricochetPercent).toBe(0);
        expect(manager.getStepGroups().some(entry => entry.id === 'ricochet')).toBe(false);
    });
});
