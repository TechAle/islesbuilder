import { beforeAll, describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { getCriticalPityEffects, getElementalBurstEffects } from '../../../js/modules/classes/archer.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function makeMixedBuild({
    archerLevels = {},
    mageLevels = {},
    weaponStats,
    core = null
}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: { name: 'Edge Case Weapon', stats: weaponStats },
        core
    });
    build.treeLevels.archer = new Map(
        Object.entries(archerLevels).filter(([, level]) => level > 0)
    );
    build.treeLevels.mage = new Map(
        Object.entries(mageLevels).filter(([, level]) => level > 0)
    );
    return build;
}

function mergeStats(statsValues, extra) {
    for (const [key, totals] of Object.entries(extra)) {
        const current = statsValues[key] ?? (statsValues[key] = { flat: 0, percent: 0 });
        current.flat += totals.flat ?? 0;
        current.percent += totals.percent ?? 0;
    }
}

function run(build, { extraStats = {}, settings = {} } = {}) {
    const { statsValues, skillValues } = selectStats(
        { skillTrees: CLASS_SKILL_TREES },
        build
    );
    mergeStats(statsValues, extraStats);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues,
        skillValues,
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });

    return { manager, steps };
}

const ARCANE_WEAPON = {
    'Damage Type': 'Arcane',
    'Default Attack': 100,
    'Weapon Type': 'ranged',
    'Arcane Damage': 100
};

const PIERCE_WEAPON = {
    'Damage Type': 'Pierce',
    'Default Attack': 100,
    'Weapon Type': 'ranged',
    'Pierce Damage': 100
};

