import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { selectStats } from '../../../js/store/selectors.js';
import { MONSTER_PRESETS } from '../../../js/data/monsters.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { makeArcaneWeapon, makeBuild, makeSettings } from '../../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function tempestBuild({ augments = [], treeLevels = {} } = {}) {
    const special = new SpecialAbilityManager();
    special.reset();
    special.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 0,
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
                'Arcane Damage': 100
            }
        },
        augments,
        treeLevels
    });

    return { build, special };
}

function run({ augments = [], treeLevels = {}, settings = {} } = {}) {
    const { build, special } = tempestBuild({ augments, treeLevels });
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

describe('first hit exclusions', () => {
    it('does not apply Crystal Insights on the first hit', () => {
        const normal = run({
            treeLevels: { C: 1, UL: 1, UL1: 5 }
        }).steps;
        const first = run({
            treeLevels: { C: 1, UL: 1, UL1: 5 },
            settings: { firstHit: true }
        }).steps;

        expect(normal.damageModifiers.crystalInsightsPercent).toBeGreaterThan(0);
        expect(first.damageModifiers.crystalInsightsPercent).toBe(0);
        expect(first.damageModifiers.elementalPower).toBeLessThan(normal.damageModifiers.elementalPower);
    });

    it('does not apply Grief or Last Sorrow on the first hit', () => {
        const normal = run({
            treeLevels: { C: 1, L: 1, L2: 5, L2b: 5 },
            settings: { griefUptime: 100, lastSorrowUptime: 100 }
        }).steps;
        const first = run({
            treeLevels: { C: 1, L: 1, L2: 5, L2b: 5 },
            settings: { griefUptime: 100, lastSorrowUptime: 100, firstHit: true }
        }).steps;

        expect(normal.damageMultiplier.griefDamagePercent).toBeGreaterThan(0);
        expect(normal.damageMultiplier.lastSorrowDamagePercent).toBeGreaterThan(0);
        expect(first.damageMultiplier.griefDamagePercent).toBe(0);
        expect(first.damageMultiplier.lastSorrowDamagePercent).toBe(0);
    });
});

describe('Infected and target lifetime', () => {
    const treeLevels = { C: 1, R: 1, R1: 1, R1a: 5, R1b: 5, R2: 5, R2a: 3 };

    it('reaches full stacks on a long-lived target', () => {
        const { steps } = run({
            augments: ['Infected 6'],
            treeLevels,
            settings: { targetHealth: 1_000_000, targetDefense: 0 }
        });

        expect(steps.augmentFinal.infectedPercent).toBe(45);
    });

    it('does not reach full stacks when the target dies quickly', () => {
        const longFight = run({
            augments: ['Infected 6'],
            treeLevels,
            settings: { targetHealth: 1_000_000, targetDefense: 0 }
        }).steps;
        const shortFight = run({
            augments: ['Infected 6'],
            treeLevels,
            settings: { targetHealth: 100, targetDefense: 0 }
        }).steps;

        expect(shortFight.augmentFinal.infectedPercent).toBeLessThan(longFight.augmentFinal.infectedPercent);
        expect(shortFight.augmentFinal.infectedPercent).toBeLessThan(45);
        expect(shortFight.augmentFinal.infectedPercent).toBeGreaterThanOrEqual(0);
    });

    it('falls back to the full duration when no target HP is provided', () => {
        const noTarget = run({
            augments: ['Infected 6'],
            treeLevels
        }).steps;
        const longTarget = run({
            augments: ['Infected 6'],
            treeLevels,
            settings: { targetHealth: 1_000_000 }
        }).steps;

        expect(noTarget.augmentFinal.infectedPercent).toBe(longTarget.augmentFinal.infectedPercent);
    });
});

describe('Infected with simulated monster presets', () => {
    const treeLevels = { C: 1, R: 1, R1: 1, R1a: 5, R1b: 5, R2: 5, R2a: 3 };

    function infectedFor(monster) {
        return run({
            augments: ['Infected 6'],
            treeLevels,
            settings: {
                targetHealth: monster.health,
                targetDefense: monster.defense
            }
        }).steps.augmentFinal.infectedPercent;
    }

    it('Goblin gets fewer stacks than Void Storm', () => {
        const goblin = MONSTER_PRESETS.find(monster => monster.id === 'goblin');
        const voidStorm = MONSTER_PRESETS.find(monster => monster.id === 'void-storm');

        expect(infectedFor(goblin)).toBeLessThan(infectedFor(voidStorm));
    });
});

describe('first hit procs', () => {
    it('does not apply the blue orb debuff on the first hit', () => {
        const treeLevels = { C: 1, R: 1, R2: 5, R2a: 3 };
        const normal = run({ treeLevels }).steps;
        const first = run({ treeLevels, settings: { firstHit: true } }).steps;

        expect(normal.damageModifiers.blueDamageMultiplier).toBeGreaterThan(1);
        expect(first.damageModifiers.blueDamageMultiplier).toBe(1);
        expect(first.damageModifiers.blueDamagePercent).toBe(0);
        expect(first.damageModifiers.blueOrbs).toBe(0);
    });

    it("does not apply Nature's Bless on the first hit", () => {
        const build = makeBuild({
            weapon: makeArcaneWeapon({
                element: 'nature',
                'Nature Damage': '50%'
            }),
            augments: ["Nature's Bless 6"]
        });
        const { statsValues, skillValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);

        const normal = new DpsManager().recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings()
        });
        const first = new DpsManager().recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ firstHit: true })
        });

        expect(normal.augmentFinal.natureBlessFlat).toBe(20);
        expect(normal.augmentFinal.natureBlessMultiplier).toBeGreaterThan(1);
        expect(first.augmentFinal.natureBlessFlat).toBe(0);
        expect(first.augmentFinal.natureBlessMultiplier).toBe(1);
    });
});

