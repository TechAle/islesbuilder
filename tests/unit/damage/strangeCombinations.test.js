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

function makeBuildMixed({
    archerLevels = {},
    mageLevels = {},
    weaponStats,
    core = null,
    augments = []
}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: { name: 'Strange Audit Weapon', stats: weaponStats },
        core,
        augments
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

describe('Strange combinations audit', () => {
    it('Elemental Burst scaling at every relevant level', () => {
        const context = (archerLevel, mageLevel = 0) => ({
            build: {
                treeLevels: {
                    archer: new Map(archerLevel > 0 ? [['UR', archerLevel]] : []),
                    mage: new Map(mageLevel > 0 ? [['DR', mageLevel]] : [])
                }
            },
            skillTrees: CLASS_SKILL_TREES
        });

        expect(getElementalBurstEffects(context(1)).critDamageBonusPercent).toBeCloseTo(1.5, 10);
        expect(getElementalBurstEffects(context(1, 1)).critDamageBonusPercent).toBeCloseTo(13.5, 10);
        expect(getElementalBurstEffects(context(5)).critDamageBonusPercent).toBeCloseTo(7.5, 10);
        expect(getElementalBurstEffects(context(5, 1)).critDamageBonusPercent).toBeCloseTo(67.5, 10);
        expect(getElementalBurstEffects(context(0, 5)).critDamageBonusPercent).toBe(0);
        expect(getElementalBurstEffects(context(0, 5)).visible).toBe(false);

        for (let level = 1; level <= 5; level++) {
            expect(getElementalBurstEffects(context(level)).critDamageBonusPercent)
                .toBeCloseTo(1.5 * level, 10);
            expect(getElementalBurstEffects(context(level, 5)).critDamageBonusPercent)
                .toBeCloseTo(1.5 * level * 9, 10);
        }
    });

    it('Ultimate + Potential Charge + Second Wind cannot go below the active burst cycle', () => {
        const build = makeBuildMixed({
            archerLevels: { UR1: 5, UR2: 5 },
            mageLevels: { UR1: 5 },
            weaponStats: ARCANE_WEAPON,
            core: { name: 'Mage Core', stats: {} },
            augments: ['Second Wind 1']
        });
        const { steps } = run(build, {
            settings: {
                useBurst: true,
                potentialChargeKills: 5,
                ultimateKillsPerSecond: 4
            }
        });

        // Potential Charge porta già il cooldown a 0: Second Wind non può
        // scendere sotto i 10s di durata attiva.
        expect(steps.burst.burstCycle).toBeCloseTo(10, 10);
        expect(steps.burst.secondWindResetsPerSecond).toBeCloseTo(1 / 30, 10);
        expect(steps.criticalDamage.ultimate.uptime).toBeCloseTo(0.5, 10);
        expect(steps.criticalDamage.ultimateCritChancePercent).toBeCloseTo(5, 10);
        expect(steps.criticalDamage.ultimateCritDamagePercent).toBeCloseTo(10, 10);
    });

    it('Sharpshooter with finite TTK and resets combines ramp and reset uptime', () => {
        const build = makeBuildMixed({
            archerLevels: { L1: 5, L1a: 5, L1b: 5 },
            weaponStats: {
                'Damage Type': 'Pierce',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Pierce Damage': 100
            }
        });
        const { steps } = run(build, {
            settings: {
                estimatedTimeToKill: 30,
                sharpshooterResetsPerSecond: 1
            }
        });

        // tMax = 15s, T = 30s → ramp 0.75.
        // Reset 1/s → stackUptime 0.5.
        expect(steps.sharpshooter.rampFactor).toBeCloseTo(0.75, 10);
        expect(steps.sharpshooter.stacks).toBeCloseTo(9.375, 10);
        expect(steps.sharpshooter.damagePercent).toBeCloseTo(14.0625, 10);

        // Hot Streak uptime = (1 - 15/30) × 0.5 = 0.25.
        expect(steps.sharpshooter.hotStreakUptime).toBeCloseTo(0.25, 10);
        expect(steps.sharpshooter.hotStreakCritChancePercent).toBeCloseTo(1.875, 10);
        expect(steps.sharpshooter.hotStreakCritDamagePercent).toBeCloseTo(5, 10);

        // Damage = 100 × 1.140625 = 114.0625.
        const base = 114.0625;
        const average = base * (1 - 0.01875) + base * 1.55 * 0.01875;
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(average, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(average / 0.6, 10);
    });

    it('all crit sources sum exactly once in the final Crit Chance', () => {
        const build = makeBuildMixed({
            archerLevels: {
                L1: 5,
                L1a: 5,
                L1b: 5,
                L2: 5,
                L2a: 5,
                L2b: 5,
                UL2: 5,
                UR1: 5
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

    it('Calculated Strike works with Slow attack and still feeds Ricochet', () => {
        const build = makeBuildMixed({
            archerLevels: { UL: 5, UL1: 5 },
            weaponStats: {
                'Damage Type': 'Pierce',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Pierce Damage': 100
            }
        });
        const { manager, steps } = run(build, {
            settings: {
                slowAttack: true,
                attackInterval: 0.6,
                calculatedStrikeKillsPerSecond: 1
            }
        });

        // 1/0.6 + 0.5 = 2.166667 attacchi/s.
        const attacksPerSecond = 1 / 0.6 + 0.5;
        expect(steps.attackSpeed.attacksPerSecond).toBeCloseTo(attacksPerSecond, 10);
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(1 / attacksPerSecond, 10);

        // Ricochet resta capped a 0.5 proc/s anche con gli attacchi extra.
        expect(steps.ricochet.procsPerSecond).toBeCloseTo(0.5, 10);
        expect(manager.getDps()).toBeCloseTo(100 * attacksPerSecond + 50, 10);
    });

    it('Critical Pity handles a fractional reachable-stack cap at low hit rate', () => {
        const context = {
            build: { treeLevels: { archer: new Map([['UL2', 5]]) } },
            skillTrees: CLASS_SKILL_TREES
        };
        const pity = getCriticalPityEffects(context, 0.2, 30);

        // cap = min(6, 0.2 × 2) = 0.4.
        const q = 0.7;
        const expectedStacks = q * (1 - Math.pow(q, 0.4)) / (1 - q);

        expect(pity.reachableStacks).toBeCloseTo(0.4, 10);
        expect(pity.expectedStacks).toBeCloseTo(expectedStacks, 10);
        expect(pity.critChanceBonusPercent).toBeCloseTo(expectedStacks * 1.75, 10);
    });

    it('Critical Pity scales correctly at every node level', () => {
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

    it('crit overflow with Ultimate + Critical Pity caps effective Crit Chance', () => {
        const build = makeBuildMixed({
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

        // Tactical 5/5 = +20%, quindi 75 + 20 = 95%.
        // Pity usa base + Hot Streak = 95%, quindi q = 0.05.
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

        // Con crit effettivo 100%: 100 × 1.50 = 150.
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(150, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(150, 10);
    });

    it('full strange build: archer + mage + burst + Ultimate + Elemental Channeling', () => {
        const build = makeBuildMixed({
            archerLevels: {
                C: 5,
                DL: 5,
                DR: 5,
                R1: 5,
                R1a: 5,
                R1b: 5,
                UR: 5,
                UR1: 5,
                UR2: 5
            },
            mageLevels: { DR: 5, UR1: 5 },
            weaponStats: {
                ...ARCANE_WEAPON,
                element: 'thunder'
            },
            core: { name: 'Mage Core', stats: {} },
            augments: ['Second Wind 1']
        });
        const { manager, steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 10 },
                'Thunder Damage': { flat: 0, percent: 50 }
            },
            settings: {
                useBurst: true,
                potentialChargeKills: 5,
                ultimateKillsPerSecond: 4
            }
        });

        // Damage Modifiers:
        // 100 × 1.625 (thunder + channeling) = 162.5
        // +25% Ranged Mastery = 203.125
        // × 1.80 Glass Cannon = 365.625.
        expect(steps.damageModifiers.damage).toBeCloseTo(365.625, 10);

        // Ultimate: cycle 10s → uptime 50% → +5% CC, +10% CD.
        // Crit: 10 base + 20 Tactical + 5 Ultimate = 35%.
        // Crit Damage: 50 + 40 Powerful + 67.5 Elemental Burst + 10 Ultimate = 167.5%.
        expect(steps.burst.burstCycle).toBeCloseTo(10, 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(35, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(167.5, 10);

        const criticalHit = 365.625 * 2.675;
        const average = 365.625 * 0.65 + criticalHit * 0.35;
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(criticalHit, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(average, 10);

        // Attack DPS = average / 0.6. Burst DPS = average.
        expect(steps.attackSpeed.dps).toBeCloseTo(average / 0.6, 10);
        expect(steps.burst.burstDamagePerHit).toBeCloseTo(average * 0.75, 10);
        expect(steps.burst.burstDps).toBeCloseTo(average, 10);
        expect(manager.getDps()).toBeCloseTo(average / 0.6 + average, 10);
    });
});
