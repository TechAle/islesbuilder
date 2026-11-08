import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function buildManager(augments = [], settings = {}) {
    const special = new SpecialAbilityManager();
    special.reset();
    const build = makeBuild({ weapon: makeArcaneWeapon(), augments });
    const manager = new DpsManager({ specialAbilityManager: special });
    manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build,
        settings: makeSettings(settings)
    });
    return { manager, build };
}

describe('DpsManager', () => {
    it('returns the expected DPS parts for a basic attack', () => {
        const { manager } = buildManager();
        const parts = manager.getDpsParts();

        expect(parts).toHaveLength(1);
        expect(parts[0].label).toBe('Attack');
        expect(parts[0].dps).toBeCloseTo(250, 10);
    });

    it('sums DPS parts into total DPS', () => {
        const { manager } = buildManager();
        const total = manager.getDpsParts().reduce((sum, part) => sum + part.dps, 0);

        expect(manager.getDps()).toBeCloseTo(total, 10);
    });

    it('produces a breakdown whose percentages sum to 100', () => {
        const { manager } = buildManager();
        const breakdown = manager.getDamageBreakdown();

        expect(breakdown.total).toBeGreaterThan(0);
        expect(breakdown.sources.length).toBeGreaterThan(0);
        expect(breakdown.sources.reduce((sum, source) => sum + source.percent, 0)).toBeCloseTo(100, 10);
    });

    it('adds burst DPS when burst is enabled with Mage Core', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        const build = makeBuild({
            weapon: makeArcaneWeapon(),
            core: { name: 'Mage Core', stats: {} }
        });
        const manager = new DpsManager({ specialAbilityManager: special });
        manager.recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            settings: makeSettings({ useBurst: true })
        });

        const labels = manager.getDpsParts().map(part => part.label);
        expect(labels).toContain('Attack');
        expect(labels).toContain('Burst');
    });

    it('merges augment rows into Damage Multiplier and hides the augment steps', () => {
        const { manager } = buildManager(['Arcane Damage 6', 'Arcane Damage 6']);
        const groups = manager.getStepGroups();
        const ids = groups.map(group => group.id);

        expect(ids).not.toContain('augmentFinal');
        expect(ids).not.toContain('augmentDamage');

        const multiplier = groups.find(group => group.id === 'damageMultiplier');
        expect(multiplier).toBeTruthy();
        expect(multiplier.results.some(row => row.label === 'Arcane Damage%')).toBe(true);
        expect(multiplier.results.some(row => row.label === 'Augments Damage%')).toBe(true);

        const damageRow = multiplier.results.find(row => row.label === 'Damage');
        expect(damageRow.value).toBeCloseTo(manager.getSteps().augmentFinal.damage, 10);
    });

    it('keeps zero-damage builds free of DPS parts', () => {
        const manager = new DpsManager();
        manager.recalculate({
            statsValues: {},
            skillValues: {},
            build: makeBuild(),
            settings: makeSettings()
        });

        expect(manager.getDps()).toBeNull();
        expect(manager.getDpsParts()).toEqual([]);
        expect(manager.getDamageBreakdown()).toEqual({ total: 0, sources: [] });
    });
});

describe('first hit calculation', () => {
    it('includes First Strike but excludes Infected', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        const build = makeBuild({
            weapon: makeArcaneWeapon(),
            augments: ['First Strike 6', 'Infected 6']
        });
        const manager = new DpsManager({ specialAbilityManager: special });
        const steps = manager.recalculate({
            statsValues: {
                'Arcane Damage': { flat: 100, percent: 0 }
            },
            skillValues: {},
            build,
            settings: makeSettings({
                firstHit: true,
                infectedHitsOverride: 10
            })
        });

        expect(steps.augmentFinal.firstStrikePercent).toBe(60);
        expect(steps.augmentFinal.infectedPercent).toBe(0);
        expect(steps.augmentFinal.damage).toBe(160);
    });

});
