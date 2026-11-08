import { beforeAll, describe, expect, it } from 'vitest';
import { ApiManager } from '../../js/modules/apiManager.js';
import { SpecialAbilityManager } from '../../js/modules/specialAbilityManager.js';
import { DataStore } from '../../js/store/dataStore.js';
import { selectStats } from '../../js/store/selectors.js';
import { DpsManager } from '../../js/modules/dpsManager.js';
import { registerAugments } from '../../js/modules/augmentManager.js';
import { ITEM_DATABASE } from '../../js/data/items.js';
import { AUGMENT_DATABASE } from '../../js/data/augments.js';
import { INITIAL_ELIXIRS } from '../../js/data/elixirs.js';
import { CLASS_SKILL_TREES } from '../../js/data/skillTrees.js';
import { AUGMENT_API_FIXTURE } from '../fixtures/augments.js';
import { ITEMS_API_FIXTURE } from '../fixtures/items.js';
import { makeBuild, makeSettings } from '../helpers/build.js';

beforeAll(() => {
    registerAugments(AUGMENT_API_FIXTURE);
});

function makeTempestBuild({ augments = ['Hunter 6', 'Infected 6'], treeLevels = {} } = {}) {
    const special = new SpecialAbilityManager();
    special.reset();

    const raw = ITEMS_API_FIXTURE.weapons.find(item => item.name === 'Tempest');
    const api = new ApiManager({
        dataStore: new DataStore({
            items: ITEM_DATABASE,
            augments: AUGMENT_DATABASE,
            elixirsConfig: INITIAL_ELIXIRS,
            skillTrees: CLASS_SKILL_TREES
        }),
        specialAbilityManager: special
    });

    special.registerAbilities('Tempest', raw.gear.abilities);
    const tempestStats = api.formatGearStats(raw.gear, 'weapon', raw.tooltipJson, 'Tempest');

    return {
        build: makeBuild({
            weapon: { name: 'Tempest', stats: tempestStats },
            core: { name: 'Mage Core', stats: { 'Arcane Damage': '20%' } },
            augments,
            treeLevels
        }),
        special
    };
}

describe('full mage build', () => {
    it('calculates a deterministic Tempest + Mage Core build', () => {
        const { build, special } = makeTempestBuild({
            treeLevels: {
                C: 3,
                DR: 1,
                DR1: 5,
                R: 1,
                R1: 3,
                R1a: 5,
                R1b: 5,
                R2: 2,
                R2a: 3
            }
        });

        const { statsValues, skillValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
        const manager = new DpsManager({ specialAbilityManager: special });
        const steps = manager.recalculate({
            statsValues,
            skillValues,
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: makeSettings({
                useBurst: true,
                griefUptime: 0,
                lastSorrowUptime: 0,
                focusStacks: 0,
                potentialChargeKills: 0,
                deathburstKillsPerSecond: 0,
                executionHpPercent: 50,
                prosecutionHpPercent: 50,
                enragedHpPercent: 50
            })
        });

        expect(steps.baseDamage.baseDamage).toBeCloseTo(39.95, 10);
        expect(steps.damageModifiers.damage).toBeCloseTo(61.030017, 8);
        expect(steps.damageMultiplier.damage).toBeCloseTo(88.49352465, 8);
        expect(steps.criticalDamage.damage).toBeCloseTo(93.803136129, 8);
        expect(steps.augmentFinal.damage).toBeCloseTo(206.366899484, 8);
        expect(manager.getDps()).toBeCloseTo(2143.928294401, 6);

        const breakdown = manager.getDamageBreakdown();
        expect(breakdown.total).toBeCloseTo(manager.getDps(), 10);
        expect(breakdown.sources.reduce((sum, source) => sum + source.percent, 0)).toBeCloseTo(100, 10);

        const labels = manager.getDpsParts().map(part => part.label);
        expect(labels).toEqual([
            'Attack',
            'Smite-Tempest',
            'Burst',
            'Whirlwind',
            'Crystal Combustion',
            'Support Orbs'
        ]);
    });

    it('changes DPS when the augment set changes', () => {
        const base = makeTempestBuild({
            augments: [],
            treeLevels: { C: 3, DR: 1, DR1: 5 }
        });
        const boosted = makeTempestBuild({
            augments: ['Hunter 6', 'Infected 6'],
            treeLevels: { C: 3, DR: 1, DR1: 5 }
        });

        function total({ build, special }) {
            const { statsValues, skillValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
            const manager = new DpsManager({ specialAbilityManager: special });
            manager.recalculate({
                statsValues,
                skillValues,
                build,
                skillTrees: CLASS_SKILL_TREES,
                settings: makeSettings()
            });
            return manager.getDps();
        }

        expect(total(boosted)).toBeGreaterThan(total(base));
    });
});
