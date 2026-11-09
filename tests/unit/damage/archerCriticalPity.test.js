import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { getCriticalPityEffects } from '../../../js/modules/classes/archer.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function pityContext(level = 5) {
    return {
        build: {
            treeLevels: {
                archer: new Map([['UL2', level]])
            }
        },
        skillTrees: CLASS_SKILL_TREES
    };
}

function run({
    archerLevels = {},
    critChance = 30,
    attackInterval = 0.1
} = {}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: {
            name: 'Test Bow',
            stats: {
                'Damage Type': 'Arcane',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Arcane Damage': 100
            }
        }
    });
    build.treeLevels.archer = new Map(
        Object.entries(archerLevels).filter(([, level]) => level > 0)
    );

    const steps = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: critChance }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({
            slowAttack: true,
            attackInterval
        })
    });

    return steps;
}

describe('Critical Pity', () => {
    it('is hidden without the node', () => {
        const pity = getCriticalPityEffects(pityContext(0), 10, 30);

        expect(pity.visible).toBe(false);
        expect(pity.enabled).toBe(false);
        expect(pity.critChanceBonusPercent).toBe(0);
    });

    it('uses 1.75% per stack and 6 max stacks at 5/5', () => {
        const pity = getCriticalPityEffects(pityContext(5), 10, 30);

        expect(pity.critChancePerStackPercent).toBeCloseTo(1.75, 10);
        expect(pity.maxStacks).toBe(6);
        expect(pity.durationSeconds).toBe(2);
    });

    it('computes expected stacks from consecutive misses', () => {
        const pity = getCriticalPityEffects(pityContext(5), 10, 30);
        const q = 0.7;
        const expectedStacks = q * (1 - Math.pow(q, 6)) / (1 - q);

        expect(pity.reachableStacks).toBe(6);
        expect(pity.expectedStacks).toBeCloseTo(expectedStacks, 10);
        expect(pity.critChanceBonusPercent)
            .toBeCloseTo(expectedStacks * 1.75, 10);
    });

    it('limits stacks when hits are too slow to reach the cap in 2s', () => {
        const pity = getCriticalPityEffects(pityContext(5), 0.5, 30);
        const q = 0.7;

        expect(pity.reachableStacks).toBe(1);
        expect(pity.expectedStacks).toBeCloseTo(q, 10);
        expect(pity.critChanceBonusPercent).toBeCloseTo(q * 1.75, 10);
    });

    it('gives the full stack value at 0% crit chance', () => {
        const pity = getCriticalPityEffects(pityContext(5), 10, 0);

        expect(pity.expectedStacks).toBe(6);
        expect(pity.critChanceBonusPercent).toBeCloseTo(10.5, 10);
    });

    it('gives no stacks at 100% crit chance', () => {
        const pity = getCriticalPityEffects(pityContext(5), 10, 100);

        expect(pity.expectedStacks).toBe(0);
        expect(pity.critChanceBonusPercent).toBe(0);
    });

    it('is added to the shared Crit Chance used by the pipeline', () => {
        const steps = run({ archerLevels: { UL2: 5 } });
        const pity = steps.criticalDamage.criticalPity;

        expect(pity.visible).toBe(true);
        expect(pity.enabled).toBe(true);
        expect(steps.criticalDamage.criticalPityCritChancePercent)
            .toBeCloseTo(pity.critChanceBonusPercent, 10);
        expect(steps.criticalDamage.critChance)
            .toBeCloseTo(30 + pity.critChanceBonusPercent, 10);
    });

    it('stays independent from Deadeye and uses base + Hot Streak', () => {
        const steps = run({
            archerLevels: { UL2: 5, L2: 5, L2a: 5, L2b: 5 }
        });
        const pity = steps.criticalDamage.criticalPity;

        // La Crit Chance media usata da Pity non include Deadeye.
        expect(pity.averageCritChancePercent).toBeCloseTo(30, 10);
        expect(pity.critChanceBonusPercent).toBeCloseTo(
            getCriticalPityEffects(pityContext(5), pity.totalHitsPerSecond, 30)
                .critChanceBonusPercent,
            10
        );
        expect(steps.criticalDamage.critChance).toBeCloseTo(
            30
            + steps.criticalDamage.deadeyeCritChancePercent
            + pity.critChanceBonusPercent,
            10
        );
    });
});
