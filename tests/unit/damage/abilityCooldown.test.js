import { describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function registerDummyAbility() {
    const special = new SpecialAbilityManager();
    special.reset();
    special.registerAbilities('Test Weapon', [{
        kind: 'ability',
        name: 'Dummy',
        energy: 0,
        text: 'Deal 100% damage',
        key: 'Right click'
    }]);
    return special;
}

function makeBuildWithAbility() {
    return makeBuild({
        weapon: {
            name: 'Test Weapon',
            stats: {
                'Damage Type': 'Arcane',
                'Default Attack': 100,
                'Weapon Type': 'magic',
                'Arcane Damage': 100
            }
        }
    });
}

function runWithCooldown(cooldownPercent, settings = {}) {
    const build = makeBuildWithAbility();
    const steps = new DpsManager({ specialAbilityManager: registerDummyAbility() }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Ability Cooldown': { flat: 0, percent: cooldownPercent }
        },
        skillValues: {},
        build,
        settings: makeSettings(settings)
    });

    return steps.specialAttacks.abilities[0];
}

describe('Ability Cooldown / Swift channels', () => {
    it('reduces right-click ability cooldown', () => {
        const base = runWithCooldown(0);
        const reduced = runWithCooldown(-25);

        expect(base.cooldown).toBeCloseTo(1.6, 10);
        expect(reduced.cooldown).toBeCloseTo(1.2, 10);
        expect(reduced.castsPerSecond).toBeCloseTo(1 / 1.2, 10);
        expect(reduced.dps).toBeCloseTo(base.dps * (1.6 / 1.2), 10);
    });

    it('applies the reduction to an overridden ability cooldown', () => {
        const ability = runWithCooldown(-25, {
            abilityCooldownOverrides: { 'Dummy-Test Weapon': 2 }
        });

        expect(ability.cooldown).toBeCloseTo(1.5, 10);
    });

    it('reads the total Swift channels value from the archer tree', () => {
        const build = makeBuildWithAbility();
        build.currentClass = 'archer';
        build.treeLevels.archer = new Map([['R', 1], ['R1', 1], ['R1a', 1], ['R1b', 1], ['DL2', 5]]);

        const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
        expect(statsValues['Ability Cooldown'].percent).toBeCloseTo(-25, 10);

        const steps = new DpsManager({ specialAbilityManager: registerDummyAbility() }).recalculate({
            statsValues,
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });

        expect(steps.specialAttacks.abilities[0].cooldown).toBeCloseTo(1.2, 10);
    });
});
