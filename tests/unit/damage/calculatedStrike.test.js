import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

const BASE_INTERVAL = 0.6;

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

function run(build, killsPerSecond) {
    return new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({ calculatedStrikeKillsPerSecond: killsPerSecond })
    });
}

describe('Calculated Strike', () => {
    it('has no effect with zero kills per second', () => {
        const steps = run(makeArcherBuild({ UL: 5 }), 0);

        expect(steps.attackSpeed.calculatedStrikeExtraAttacksPerSecond).toBe(0);
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(BASE_INTERVAL, 10);
    });

    it('adds one extra attack per reset, not a flat cooldown reduction', () => {
        // 50% × 1 kill/s = 0.5 attacchi extra/s.
        const steps = run(makeArcherBuild({ UL: 5 }), 1);
        const baseAttacksPerSecond = 1 / BASE_INTERVAL;
        const expectedAttacksPerSecond = baseAttacksPerSecond + 0.5;

        expect(steps.attackSpeed.calculatedStrikeExtraAttacksPerSecond).toBeCloseTo(0.5, 10);
        expect(steps.attackSpeed.attacksPerSecond).toBeCloseTo(expectedAttacksPerSecond, 10);
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(1 / expectedAttacksPerSecond, 10);
        expect(steps.attackSpeed.calculatedStrikeAttackSpeedPercent).toBeCloseTo(30, 10);
    });

    it('scales the DPS bonus with kills/s', () => {
        const noKills = run(makeArcherBuild({ UL: 5 }), 0);
        const oneKill = run(makeArcherBuild({ UL: 5 }), 1);
        const slowKills = run(makeArcherBuild({ UL: 5 }), 0.2);

        expect(oneKill.attackSpeed.dps / noKills.attackSpeed.dps).toBeCloseTo(1.3, 10);
        expect(oneKill.attackSpeed.calculatedStrikeAttackSpeedPercent).toBeCloseTo(30, 10);

        // 50% × 0.2 = 0.1 attacchi extra/s → +6% attack speed.
        expect(slowKills.attackSpeed.calculatedStrikeExtraAttacksPerSecond).toBeCloseTo(0.1, 10);
        expect(slowKills.attackSpeed.calculatedStrikeAttackSpeedPercent).toBeCloseTo(6, 10);
    });

    it('does nothing when the node is not leveled', () => {
        const steps = run(makeArcherBuild({}), 4);

        expect(steps.attackSpeed.calculatedStrikePercent).toBe(0);
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(BASE_INTERVAL, 10);
    });

    it('clamps the slider to 0-4 kills per second', () => {
        const capped = run(makeArcherBuild({ UL: 5 }), 10);

        expect(capped.attackSpeed.calculatedStrikeKillsPerSecond).toBe(4);
        expect(capped.attackSpeed.calculatedStrikeExtraAttacksPerSecond).toBeCloseTo(2, 10);
        expect(capped.attackSpeed.attackInterval).toBeCloseTo(1 / (1 / BASE_INTERVAL + 2), 10);
    });
});
