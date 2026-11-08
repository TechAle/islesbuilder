import { beforeAll, describe, expect, it } from 'vitest';
import { DpsManager } from '../../../js/modules/dpsManager.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { registerAugments } from '../../../js/modules/augmentManager.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
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

    it('does not reach max stacks on Goblin', () => {
        const goblin = MONSTER_PRESETS.find(monster => monster.id === 'goblin');
        const infected = infectedFor(goblin);

        expect(infected).toBeGreaterThanOrEqual(0);
        expect(infected).toBeLessThan(45);
    });

    it('reaches max stacks on Void Storm', () => {
        const voidStorm = MONSTER_PRESETS.find(monster => monster.id === 'void-storm');
        const infected = infectedFor(voidStorm);

        expect(infected).toBe(45);
    });

    it('Goblin gets fewer stacks than Void Storm', () => {
        const goblin = MONSTER_PRESETS.find(monster => monster.id === 'goblin');
        const voidStorm = MONSTER_PRESETS.find(monster => monster.id === 'void-storm');

        expect(infectedFor(goblin)).toBeLessThan(infectedFor(voidStorm));
    });
});