describe('first hit optional effects', () => {
    it('keeps Focus stacks on the first hit', () => {
        const { steps } = run({
            treeLevels: { C: 1, L: 1, L1: 5, L1a: 5 },
            settings: { firstHit: true, focusStacks: 3 }
        });

        expect(steps.damageMultiplier.focusStacks).toBe(3);
        expect(steps.damageMultiplier.focusDamagePercent).toBeGreaterThan(0);
    });

    it('keeps Toxic Gas defense reduction on the first hit', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Sporeheart Orb', [{
            kind: 'ability',
            name: 'Toxic Gas',
            energy: 20,
            text: 'Poison enemies around you, lowering their Defense by 25%.',
            key: 'Right click'
        }]);

        const build = makeBuild({
            weapon: {
                name: 'Sporeheart Orb',
                stats: {
                    'Damage Type': 'Arcane',
                    'Default Attack': 100,
                    'Weapon Type': 'magic',
                    'Arcane Damage': 100,
                    'Ability 1': 'Toxic Gas'
                }
            }
        });

        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ firstHit: true })
        });

        expect(steps.damageMultiplier.damageTakenIncreasePercent).toBe(0);
        expect(steps.specialAttacks.defenseReductionPercent).toBe(25);
    });

    it('keeps Soil Infestation damage taken increase on the first hit', () => {
        const special = new SpecialAbilityManager();
        special.reset();
        special.registerAbilities('Gloomfang Mace', [{
            kind: 'ability',
            name: 'Soil Infestation',
            energy: 20,
            text: 'Enemies take +25% damage.',
            key: 'Right click'
        }]);

        const build = makeBuild({
            weapon: {
                name: 'Gloomfang Mace',
                stats: {
                    'Damage Type': 'Arcane',
                    'Default Attack': 100,
                    'Weapon Type': 'magic',
                    'Arcane Damage': 100,
                    'Ability 1': 'Soil Infestation'
                }
            }
        });

        const steps = new DpsManager({ specialAbilityManager: special }).recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({ firstHit: true })
        });

        expect(steps.damageMultiplier.damageTakenIncreasePercent).toBe(25);
    });
});
