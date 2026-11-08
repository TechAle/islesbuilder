import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeArcaneWeapon, makeBuild, makeSettings, MAGE_CORE } from '../../helpers/build.js';

function run({ treeLevels = {}, core = null, settings = {} } = {}) {
    const special = new SpecialAbilityManager();
    special.reset();
    const build = makeBuild({
        weapon: makeArcaneWeapon(),
        core,
        treeLevels
    });
    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings(settings)
    });
    return { manager, steps };
}

describe('mage damage multiplier step', () => {
    it('shows Elemental Knowledge, Grief, Last Sorrow and Focus rows', () => {
        const { manager } = run({
            treeLevels: { C: 1, DR: 1, DR1: 5, L: 1, L1: 3, L1a: 1, L2: 5, L2b: 5 },
            settings: { griefUptime: 50, lastSorrowUptime: 50, focusStacks: 4 }
        });
        const group = manager.getStepGroups().find(entry => entry.id === 'damageMultiplier');
        const labels = group.results.map(row => row.label);

        expect(labels).toContain('Elemental Knowledge');
        expect(labels).toContain('Grief Infliction');
        expect(labels).toContain('Last Sorrow');
        expect(labels).toContain('Focus Stacks');
        expect(labels).toContain('Damage Multiplier');
    });

    it('does not show mage multiplier rows without mage nodes', () => {
        const { manager } = run();
        const group = manager.getStepGroups().find(entry => entry.id === 'damageMultiplier');
        expect(group).toBeUndefined();
    });
});

describe('mage crystal and orb steps', () => {
    it('disables Crystal Combustion without crystal nodes', () => {
        const { manager, steps } = run();
        expect(steps.crystalCombustion.enabled).toBe(false);
        expect(steps.crystalCombustion.combustionDps).toBe(0);
        expect(manager.getStepGroups().some(entry => entry.id === 'crystalCombustion')).toBe(false);
    });

    it('enables Crystal Combustion with Recover/Power Crystal and the node', () => {
        const { manager, steps } = run({
            treeLevels: { C: 1, R: 1, R1: 1, R1a: 3, R1b: 3 }
        });
        expect(steps.crystalCombustion.enabled).toBe(true);
        expect(steps.crystalCombustion.combustionDps).toBeGreaterThan(0);
        expect(steps.crystalCombustion.explosionsPerSecond).toBeGreaterThan(0);

        const group = manager.getStepGroups().find(entry => entry.id === 'crystalCombustion');
        expect(group.results.map(row => row.label)).toContain('Crystal Combustion DPS');
    });

    it('disables Support Orbs without the node', () => {
        const { manager, steps } = run();
        expect(steps.supportOrbs.enabled).toBe(false);
        expect(steps.supportOrbs.orbDps).toBe(0);
        expect(manager.getStepGroups().some(entry => entry.id === 'supportOrbs')).toBe(false);
    });

    it('enables Support Orbs with the node', () => {
        const { manager, steps } = run({
            treeLevels: { C: 1, R: 1, R2: 5 }
        });
        expect(steps.supportOrbs.enabled).toBe(true);
        expect(steps.supportOrbs.orbDps).toBeGreaterThan(0);

        const group = manager.getStepGroups().find(entry => entry.id === 'supportOrbs');
        expect(group.results.map(row => row.label)).toContain('Support Orb DPS');
    });
});

describe('burst step', () => {
    it('requires Mage Core', () => {
        const { steps } = run({ settings: { useBurst: true } });
        expect(steps.burst.available).toBe(false);
        expect(steps.burst.enabled).toBe(false);
        expect(steps.burst.burstDps).toBe(0);
    });

    it('stays off when useBurst is false', () => {
        const { steps } = run({ core: MAGE_CORE });
        expect(steps.burst.available).toBe(true);
        expect(steps.burst.enabled).toBe(false);
        expect(steps.burst.burstDps).toBe(0);
    });

    it('produces burst DPS with Mage Core and useBurst', () => {
        const { steps } = run({
            core: MAGE_CORE,
            settings: { useBurst: true }
        });
        expect(steps.burst.enabled).toBe(true);
        expect(steps.burst.burstDps).toBeGreaterThan(0);
        expect(steps.burst.burstCycle).toBe(30);
    });

    it('Potential Charge reduces the burst cycle without going below 10s', () => {
        const withoutCharge = run({
            core: MAGE_CORE,
            settings: { useBurst: true }
        });
        const withCharge = run({
            core: MAGE_CORE,
            treeLevels: { C: 1, UR: 1, UR1: 5 },
            settings: { useBurst: true, potentialChargeKills: 30 }
        });

        expect(withCharge.steps.burst.burstCycle).toBeGreaterThanOrEqual(10);
        expect(withCharge.steps.burst.burstDps).toBeGreaterThan(withoutCharge.steps.burst.burstDps);
    });
});
