import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

describe('combined Elemental Power sources', () => {
    it('sums flat sources, multiplies percent sources and scales elemental damage', () => {
        const build = makeBuild({
            weapon: {
                name: 'Nature Test',
                stats: {
                    'Damage Type': 'Arcane',
                    'Default Attack': 100,
                    'Weapon Type': 'magic',
                    'Arcane Damage': 100,
                    element: 'nature',
                    'Nature Damage': '50%',
                    'Elemental Power': 50,
                    'Elemental Power%': '20%',
                    'Energy Regen': 5,
                    'Crit Chance': '100%',
                    'Crit Damage': '100%'
                }
            },
            treeLevels: {
                C: 2,
                UL: 5,
                UL1: 5,
                UL2: 5,
                DR: 3,
                UR: 1,
                UR1: 1
            }
        });

        const { statsValues, skillValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
        const steps = new DpsManager().recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        const modifiers = steps.damageModifiers;

        expect(modifiers.distilledElementalPowerFlat).toBeCloseTo(75, 10);
        expect(modifiers.elementalSynergyFlat).toBeCloseTo(5, 10);
        expect(modifiers.crystalInsightsPercent).toBeGreaterThan(0);
        expect(modifiers.elementalChannelingPercent).toBeCloseTo(7.5, 10);
        expect(modifiers.elementalDamagePercent).toBeCloseTo(57.5, 10);

        const expectedElementalPower = (100 + 50 + 75 + 5)
            * (1 + (20 + 50 + modifiers.crystalInsightsPercent) / 100);

        expect(modifiers.elementalPower).toBeCloseTo(expectedElementalPower, 8);
        expect(modifiers.effectiveElementalPercent).toBeCloseTo(
            57.5 * expectedElementalPower / 100,
            8
        );

        const damageBeforeMastery = 100 * (1 + modifiers.percent / 100)
            * (1 + modifiers.effectiveElementalPercent / 100);
        expect(modifiers.damage).toBeCloseTo(
            (damageBeforeMastery + modifiers.masteryBonus) * modifiers.blueDamageMultiplier,
            8
        );
    });
});
