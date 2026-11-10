import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiManager } from '../../../js/modules/apiManager.js';
import { DataStore } from '../../../js/store/dataStore.js';
import { SpecialAbilityManager } from '../../../js/modules/specialAbilityManager.js';
import { ITEM_DATABASE } from '../../../js/data/items.js';
import { AUGMENT_DATABASE } from '../../../js/data/augments.js';
import { INITIAL_ELIXIRS } from '../../../js/data/elixirs.js';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { AUGMENT_API_FIXTURE } from '../../fixtures/augments.js';
import { ELIXIR_API_FIXTURE } from '../../fixtures/elixirs.js';
import { ITEMS_API_FIXTURE } from '../../fixtures/items.js';

function makeDataStore() {
    return new DataStore({
        items: structuredClone(ITEM_DATABASE),
        augments: structuredClone(AUGMENT_DATABASE),
        elixirsConfig: structuredClone(INITIAL_ELIXIRS),
        skillTrees: structuredClone(CLASS_SKILL_TREES)
    });
}

function makeManager(dataStore = makeDataStore(), specialAbilityManager = new SpecialAbilityManager()) {
    const manager = new ApiManager({ dataStore, specialAbilityManager });
    return { manager, dataStore, specialAbilityManager };
}

function jsonResponse(data) {
    return {
        ok: true,
        json: async () => ({ data })
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('ApiManager.formatGearStats', () => {
    it('parses flat, percent, weapon and ability fields from dummy gear', () => {
        const { manager } = makeManager();
        const stats = manager.formatGearStats({
            slot: 'Sword',
            damageType: 'Slash',
            defaultAttack: 125,
            normalAttack: { min: 10, max: 12 },
            attackEnergy: 8,
            augmentSlots: 3,
            level: 21,
            stats: [
                { stat: 'Slash Damage', percent: false, max: 40 },
                { stat: 'Crit Chance', percent: true, max: 9 }
            ],
            abilities: [
                { name: 'Dummy Slash', text: 'Deal 100% damage' }
            ]
        }, 'weapon', null, 'Dummy Sword');

        expect(stats['Slash Damage']).toBe(40);
        expect(stats['Crit Chance']).toBe('9%');
        expect(stats['Default Attack']).toBe(125);
        expect(stats['Normal Attack']).toBe(12);
        expect(stats['Attack Energy']).toBe(8);
        expect(stats['Damage Type']).toBe('Slash');
        expect(stats['Weapon Type']).toBe('melee');
        expect(stats['Augment Slots']).toBe(3);
        expect(stats.Level).toBe(21);
        expect(stats['Ability 1']).toBe('Dummy Slash');
    });

    it('keeps flat and percent entries with the same stat name separate', () => {
        const { manager } = makeManager();
        const stats = manager.formatGearStats({
            damageType: 'Blunt',
            defaultAttack: 175,
            slot: 'Hammer',
            stats: [
                { stat: 'Blunt Damage', percent: false, max: 42.1 },
                { stat: 'Blunt Damage', percent: true, max: 18 }
            ]
        }, 'weapon', null, 'Dummy Hammer');

        expect(stats['Blunt Damage']).toBe(42.1);
        expect(stats['Blunt Damage%']).toBe('18%');
    });

    it('sums duplicate flat entries and duplicate percent entries', () => {
        const { manager } = makeManager();
        const stats = manager.formatGearStats({
            stats: [
                { stat: 'HP', percent: false, max: 10 },
                { stat: 'HP', percent: false, max: 15 },
                { stat: 'Crit Chance', percent: true, max: 5 },
                { stat: 'Crit Chance', percent: true, max: 7 }
            ]
        }, 'armor', null, 'Dummy Armor');

        expect(stats.HP).toBe(25);
        expect(stats['Crit Chance']).toBe('12%');
    });
});

describe('special ability parsing', () => {
    it('parses an ability without override', () => {
        const manager = new SpecialAbilityManager();
        const ability = manager.parseAbility('Dummy Weapon', {
            kind: 'ability',
            name: 'Dummy Strike',
            energy: 10,
            text: 'Deal 80% damage',
            key: 'Right click'
        });

        expect(ability.ability).toBe('Dummy Strike');
        expect(ability.damage).toBe(80);
        expect(ability.energy).toBe(10);
        expect(ability.key).toBe('rightClick');
        expect(ability.times).toBe(1);
    });

    it('applies the Tempest Whirlwind override', () => {
        const manager = new SpecialAbilityManager();
        const ability = manager.parseAbility('Tempest', {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        });

        expect(ability.name).toBe('Whirlwind-Tempest');
        expect(ability.ability).toBe('Whirlwind');
        expect(ability.times).toBe(1);
        expect(ability.damage).toBe(135);
    });

    it('applies the Tempest Smite passive override', () => {
        const manager = new SpecialAbilityManager();
        const ability = manager.parseAbility('Tempest', {
            kind: 'passive',
            name: 'Smite',
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.'
        });

        expect(ability.name).toBe('Smite-Tempest');
        expect(ability.kind).toBe('passive');
        expect(ability.everyHits).toBe(5);
        expect(ability.damage).toBe(150);
    });
});

describe('ApiManager fetch retry', () => {
    it('retries once before failing', async () => {
        const { manager } = makeManager();
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
        vi.stubGlobal('fetch', fetchMock);

        await expect(manager.fetchJson('/broken')).rejects.toThrow('network down');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('unwraps the data field on success', async () => {
        const { manager } = makeManager();
        vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([{ id: 1 }])));

        await expect(manager.fetchJson('/ok')).resolves.toEqual([{ id: 1 }]);
    });
});

describe('ApiManager updates with mocked fetch', () => {
    it('updates weapons, armor and accessories from the item endpoints', async () => {
        const { manager, dataStore, specialAbilityManager } = makeManager();
        vi.stubGlobal('fetch', vi.fn(async url => {
            if (url.includes('category=weapons')) return jsonResponse(ITEMS_API_FIXTURE.weapons);
            if (url.includes('category=armor')) return jsonResponse(ITEMS_API_FIXTURE.armor);
            if (url.includes('category=accessories')) return jsonResponse(ITEMS_API_FIXTURE.accessories);
            throw new Error(`Unexpected URL: ${url}`);
        }));

        await manager.updateItems();

        expect(dataStore.data.items.weapon.some(item => item.name === 'Tempest')).toBe(true);
        expect(dataStore.data.items.helmet.some(item => item.name === 'Royal Tiara')).toBe(true);
        expect(dataStore.data.items.ring.some(item => item.name === 'Abyssal Ring')).toBe(true);

        const tempest = dataStore.data.items.weapon.find(item => item.name === 'Tempest');
        expect(tempest.stats['Damage Type']).toBe('Arcane');
        expect(tempest.stats.element).toBe('nature');
        expect(specialAbilityManager.parseAbility('Tempest', {
            kind: 'ability',
            name: 'Whirlwind',
            text: 'Deal 45% damage'
        }).name).toBe('Whirlwind-Tempest');
    });

    it('prefers concrete weapon instances over same-name range templates', async () => {
        const { manager, dataStore } = makeManager();
        vi.stubGlobal('fetch', vi.fn(async url => {
            if (url.includes('category=weapons')) return jsonResponse(ITEMS_API_FIXTURE.weapons);
            if (url.includes('category=armor')) return jsonResponse([]);
            if (url.includes('category=accessories')) return jsonResponse([]);
            throw new Error(`Unexpected URL: ${url}`);
        }));

        await manager.updateItems();

        const drizzlers = dataStore.data.items.weapon.filter(item => item.name === 'The Drizzler');
        expect(drizzlers).toHaveLength(1);
        expect(drizzlers[0].stats['Arcane Damage']).toBe(46.2);
        expect(drizzlers[0].stats['Normal Attack']).toBe(69.3);
    });

    it('updates augments and every registered augment has six levels', async () => {
        const { manager, dataStore } = makeManager();
        vi.stubGlobal('fetch', vi.fn(async url => {
            if (url.includes('/augments')) return jsonResponse(AUGMENT_API_FIXTURE);
            throw new Error(`Unexpected URL: ${url}`);
        }));

        await manager.updateAugments();

        expect(dataStore.data.augments.length).toBeGreaterThan(0);
        const usableAugments = dataStore.data.augments.filter(augment => augment.levels.length > 0);
        expect(usableAugments.length).toBeGreaterThan(0);
        for (const augment of usableAugments) {
            expect(augment.levels, augment.name).toHaveLength(6);
        }
        const backstab = dataStore.data.augments.find(augment => augment.name === 'Backstab');
        expect(backstab.levels).toEqual([]);
    });

    it('updates elixirs from the elixir endpoint', async () => {
        const { manager, dataStore } = makeManager();
        vi.stubGlobal('fetch', vi.fn(async url => {
            if (url.includes('/elixirs')) return jsonResponse(ELIXIR_API_FIXTURE);
            throw new Error(`Unexpected URL: ${url}`);
        }));

        await manager.updateElixirs();

        expect(dataStore.data.elixirsConfig.length).toBe(ELIXIR_API_FIXTURE.length);
        expect(dataStore.data.elixirsConfig[0]).toHaveProperty('stat');
        expect(dataStore.data.elixirsConfig[0]).toHaveProperty('perLevel');
    });
});
