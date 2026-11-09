import { beforeAll, describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { getAugmentEffects, registerAugments } from '../../../js/modules/augmentManager.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

/**
 * Build arciere con Mage Core opzionale e nodi Ultimate.
 * @param {{
 *   archerLevels?: Record<string, number>,
 *   mageLevels?: Record<string, number>,
 *   augments?: string[],
 *   mageCore?: boolean,
 *   killRate?: number,
 *   potentialChargeKills?: number,
 *   useBurst?: boolean,
 *   critChance?: number
 * }} [options]
 */
function run({
    archerLevels = {},
    mageLevels = {},
    augments = [],
    mageCore = true,
    killRate = 0.2,
    potentialChargeKills = 0,
    useBurst = true,
    critChance = 0
} = {}) {
    const build = makeBuild({
        currentClass: 'archer',
        augments,
        core: mageCore ? { name: 'Mage Core', stats: {} } : null,
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
    build.treeLevels.mage = new Map(
        Object.entries(mageLevels).filter(([, level]) => level > 0)
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
            attackInterval: 0.6,
            useBurst,
            potentialChargeKills,
            ultimateKillsPerSecond: killRate
        })
    });

    return { build, steps };
}

describe('Ultimatum Criterium / Vagrus', () => {
    it('is hidden without the archer nodes', () => {
        const { steps } = run({ critChance: 30 });

        expect(steps.criticalDamage.ultimate.visible).toBe(false);
        expect(steps.criticalDamage.ultimate.enabled).toBe(false);
        expect(steps.criticalDamage.critChance).toBeCloseTo(30, 10);
    });

    it('does nothing without a Mage Core, even with the nodes leveled', () => {
        const { steps } = run({
            archerLevels: { UR1: 5, UR2: 5 },
            mageCore: false,
            useBurst: true,
            critChance: 30
        });
        const ultimate = steps.criticalDamage.ultimate;

        expect(ultimate.visible).toBe(true);
        expect(ultimate.enabled).toBe(false);
        expect(ultimate.reason).toBe('Requires Mage Core');
        expect(ultimate.critChancePercent).toBe(0);
        expect(ultimate.critDamagePercent).toBe(0);
        expect(steps.criticalDamage.critChance).toBeCloseTo(30, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(50, 10);
    });

    it('does nothing when the burst is off, even with a Mage Core', () => {
        const { steps } = run({
            archerLevels: { UR1: 5, UR2: 5 },
            mageCore: true,
            useBurst: false,
            critChance: 30
        });
        const ultimate = steps.criticalDamage.ultimate;

        expect(ultimate.visible).toBe(true);
        expect(ultimate.enabled).toBe(false);
        expect(ultimate.reason).toBe('Burst disabled');
        expect(ultimate.critChancePercent).toBe(0);
        expect(ultimate.critDamagePercent).toBe(0);
        expect(steps.criticalDamage.critChance).toBeCloseTo(30, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(50, 10);
    });

    it('averages the 5s buff over the base 30s burst cycle', () => {
        const { steps } = run({
            archerLevels: { UR1: 5, UR2: 5 },
            potentialChargeKills: 0
        });
        const ultimate = steps.criticalDamage.ultimate;

        // UR1 5/5 = 10 Crit Chance; UR2 5/5 = 20 Crit Damage.
        // Uptime = 5 / 30 = 1/6.
        expect(ultimate.burstCycle).toBeCloseTo(30, 10);
        expect(ultimate.uptime).toBeCloseTo(5 / 30, 10);
        expect(ultimate.critChancePercent).toBeCloseTo(10 / 6, 10);
        expect(ultimate.critDamagePercent).toBeCloseTo(20 / 6, 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(10 / 6, 10);
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(50 + 20 / 6, 10);
        expect(steps.criticalDamage.ultimateCritChancePercent).toBeCloseTo(10 / 6, 10);
        expect(steps.criticalDamage.ultimateCritDamagePercent).toBeCloseTo(20 / 6, 10);
    });

    it('uses the burst cycle shortened by Potential Charge', () => {
        const { steps } = run({
            archerLevels: { UR1: 5, UR2: 5 },
            mageLevels: { UR1: 5 },
            potentialChargeKills: 5
        });
        const ultimate = steps.criticalDamage.ultimate;

        // Potential Charge 5/5 = 4s per kill; 5 kills = 20s → cooldown 0.
        expect(ultimate.burstCycle).toBeCloseTo(10, 10);
        expect(ultimate.uptime).toBeCloseTo(0.5, 10);
        expect(ultimate.critChancePercent).toBeCloseTo(5, 10);
        expect(ultimate.critDamagePercent).toBeCloseTo(10, 10);
    });

    it('accounts for Second Wind resets in the burst cycle', () => {
        const { steps } = run({
            archerLevels: { UR1: 5, UR2: 5 },
            augments: ['Second Wind 1'],
            killRate: 4,
            potentialChargeKills: 0
        });
        const ultimate = steps.criticalDamage.ultimate;

        // Second Wind I: 5% per kill, 30s internal cooldown.
        // λ = min(4 × 5%, 1/30) = 1/30.
        const resetRate = 1 / 30;
        const expectedCooldown = (1 - Math.exp(-resetRate * 20)) / resetRate;
        const expectedCycle = 10 + expectedCooldown;

        expect(ultimate.hasSecondWind).toBe(true);
        expect(ultimate.secondWindChancePercent).toBe(5);
        expect(ultimate.secondWindResetsPerSecond).toBeCloseTo(resetRate, 10);
        expect(ultimate.burstCycle).toBeCloseTo(expectedCycle, 10);
        expect(ultimate.uptime).toBeCloseTo(5 / expectedCycle, 10);
        expect(ultimate.critChancePercent).toBeCloseTo(10 * 5 / expectedCycle, 10);
    });

    it('does not apply a Second Wind bonus when the augment is not equipped', () => {
        const { steps } = run({
            archerLevels: { UR1: 5 },
            killRate: 4
        });
        const ultimate = steps.criticalDamage.ultimate;

        expect(ultimate.hasSecondWind).toBe(false);
        expect(ultimate.burstCycle).toBeCloseTo(30, 10);
    });

    it('parses Second Wind chance and internal cooldown from the augment text', () => {
        const { build } = run({ augments: ['Second Wind 1'] });
        const effects = getAugmentEffects({
            build,
            settings: makeSettings()
        });

        expect(effects.hasSecondWind).toBe(true);
        expect(effects.secondWindChancePercent).toBe(5);
        expect(effects.secondWindCooldownSeconds).toBe(30);
    });
});
