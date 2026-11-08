import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function run(augments, settings = {}, weaponStats = {}) {
    const build = makeBuild({
        weapon: makeArcaneWeapon(weaponStats),
        augments
    });
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        settings: makeSettings(settings)
    });
    return { manager, steps, build };
}

describe('two augments together', () => {
    it('Hunter + Infected sum additively', () => {
        const { steps } = run(
            ['Hunter 6', 'Infected 6'],
            { infectedHitsOverride: 10 }
        );

        expect(steps.augmentFinal.hunterPercent).toBe(75);
        expect(steps.augmentFinal.infectedPercent).toBe(30);
        expect(steps.augmentFinal.augmentPercent).toBe(105);
        expect(steps.augmentFinal.damage).toBeCloseTo(205, 10);
    });

    it('First Strike + Prosecution differ between first hit and normal hit', () => {
        const normal = run(
            ['First Strike 6', 'Prosecution 6'],
            { prosecutionHpPercent: 100 }
        ).steps;
        const first = run(
            ['First Strike 6', 'Prosecution 6'],
            { prosecutionHpPercent: 100, firstHit: true }
        ).steps;

        expect(normal.augmentFinal.firstStrikePercent).toBe(0);
        expect(normal.augmentFinal.prosecutionPercent).toBe(37.5);
        expect(normal.augmentFinal.augmentPercent).toBe(37.5);
        expect(normal.augmentFinal.damage).toBeCloseTo(137.5, 10);

        expect(first.augmentFinal.firstStrikePercent).toBe(60);
        expect(first.augmentFinal.prosecutionPercent).toBe(37.5);
        expect(first.augmentFinal.augmentPercent).toBe(97.5);
        expect(first.augmentFinal.damage).toBeCloseTo(197.5, 10);
    });

    it("Arcane Damage + Nature's Bless mix additive percent and EP factor", () => {
        const build = makeBuild({
            weapon: makeArcaneWeapon({
                element: 'nature',
                'Nature Damage': '50%'
            }),
            augments: ['Arcane Damage 6', "Nature's Bless 6"]
        });
        const { statsValues, skillValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
        const steps = new DpsManager().recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        expect(steps.damageModifiers.damage).toBeCloseTo(150, 10);
        expect(steps.augmentFinal.damageStatPercent).toBe(15);
        expect(steps.augmentFinal.natureBlessFlat).toBe(20);
        expect(steps.augmentFinal.natureBlessMultiplier).toBeCloseTo(1.6 / 1.5, 10);
        expect(steps.augmentFinal.damage).toBeCloseTo(184, 10);
    });
});
