import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

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
    it('reads the archer node value', () => {
        const steps = run(makeArcherBuild({ UL: 5 }), 0);

        expect(steps.attackSpeed.calculatedStrikePercent).toBeCloseTo(50, 10);
    });

    it('has no effect with zero kills per second', () => {
        const steps = run(makeArcherBuild({ UL: 5 }), 0);

        expect(steps.attackSpeed.attackInterval).toBeCloseTo(0.6, 10);
    });

    it('reduces attack cooldown proportionally to kills/s', () => {
        // 50% × 1 kill/s = -50% cooldown → 0.6 × 0.5 = 0.3s.
        const oneKill = run(makeArcherBuild({ UL: 5 }), 1);
        // 50% × 0.2 kill/s = -10% cooldown → 0.6 × 0.9 = 0.54s.
        const slowKills = run(makeArcherBuild({ UL: 5 }), 0.2);

        expect(oneKill.attackSpeed.calculatedStrikeCooldownReduction).toBeCloseTo(50, 10);
        expect(oneKill.attackSpeed.attackInterval).toBeCloseTo(0.3, 10);
        expect(oneKill.attackSpeed.attacksPerSecond).toBeCloseTo(1 / 0.3, 10);

        expect(slowKills.attackSpeed.calculatedStrikeCooldownReduction).toBeCloseTo(10, 10);
        expect(slowKills.attackSpeed.attackInterval).toBeCloseTo(0.54, 10);
    });

    it('does nothing when the node is not leveled', () => {
        const steps = run(makeArcherBuild({}), 4);

        expect(steps.attackSpeed.calculatedStrikePercent).toBe(0);
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(0.6, 10);
    });

    it('clamps the slider to 0-4 kills per second', () => {
        const capped = run(makeArcherBuild({ UL: 5 }), 10);

        expect(capped.attackSpeed.calculatedStrikeKillsPerSecond).toBe(4);
        // 50% × 4 = -200% → l'intervallo resta al minimo difensivo.
        expect(capped.attackSpeed.attackInterval).toBeCloseTo(0.05, 10);
    });
});
