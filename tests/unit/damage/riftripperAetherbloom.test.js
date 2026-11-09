import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeBuild, makeSettings } from '../../helpers/build.js';

const AETHERBLOOM_PIECES = [
    'Aetherbloom Helmet',
    'Aetherbloom Chestplate',
    'Aetherbloom Leggings',
    'Aetherbloom Boots'
];

function makeRiftripperBuild() {
    return makeBuild({
        currentClass: 'archer',
        weapon: {
            name: 'Riftripper',
            stats: {
                'Damage Type': 'Pierce',
                'Default Attack': 100,
                'Weapon Type': 'ranged',
                'Pierce Damage': 43.7,
                'Crit Damage': '25%',
                'Crit Chance': '12%'
            }
        },
        armor: AETHERBLOOM_PIECES.map(name => ({
            name,
            stats: {
                'Pierce Damage': '9.2%',
                'Crit Damage': '16%'
            }
        }))
    });
}

function registerRiftripper(special) {
    special.reset();
    special.registerAbilities('Riftripper', [{
        kind: 'ability',
        name: 'Awoken Fissure',
        energy: 16,
        text: 'Shoot an arrow that will spawn a Void Rift on hit, increasing damage by 20%. Hitting a Rift will deal 250% damage to nearby enemies.',
        key: 'Right click'
    }]);
}

describe('Riftripper + Aetherbloom', () => {
    it('matches the manual damage calculation', () => {
        const build = makeRiftripperBuild();
        const { statsValues, skillValues } = selectStats(
            { skillTrees: CLASS_SKILL_TREES },
            build
        );

        const special = new SpecialAbilityManager();
        registerRiftripper(special);
        const manager = new DpsManager({ specialAbilityManager: special });
        const steps = manager.recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({
                nearbyPlayers: 3,
                executionHpPercent: 50
            })
        });

        // Riftripper + 4 pezzi Aetherbloom:
        // Pierce Damage = 43.7 flat; +36.8% dai pezzi.
        // Damage Modifiers = 43.7 × 1.368 = 59.7816.
        expect(steps.damageModifiers.damage).toBeCloseTo(59.7816, 10);

        // Awoken Fissure: +20% damage.
        expect(steps.damageMultiplier.damageTakenIncreasePercent).toBeCloseTo(20, 10);
        expect(steps.damageMultiplier.damage).toBeCloseTo(59.7816 * 1.2, 10);

        // Crit Chance = 12 Riftripper + 9 Alliance (3 player).
        expect(steps.criticalDamage.itemSets.allianceCritChancePercent).toBeCloseTo(9, 10);
        expect(steps.criticalDamage.critChance).toBeCloseTo(21, 10);

        // Crit Damage = 50 base + 25 Riftripper + 64 Aetherbloom.
        expect(steps.criticalDamage.critDamagePercent).toBeCloseTo(139, 10);

        const preCrit = 43.7 * 1.368 * 1.2;
        const average = preCrit * 0.79 + preCrit * 2.39 * 0.21;
        expect(steps.criticalDamage.averageDamage).toBeCloseTo(average, 10);

        // Aetherbloom Execution 10% × (1 - 50%) = 5%.
        expect(steps.augmentFinal.setExecutionPercent).toBeCloseTo(5, 10);
        expect(steps.augmentFinal.damage).toBeCloseTo(average * 1.05, 10);

        const attackDps = average * 1.05 / 0.6;
        const abilityDps = average * 1.05 * 2.5 / 3.8;

        expect(steps.attackSpeed.dps).toBeCloseTo(attackDps, 10);
        expect(steps.specialAttacks.abilities[0].cooldown).toBeCloseTo(3.8, 10);
        expect(steps.specialAttacks.abilities[0].damagePercent).toBeCloseTo(250, 10);
        expect(steps.specialAttacks.abilities[0].dps).toBeCloseTo(abilityDps, 10);
        expect(manager.getDps()).toBeCloseTo(attackDps + abilityDps, 10);

        special.reset();
    });
});
