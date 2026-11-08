import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeArcherBuild(treeLevels = {}) {
    const build = makeBuild({ currentClass: 'archer' });
    build.treeLevels.archer = new Map(
        Object.entries(treeLevels).filter(([, level]) => level > 0)
    );
    build.activeEquip.weapon = {
        ...build.activeEquip.weapon,
        name: 'Test Bow',
        stats: {
            'Damage Type': 'Pierce',
            'Default Attack': 100,
            'Weapon Type': 'ranged',
            'Pierce Damage': 100
        }
    };
    return build;
}

function runArcher(build, statsOverrides = {}) {
    const manager = new DpsManager();
    const { statsValues, skillValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    Object.assign(statsValues, statsOverrides);

    const steps = manager.recalculate({
        statsValues,
        skillValues,
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings()
    });

    return { manager, statsValues, skillValues, steps };
}

describe('archer Glass Cannon nodes', () => {
    it('adds all three Glass Cannon nodes to the generic Damage stat', () => {
        const build = makeArcherBuild({ R1: 5, R1a: 5, R1b: 5 });
        const { statsValues } = runArcher(build);

        // R1 37.5% + R1a 12.5% + R1b 30% = 80%.
        expect(statsValues.Damage.percent).toBeCloseTo(80, 10);
    });

    it('stacks partial levels additively', () => {
        const build = makeArcherBuild({ R1: 1, R1a: 1, R1b: 1 });
        const { statsValues } = runArcher(build);

        // 7.5% + 2.5% + 6% = 16%.
        expect(statsValues.Damage.percent).toBeCloseTo(16, 10);
    });

    it('applies the generic Damage% before critical damage', () => {
        const build = makeArcherBuild({ R1: 5, R1a: 5, R1b: 5 });
        const { steps } = runArcher(build);

        expect(steps.damageModifiers.genericDamagePercent).toBeCloseTo(80, 10);
        expect(steps.damageModifiers.damage).toBeCloseTo(180, 10);
        expect(steps.criticalDamage.damage).toBeCloseTo(180, 10);
        expect(steps.attackSpeed.dps).toBeCloseTo(300, 10);
    });

    it('scales crits with the generic Damage% bonus', () => {
        const build = makeArcherBuild({ R1: 1 });
        const { steps } = runArcher(build, {
            'Crit Chance': { flat: 0, percent: 100 },
            'Crit Damage': { flat: 0, percent: 0 }
        });

        // 100 base × 1.075 (Damage%) × 1.5 (crit) = 161.25.
        expect(steps.damageModifiers.damage).toBeCloseTo(107.5, 10);
        expect(steps.criticalDamage.damage).toBeCloseTo(161.25, 10);
    });

    it('shows Damage% as a normal detailed stat', () => {
        const build = makeArcherBuild({ R1: 1 });
        const { statsValues } = runArcher(build);

        expect(statsValues.Damage).toEqual({ flat: 0, percent: 7.5 });
    });
});
