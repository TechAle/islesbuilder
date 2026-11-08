import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeBuild, makeSettings, MAGE_CORE } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function run(critChance, { augments = [], withAbilities = true } = {}) {
    const special = new SpecialAbilityManager();
    special.reset();
    if (withAbilities) {
        special.registerAbilities('Tempest', [
            {
                kind: 'ability',
                name: 'Whirlwind',
                energy: 12,
                text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
                key: 'Right click'
            },
            {
                kind: 'passive',
                name: 'Smite',
                text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.'
            }
        ]);
    }

    const build = makeBuild({
        weapon: {
            name: 'Tempest',
            stats: {
                'Damage Type': 'Arcane',
                'Default Attack': 85,
                'Weapon Type': 'magic',
                'Arcane Damage': 100
            }
        },
        core: MAGE_CORE,
        augments,
        treeLevels: {
            C: 1,
            R: 1,
            R1: 1,
            R1a: 3,
            R1b: 3,
            R2: 5,
            R2a: 3
        }
    });

    const manager = new DpsManager({ specialAbilityManager: special });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: critChance },
            'Crit Damage': { flat: 0, percent: 0 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: makeSettings({
            useBurst: true,
            griefUptime: 0,
            lastSorrowUptime: 0,
            focusStacks: 0,
            potentialChargeKills: 0,
            deathburstKillsPerSecond: 0
        })
    });
    return { manager, steps };
}

describe('critical scaling per damage source', () => {
    it('increases every damage source from 0% to 100% crit', () => {
        const noCrit = run(0).steps;
        const fullCrit = run(100).steps;

        expect(fullCrit.criticalDamage.damage).toBeGreaterThan(noCrit.criticalDamage.damage);
        expect(fullCrit.attackSpeed.dps - fullCrit.attackSpeed.passiveDps)
            .toBeGreaterThan(noCrit.attackSpeed.dps - noCrit.attackSpeed.passiveDps);
        expect(fullCrit.attackSpeed.passiveDps).toBeGreaterThan(noCrit.attackSpeed.passiveDps);
        expect(fullCrit.burst.burstDps).toBeGreaterThan(noCrit.burst.burstDps);
        expect(fullCrit.specialAttacks.abilities[0].dps)
            .toBeGreaterThan(noCrit.specialAttacks.abilities[0].dps);
        expect(fullCrit.crystalCombustion.combustionDps)
            .toBeGreaterThan(noCrit.crystalCombustion.combustionDps);
        expect(fullCrit.supportOrbs.orbDps).toBeGreaterThan(noCrit.supportOrbs.orbDps);
    });

    it('increases Combo and Chain Lightning with crit', () => {
        const noCrit = run(0, { augments: ['Combo 6', 'Chain Lightning 6'] }).steps;
        const fullCrit = run(100, { augments: ['Combo 6', 'Chain Lightning 6'] }).steps;

        expect(fullCrit.augmentDamage.comboDps).toBeGreaterThan(noCrit.augmentDamage.comboDps);
        expect(noCrit.augmentDamage.chainLightningDps).toBe(0);
        expect(fullCrit.augmentDamage.chainLightningDps).toBeGreaterThan(0);
    });
});
