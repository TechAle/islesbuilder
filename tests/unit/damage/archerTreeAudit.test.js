import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { getElementalBurstEffects } from '../../../js/modules/classes/archer.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function buildArcher(treeLevels = {}) {
    const build = makeBuild({
        currentClass: 'archer',
        weapon: {
            name: 'Audit Bow',
            stats: {
                'Damage Type': 'Pierce',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Pierce Damage': 100
            }
        }
    });
    build.treeLevels.archer = new Map(
        Object.entries(treeLevels).filter(([, level]) => level > 0)
    );
    return build;
}

function run({ treeLevels = {}, statsValues = {} } = {}) {
    const build = buildArcher(treeLevels);
    const steps = new DpsManager().recalculate({
        statsValues: {
            'Pierce Damage': { flat: 100, percent: 0 },
            ...statsValues
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings()
    });
    return steps;
}

describe('Archer tree manual audit', () => {
    it('Ranged Mastery 5/5 = +25% Ranged Damage', () => {
        const steps = run({
            treeLevels: { C: 5 },
            statsValues: { 'Ranged Damage': { flat: 0, percent: 25 } }
        });

        expect(steps.damageModifiers.masteryPercent).toBeCloseTo(25, 10);
        expect(steps.damageModifiers.masteryBonus).toBeCloseTo(25, 10);
        expect(steps.damageModifiers.damage).toBeCloseTo(125, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(125 / 0.6, 10);
    });

    it('Powerful 5/5 = +40% Crit Damage', () => {
        const steps = run({
            treeLevels: { DL: 5 },
            statsValues: {
                'Crit Chance': { flat: 0, percent: 100 },
                'Crit Damage': { flat: 0, percent: 40 }
            }
        });

        // 100 × (1 + (50 base + 40)%) = 190.
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(90, 10);
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(190, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(190, 10);
    });

    it('Tactical 5/5 = +20% Crit Chance', () => {
        const steps = run({
            treeLevels: { DR: 5 },
            statsValues: {
                'Crit Chance': { flat: 0, percent: 20 }
            }
        });

        // 100 × 0.8 + 150 × 0.2 = 110.
        expect(steps.criticalDamage.critChance).toBeCloseTo(20, 10);
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(110, 10);
    });

    it('Swift Strikes 5/5 = -25% attack cooldown', () => {
        const steps = run({
            treeLevels: { DL1: 5 },
            statsValues: { 'Attack Cooldown': { flat: 0, percent: -25 } }
        });

        expect(steps.attackSpeed.attackInterval).toBeCloseTo(0.45, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(100 / 0.45, 10);
    });

    it('Elemental Burst 5/5 = +7.5% Crit Damage by default', () => {
        const steps = run({
            treeLevels: { UR: 5 },
            statsValues: {
                'Crit Chance': { flat: 0, percent: 100 }
            }
        });

        expect(steps.criticalDamage.elementalBurst.elementalChannelingActive).toBe(false);
        expect(steps.criticalDamage.elementalBurstCritDamagePercent).toBeCloseTo(7.5, 10);
        // 50 base + 7.5 Elemental Burst = 57.5% → 157.5.
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(57.5, 10);
        expect(steps.criticalDamage.criticalHit).toBeCloseTo(157.5, 10);
    });

    it('Elemental Burst 5/5 = +67.5% Crit Damage with Elemental Channeling', () => {
        const effects = getElementalBurstEffects({
            build: {
                treeLevels: {
                    archer: new Map([['UR', 5]]),
                    mage: new Map([['DR', 1]])
                }
            },
            skillTrees: CLASS_SKILL_TREES
        });

        expect(effects.elementalChannelingActive).toBe(true);
        expect(effects.elementalChannelingMultiplier).toBe(9);
        expect(effects.baseCritDamagePercent).toBeCloseTo(7.5, 10);
        expect(effects.critDamageBonusPercent).toBeCloseTo(67.5, 10);
    });

    it('Elemental Burst is included in Natural Distillation', () => {
        const build = buildArcher({ UR: 5 });
        build.treeLevels.mage = new Map([['UL2', 5]]);
        const { statsValues, skillValues } = selectStats(
            { skillTrees: CLASS_SKILL_TREES },
            build
        );
        statsValues['Crit Chance'] = { flat: 0, percent: 100 };

        const steps = new DpsManager().recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        // Crit Damage totale = 50 base + 7.5 Elemental Burst = 57.5%.
        // Natural Distillation 25% → 14.375% convertito.
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(57.5, 10);
        expect(steps.damageModifiers.distilledCritDamagePercent).toBeCloseTo(14.375, 10);
        expect(steps.criticalDamage.effectiveCritDamagePercent).toBeCloseTo(43.125, 10);
        expect(steps.criticalDamage.damage).toBeCloseTo(143.125, 10);
    });

    it('matches the max Elemental Burst + max Natural Distillation example', () => {
        const build = buildArcher({ UR: 5 });
        build.treeLevels.mage = new Map([['DR', 5], ['UL2', 5]]);
        const { statsValues, skillValues } = selectStats(
            { skillTrees: CLASS_SKILL_TREES },
            build
        );
        statsValues['Crit Chance'] = { flat: 0, percent: 100 };

        const manager = new DpsManager();
        const steps = manager.recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        // Base 50 + Elemental Burst 67.5 (con Channeling) = 117.5%.
        // Natural Distillation 25% → 29.375% convertito.
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(117.5, 10);
        expect(steps.damageModifiers.distilledCritDamagePercent).toBeCloseTo(29.375, 10);
        expect(steps.damageModifiers.distilledElementalPowerFlat).toBeCloseTo(58.75, 10);
        expect(steps.criticalDamage.effectiveCritDamagePercent).toBeCloseTo(88.125, 10);
        expect(steps.criticalDamage.damage).toBeCloseTo(188.125, 10);

        const criticalRows = manager.getStepGroups()
            .find(group => group.id === 'criticalDamage')
            .results;
        const modifierRows = manager.getStepGroups()
            .find(group => group.id === 'damageModifiers')
            .results;

        expect(criticalRows.find(row => row.label === 'Natural Distillation').value)
            .toBeCloseTo(-29.375, 10);
        expect(criticalRows.find(row => row.label === 'Effective Crit Damage').value)
            .toBeCloseTo(88.125, 10);
        expect(modifierRows.some(row => row.label === 'Natural Distillation EP')).toBe(true);
    });
});
