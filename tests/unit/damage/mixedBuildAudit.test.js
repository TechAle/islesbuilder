import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeMixedBuild({
    archerLevels = {},
    mageLevels = {},
    weaponStats,
    mageCore = false
}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: { name: 'Mixed Audit Weapon', stats: weaponStats },
        core: mageCore ? { name: 'Mage Core', stats: {} } : null
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

    return { manager, steps, statsValues, skillValues };
}

const PIERCE_WEAPON = {
    'Damage Type': 'Pierce',
    'Default Attack': 100,
    'Weapon Type': 'ranged',
    'Pierce Damage': 100
};

describe('Mixed mage/archer full-build audit', () => {
    it('pure archer: mastery, glass cannon, crit, calculated strike and ricochet', () => {
        const build = makeMixedBuild({
            archerLevels: {
                C: 5,
                DL: 5,
                DR: 5,
                DL1: 5,
                R1: 5,
                R1a: 5,
                R1b: 5,
                UR: 5,
                UL: 5,
                UL1: 5
            },
            weaponStats: PIERCE_WEAPON
        });
        const { manager, steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 10 }
            },
            settings: {
                calculatedStrikeKillsPerSecond: 1
            }
        });

        // 100 × 1.25 Ranged Mastery × 1.80 Glass Cannon = 225.
        expect(steps.damageModifiers.damage).toBeCloseTo(225, 10);

        // 10 base + 20 Tactical = 30% Crit Chance.
        expect(steps.criticalDamage.critChance).toBeCloseTo(30, 10);

        // 50 + 40 Powerful + 7.5 Elemental Burst = 97.5%.
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(97.5, 10);
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(444.375, 10);

        // 225 × 0.70 + 444.375 × 0.30 = 290.8125.
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(290.8125, 10);

        // Swift Strikes: 0.6 × 0.75 = 0.45s.
        // Calculated Strike: 50% × 1 kill/s = +0.5 attacks/s.
        // 1 / 0.45 + 0.5 = 2.722222...
        const attacksPerSecond = 1 / 0.45 + 0.5;
        expect(steps.attackSpeed.attackInterval).toBeCloseTo(1 / attacksPerSecond, 10);
        expect(steps.attackSpeed.attacksPerSecond).toBeCloseTo(attacksPerSecond, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(290.8125 * attacksPerSecond, 10);

        // Ricochet: 50% chance, capped at 1 / 2s = 0.5 proc/s.
        expect(steps.ricochet.procsPerSecond).toBeCloseTo(0.5, 10);
        expect(steps.ricochet.damagePerProc).toBeCloseTo(290.8125, 10);
        expect(steps.ricochet.dps).toBeCloseTo(0.5 * 290.8125, 10);

        expect(manager.getDps()).toBeCloseTo(
            290.8125 * attacksPerSecond + 0.5 * 290.8125,
            10
        );
    });

    it('archer + mage: Elemental Channeling turns Elemental Burst into ×9', () => {
        const build = makeMixedBuild({
            archerLevels: { C: 5, DL: 5, DR: 5, UR: 5 },
            mageLevels: { DR: 5 },
            weaponStats: {
                'Damage Type': 'Arcane',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Arcane Damage': 100,
                element: 'thunder'
            }
        });
        const { manager, steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 10 },
                'Thunder Damage': { flat: 0, percent: 50 }
            }
        });

        // Elemental Channeling 5/5 = 12.5%.
        expect(steps.damageModifiers.elementalChannelingPercent).toBeCloseTo(12.5, 10);
        expect(steps.damageModifiers.elementalDamagePercent).toBeCloseTo(62.5, 10);

        // 100 × 1.625 (50% thunder + 12.5% channeling) = 162.5
        // + 25% Ranged Mastery = 203.125.
        expect(steps.damageModifiers.damage).toBeCloseTo(203.125, 10);

        // Elemental Burst 5/5 with Elemental Channeling = 67.5%.
        // Crit Damage = 50 + 40 Powerful + 67.5 = 157.5%.
        expect(steps.criticalDamage.elementalBurstCritDamagePercent)
            .toBeCloseTo(67.5, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(157.5, 10);

        // Crit Chance = 10 base + 20 Tactical = 30%.
        expect(steps.criticalDamage.critChance).toBeCloseTo(30, 10);
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(203.125 * 2.575, 10);

        const average = 203.125 * 0.7 + 203.125 * 2.575 * 0.3;
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(average, 10);
        expect(manager.getDps()).toBeCloseTo(average / 0.6, 10);
    });

    it('archer + mage core: burst cycle, Ultimate buffs and burst DPS', () => {
        const build = makeMixedBuild({
            archerLevels: { DL: 5, DR: 5, UR1: 5, UR2: 5 },
            mageLevels: { UR1: 5 },
            weaponStats: {
                'Damage Type': 'Arcane',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Arcane Damage': 100
            },
            mageCore: true
        });
        const { manager, steps } = run(build, {
            extraStats: {
                'Crit Chance': { flat: 0, percent: 10 }
            },
            settings: {
                useBurst: true,
                potentialChargeKills: 5
            }
        });

        // Potential Charge 5/5 = 4s per kill; 5 kills = 20s reduction.
        // Cooldown 20s → 0s, quindi ciclo = 10s.
        expect(steps.burst.burstCycle).toBeCloseTo(10, 10);
        expect(steps.burst.burstCastsPerSecond).toBeCloseTo(0.1, 10);

        // Ultimate: 5s / 10s = 50% uptime.
        expect(steps.criticalDamage.ultimate.uptime).toBeCloseTo(0.5, 10);
        expect(steps.criticalDamage.ultimateCritChancePercent).toBeCloseTo(5, 10);
        expect(steps.criticalDamage.ultimateCritDamagePercent).toBeCloseTo(10, 10);

        // Crit Chance = 10 + 20 Tactical + 5 Ultimate = 35%.
        // Crit Damage = 50 + 40 Powerful + 10 Ultimate = 100%.
        expect(steps.criticalDamage.critChance).toBeCloseTo(35, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(100, 10);

        // Average damage = 100 × 0.65 + 200 × 0.35 = 135.
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(135, 10);

        // Attack DPS = 135 / 0.6 = 225.
        expect(steps.attackSpeed.dps).toBeCloseTo(225, 10);

        // Burst: 135 × 0.75 × (10 / 0.75) / 10 = 135.
        expect(steps.burst.burstDamagePerHit).toBeCloseTo(101.25, 10);
        expect(steps.burst.burstDps).toBeCloseTo(135, 10);
        expect(manager.getDps()).toBeCloseTo(360, 10);
    });

    it('archer + mage: additive Grief/Last Sorrow/Focus multipliers with crit', () => {
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

        // Grief 5/5 = 65% × 100% = 65%.
        // Last Sorrow 5/5 = 25% × 50% = 12.5%.
        // Focus 5/5 = 5% × 8 stack = 40%.
        // Totale additivo = 117.5%, non moltiplicativo.
        expect(steps.damageMultiplier.griefDamagePercent).toBeCloseTo(65, 10);
        expect(steps.damageMultiplier.lastSorrowDamagePercent).toBeCloseTo(12.5, 10);
        expect(steps.damageMultiplier.focusDamagePercent).toBeCloseTo(40, 10);
        expect(steps.damageMultiplier.multiplierPercent).toBeCloseTo(117.5, 10);
        expect(steps.damageMultiplier.damage).toBeCloseTo(125 * 2.175, 10);

        // Crit: 10 base + 20 Tactical = 30%.
        // Crit Damage: 50 + 40 Powerful + 7.5 Elemental Burst = 97.5%.
        expect(steps.criticalDamage.critChance).toBeCloseTo(30, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(97.5, 10);

        const base = 125 * 2.175;
        const average = base * 0.7 + base * 1.975 * 0.3;
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(average, 10);
        expect(manager.getDps()).toBeCloseTo(average / 0.6, 10);
    });

    it('sharpshooter ramp and Hot Streak average with a known fight duration', () => {
        const build = makeMixedBuild({
            archerLevels: { L1: 5, L1a: 5, L1b: 5 },
            weaponStats: PIERCE_WEAPON
        });

        const short = run(build, {
            settings: { estimatedTimeToKill: 10 }
        }).steps;
        const medium = run(build, {
            settings: { estimatedTimeToKill: 30 }
        }).steps;

        // H = 1/0.6 = 1.6667 stack/s, cap 25 → tMax = 15s.
        // T = 10s: ramp = 10 / (2×15) = 1/3.
        expect(short.sharpshooter.rampFactor).toBeCloseTo(1 / 3, 10);
        expect(short.sharpshooter.stacks).toBeCloseTo(25 / 3, 10);
        expect(short.sharpshooter.damagePercent).toBeCloseTo(12.5, 10);
        expect(short.sharpshooter.hotStreakActive).toBe(false);
        expect(short.criticalDamage.averageDamage).toBeCloseTo(112.5, 10);
        expect(short.attackSpeed.dps).toBeCloseTo(187.5, 10);

        // T = 30s: ramp = 1 - 15/(2×30) = 0.75.
        // Hot Streak uptime = 1 - 15/30 = 0.5.
        expect(medium.sharpshooter.rampFactor).toBeCloseTo(0.75, 10);
        expect(medium.sharpshooter.stacks).toBeCloseTo(18.75, 10);
        expect(medium.sharpshooter.damagePercent).toBeCloseTo(28.125, 10);
        expect(medium.sharpshooter.hotStreakUptime).toBeCloseTo(0.5, 10);
        expect(medium.sharpshooter.hotStreakCritChancePercent).toBeCloseTo(3.75, 10);
        expect(medium.sharpshooter.hotStreakCritDamagePercent).toBeCloseTo(10, 10);
        expect(medium.criticalDamage.critChance).toBeCloseTo(3.75, 10);
        expect(medium.criticalDamage.critDamagePercent).toBeCloseTo(60, 10);
        expect(medium.criticalDamage.averageDamage).toBeCloseTo(131.0078125, 10);
        expect(medium.attackSpeed.dps).toBeCloseTo(218.34635416666666, 10);
    });
});
