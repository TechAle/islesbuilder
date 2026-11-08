import { beforeEach, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

function makeTempest(critChance = 0, bac = []) {
    const special = new SpecialAbilityManager();
    special.reset();
    special.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeBuild({
        weapon: {
            name: 'Tempest',
            stats: {
                'Damage Type': 'Arcane',
                'Default Attack': 85,
                'Weapon Type': 'magic',
                'Arcane Damage': 47.6
            }
        }
    });

    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: critChance }
        },
        skillValues: {},
        build,
        settings: makeSettings()
    });
    return { manager, steps };
}

describe('special attacks and critical damage', () => {
    it('uses the average critical damage, not the pre-crit base', () => {
        const { steps } = makeTempest(100);

        expect(steps.criticalDamage.baseDamage).toBeCloseTo(40.46, 10);
        expect(steps.criticalDamage.damage).toBeCloseTo(60.69, 10);
        expect(steps.specialAttacks.averageDamage).toBeCloseTo(60.69, 10);
    });

    it('Whirlwind DPS scales with crit chance', () => {
        const noCrit = makeTempest(0).steps;
        const fullCrit = makeTempest(100).steps;

        const noCritWhirlwind = noCrit.specialAttacks.abilities[0];
        const fullCritWhirlwind = fullCrit.specialAttacks.abilities[0];

        expect(noCritWhirlwind.damagePerHit).toBeCloseTo(47.6 * 0.45, 10);
        expect(fullCritWhirlwind.damagePerHit).toBeCloseTo(71.4 * 0.45, 10);
        expect(fullCritWhirlwind.dps).toBeGreaterThan(noCritWhirlwind.dps);
        expect(fullCritWhirlwind.dps).toBeCloseTo((71.4 * 0.45 * 3) / 1.6, 10);
    });

    it('multi-hit special attacks multiply damage per use by times', () => {
        const { steps } = makeTempest(0);
        const whirlwind = steps.specialAttacks.abilities[0];

        expect(whirlwind.times).toBe(3);
        expect(whirlwind.damagePerUse).toBeCloseTo(whirlwind.damagePerHit * 3, 10);
    });
});

describe('special attacks and energy', () => {
    function makeAbility(energy) {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Weapon', [
            {
                kind: 'ability',
                name: 'Dummy',
                energy,
                text: 'Deal 100% damage',
                key: 'Right click'
            }
        ]);
        const build = makeBuild({
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
        return new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            settings: makeSettings()
        });
    }

    it('limits special attack DPS by energy when the cost is high', () => {
        const cheap = makeAbility(0).specialAttacks.abilities[0];
        const expensive = makeAbility(100).specialAttacks.abilities[0];

        expect(expensive.castsPerSecond).toBeLessThan(cheap.castsPerSecond);
        expect(expensive.dps).toBeLessThan(cheap.dps);
    });
});
describe('special attacks reverse scaling', () => {
    it('scales back so modifiers are applied to the unscaled base damage', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Test Weapon', [
            {
                kind: 'ability',
                name: 'Dummy',
                energy: 0,
                text: 'Deal 100% damage',
                key: 'Right click'
            }
        ]);

        const build = makeBuild({
            weapon: {
                name: 'Test Weapon',
                stats: {
                    'Damage Type': 'Arcane',
                    'Default Attack': 90,
                    'Weapon Type': 'magic',
                    'Arcane Damage': 50
                }
            }
        });

        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: {
                // 45 × 1.55555... = 70, come nell'esempio 50 → 45 → 70.
                'Arcane Damage': { flat: 50, percent: 55.5555555556 },
                'Crit Chance': { flat: 0, percent: 0 }
            },
            skillValues: {},
            build,
            settings: makeSettings()
        });

        const ability = steps.specialAttacks.abilities[0];

        expect(steps.baseDamage.baseDamage).toBeCloseTo(45, 10);
        expect(steps.damageModifiers.damage).toBeCloseTo(70, 10);
        expect(steps.specialAttacks.averageDamage).toBeCloseTo(70, 10);
        expect(ability.damagePerHit).toBeCloseTo(70 * (100 / 90), 10);
        expect(ability.damagePerHit).toBeCloseTo(77.7777777778, 8);
    });
});