describe('damage edge cases', () => {
    it('scales Elemental Burst at every archer level', () => {
        const context = (archerLevel, mageLevel = 0) => ({
            build: {
                treeLevels: {
                    archer: new Map(archerLevel > 0 ? [['UR', archerLevel]] : []),
                    mage: new Map(mageLevel > 0 ? [['DR', mageLevel]] : [])
                }
            },
            skillTrees: CLASS_SKILL_TREES
        });

        expect(getElementalBurstEffects(context(0, 5)).critDamageBonusPercent).toBe(0);
        expect(getElementalBurstEffects(context(0, 5)).visible).toBe(false);

        for (let level = 1; level <= 5; level++) {
            expect(getElementalBurstEffects(context(level)).critDamageBonusPercent)
                .toBeCloseTo(1.5 * level, 10);
            expect(getElementalBurstEffects(context(level, 5)).critDamageBonusPercent)
                .toBeCloseTo(1.5 * level * 9, 10);
        }
    });

    it('keeps the burst cycle above the active duration with Potential Charge and Second Wind', () => {
        const build = makeMixedBuild({
            archerLevels: { UR1: 5, UR2: 5 },
            mageLevels: { UR1: 5 },
            weaponStats: ARCANE_WEAPON,
            core: { name: 'Mage Core', stats: {} }
        });
        const { steps } = run(build, {
            settings: {
                useBurst: true,
                potentialChargeKills: 5,
                ultimateKillsPerSecond: 4
            }
        });
        expect(steps.burst.burstCycle).toBeCloseTo(10, 10);
        expect(steps.criticalDamage.ultimate.uptime).toBeCloseTo(0.5, 10);
        expect(steps.criticalDamage.ultimateCritChancePercent).toBeCloseTo(5, 10);
        expect(steps.criticalDamage.ultimateCritDamagePercent).toBeCloseTo(10, 10);
    });

    it('combines Sharpshooter ramp and reset uptime with a finite TTK', () => {
        const build = makeMixedBuild({
            archerLevels: { L1: 5, L1a: 5, L1b: 5 },
            weaponStats: PIERCE_WEAPON
        });
        const { steps } = run(build, {
            settings: {
                estimatedTimeToKill: 30,
                sharpshooterResetsPerSecond: 1
            }
        });

        expect(steps.sharpshooter.rampFactor).toBeCloseTo(0.75, 10);
        expect(steps.sharpshooter.stacks).toBeCloseTo(9.375, 10);
        expect(steps.sharpshooter.damagePercent).toBeCloseTo(14.0625, 10);
        expect(steps.sharpshooter.hotStreakUptime).toBeCloseTo(0.25, 10);
        expect(steps.sharpshooter.hotStreakCritChancePercent).toBeCloseTo(1.875, 10);
        expect(steps.sharpshooter.hotStreakCritDamagePercent).toBeCloseTo(5, 10);
    });

    it('sums every independent Crit Chance source exactly once', () => {
        const build = makeMixedBuild({
            archerLevels: {
                L1: 5, L1a: 5, L1b: 5,
                L2: 5, L2a: 5, L2b: 5,
                UL2: 5, UR1: 5
            },
            mageLevels: { UR1: 5 },
            weaponStats: ARCANE_WEAPON,
            core: { name: 'Mage Core', stats: {} }
        });
        const { steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 20 }
            },
            settings: {
                useBurst: true,
                potentialChargeKills: 5,
                slowAttack: true,
                attackInterval: 0.2
            }
        });

        const hotStreak = steps.criticalDamage.sharpshooterCritChancePercent;
        const deadeye = steps.criticalDamage.deadeyeCritChancePercent;
        const pity = steps.criticalDamage.criticalPityCritChancePercent;
        const ultimate = steps.criticalDamage.ultimateCritChancePercent;

        expect(hotStreak).toBeGreaterThan(0);
        expect(deadeye).toBeGreaterThan(0);
        expect(pity).toBeGreaterThan(0);
        expect(ultimate).toBeGreaterThan(0);
        expect(steps.criticalDamage.critChance).toBeCloseTo(
            20 + hotStreak + deadeye + pity + ultimate,
            10
        );
    });

    it('supports Slow attack, Calculated Strike and Ricochet together', () => {
        const build = makeMixedBuild({
            archerLevels: { UL: 5, UL1: 5 },
            weaponStats: PIERCE_WEAPON
        });
        const { manager, steps } = run(build, {
            settings: {
                slowAttack: true,
                attackInterval: 0.6,
                calculatedStrikeKillsPerSecond: 1
            }
        });

        const attacksPerSecond = 1 / 0.6 + 0.5;
        expect(steps.attackSpeed.attacksPerSecond).toBeCloseTo(attacksPerSecond, 10);
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(1 / attacksPerSecond, 10);
        expect(steps.ricochet.procsPerSecond).toBeCloseTo(0.5, 10);
        expect(manager.getDps()).toBeCloseTo(100 * attacksPerSecond + 50, 10);
    });

    it('handles a fractional Critical Pity reachable-stack cap', () => {
        const context = {
            build: { treeLevels: { archer: new Map([['UL2', 5]]) } },
            skillTrees: CLASS_SKILL_TREES
        };
        const pity = getCriticalPityEffects(context, 0.2, 30);

        const q = 0.7;
        const expectedStacks = q * (1 - Math.pow(q, 0.4)) / (1 - q);
        expect(pity.reachableStacks).toBeCloseTo(0.4, 10);
        expect(pity.expectedStacks).toBeCloseTo(expectedStacks, 10);
        expect(pity.critChanceBonusPercent).toBeCloseTo(expectedStacks * 1.75, 10);
    });

    it('scales Critical Pity at every node level', () => {
        const q = 0.7;
        for (let level = 1; level <= 5; level++) {
            const context = {
                build: { treeLevels: { archer: new Map([['UL2', level]]) } },
                skillTrees: CLASS_SKILL_TREES
            };
            const perStack = 0.35 * level;
            const maxStacks = level + 1;
            const expectedStacks = q * (1 - Math.pow(q, maxStacks)) / (1 - q);
            const pity = getCriticalPityEffects(context, 10, 30);

            expect(pity.critChancePerStackPercent).toBeCloseTo(perStack, 10);
            expect(pity.maxStacks).toBe(maxStacks);
            expect(pity.expectedStacks).toBeCloseTo(expectedStacks, 10);
            expect(pity.critChanceBonusPercent)
                .toBeCloseTo(expectedStacks * perStack, 10);
        }
    });

    it('keeps Crit Chance overflow capped while showing the overflow amount', () => {
        const build = makeMixedBuild({
            archerLevels: { DR: 5, UR1: 5, UL2: 5 },
            mageLevels: { UR1: 5 },
            weaponStats: ARCANE_WEAPON,
            core: { name: 'Mage Core', stats: {} }
        });
        const { steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 75 }
            },
            settings: {
                useBurst: true,
                potentialChargeKills: 5,
                slowAttack: true,
                attackInterval: 0.2
            }
        });

        const q = 0.05;
        const pityStacks = q * (1 - Math.pow(q, 6)) / (1 - q);
        const pityBonus = pityStacks * 1.75;
        const expectedCritChance = 95 + 5 + pityBonus;

        expect(steps.criticalDamage.criticalPityCritChancePercent)
            .toBeCloseTo(pityBonus, 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(expectedCritChance, 10);
        expect(steps.criticalDamage.effectiveCritChance).toBe(100);
        expect(steps.criticalDamage.critChanceOverflow)
            .toBeCloseTo(expectedCritChance - 100, 10);
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(150, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(150, 10);
    });

    it('adds Grief, Last Sorrow and Focus before the critical calculation', () => {
        const build = makeMixedBuild({
            archerLevels: { C: 5, DL: 5, DR: 5, UR: 5 },
            mageLevels: { L1: 5, L1a: 5, L2: 5, L2b: 5 },
            weaponStats: PIERCE_WEAPON
        });
        const { manager, steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 10 }
            },
            settings: {
                griefUptime: 100,
                lastSorrowUptime: 50,
                focusStacks: 8
            }
        });

        expect(steps.damageMultiplier.griefDamagePercent).toBeCloseTo(65, 10);
        expect(steps.damageMultiplier.lastSorrowDamagePercent).toBeCloseTo(12.5, 10);
        expect(steps.damageMultiplier.focusDamagePercent).toBeCloseTo(40, 10);
        expect(steps.damageMultiplier.multiplierPercent).toBeCloseTo(117.5, 10);
        expect(steps.damageMultiplier.damage).toBeCloseTo(125 * 2.175, 10);

        const base = 125 * 2.175;
        const average = base * 0.7 + base * 1.975 * 0.3;
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(average, 10);
        expect(manager.getDps()).toBeCloseTo(average / 0.6, 10);
    });
});
