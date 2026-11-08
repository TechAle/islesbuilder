import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    SkillTreeManager,
    ShareManager,
    makeWorld
} from '../../helpers/legacyRuntime.js';

test('share round-trip conserva equip, elisir, skill e classe', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        elixirsConfig: [{ id: 'hp', name: 'HP Elixir', stat: 'Max Health', val: 0, perLevel: 10, percent: false }]
    }, 'elixirs');
    equippedStore.syncElixirs(dataStore.data.elixirsConfig);

    const manager = new SkillTreeManager({ dataStore, equippedStore });
    const share = new ShareManager({
        dataStore,
        equippedStore,
        location: { origin: 'https://example.com', pathname: '/app' }
    });

    equippedStore.setEquipSlot('weapon', { name: 'Bow', stats: { 'Attack Damage': 12 } });
    equippedStore.setElixirValue(0, 2);
    manager.handleNodeClick('C', { shiftKey: false });
    manager.handleNodeClick('C', { shiftKey: false });
    equippedStore.setCurrentClass('warrior');

    const url = share.createShareUrl();
    assert.ok(url.startsWith('https://example.com/app#'));

    const hash = share.extractHash(url);
    assert.ok(hash);

    const fresh = makeWorld();
    fresh.dataStore.updateData({
        elixirsConfig: [{ id: 'hp', name: 'HP Elixir', stat: 'Max Health', val: 0, perLevel: 10, percent: false }]
    }, 'elixirs');
    fresh.equippedStore.syncElixirs(fresh.dataStore.data.elixirsConfig);

    const share2 = new ShareManager({
        dataStore: fresh.dataStore,
        equippedStore: fresh.equippedStore,
        location: { origin: 'https://example.com', pathname: '/app' }
    });
    assert.equal(share2.loadFromHash(hash), true);

    assert.equal(fresh.equippedStore.state.activeEquip.weapon.name, 'Bow');
    assert.equal(fresh.equippedStore.state.activeEquip.weapon.stats['Attack Damage'], 12);
    assert.equal(fresh.equippedStore.state.treeLevels.archer.get('C'), 2);
    assert.equal(fresh.equippedStore.state.currentClass, 'warrior');
    assert.equal(fresh.equippedStore.state.elixirs[0].val, 2);
});

test('share accetta hash grezzo senza #', () => {
    const { dataStore, equippedStore } = makeWorld();
    const share = new ShareManager({
        dataStore,
        equippedStore,
        location: { origin: 'https://example.com', pathname: '/' }
    });
    equippedStore.setEquipSlot('weapon', { name: 'Sword', stats: {} });
    const hash = share.createShareUrl().split('#')[1];
    assert.equal(share.loadFromHash(hash), true);
});

test('share con slot mancanti non corrompe lo stato', () => {
    const { dataStore, equippedStore } = makeWorld();
    const share = new ShareManager({
        dataStore,
        equippedStore,
        location: { origin: 'https://example.com', pathname: '/' }
    });
    const payload = {
        equip: { weapon: { name: 'Partial Bow', stats: { 'Attack Damage': 5 }, augments: ['', '', ''] } },
        elixirs: [],
        treeLevels: {},
        currentClass: 'archer',
        sharedPoints: 100
    };
    const hash = btoa(encodeURIComponent(JSON.stringify(payload)));
    assert.equal(share.loadFromHash(hash), true);
    assert.equal(equippedStore.state.activeEquip.weapon.name, 'Partial Bow');
    assert.equal(Object.keys(equippedStore.state.activeEquip).length, 12);
    assert.equal(equippedStore.state.activeEquip.helmet.name, '');
    assert.deepEqual(equippedStore.state.activeEquip.helmet.augments, ['', '']);
});

test('share con slot sconosciuti li ignora', () => {
    const { dataStore, equippedStore } = makeWorld();
    const share = new ShareManager({
        dataStore,
        equippedStore,
        location: { origin: 'https://example.com', pathname: '/' }
    });
    const payload = {
        equip: { unknownSlot: { name: 'X', stats: {} } },
        elixirs: [],
        treeLevels: {},
        currentClass: 'archer',
        sharedPoints: 100
    };
    const hash = btoa(encodeURIComponent(JSON.stringify(payload)));
    assert.equal(share.loadFromHash(hash), true);
    assert.equal(equippedStore.state.activeEquip.unknownSlot, undefined);
    assert.equal(Object.keys(equippedStore.state.activeEquip).length, 12);
});

test('share load da evento all e hash non valido ritorna false', () => {
    const { dataStore, equippedStore } = makeWorld();
    const share = new ShareManager({
        dataStore,
        equippedStore,
        location: { origin: 'https://example.com', pathname: '/' }
    });
    let allFired = 0;
    equippedStore.subscribe('all', () => allFired++);
    const hash = share.createShareUrl().split('#')[1];
    share.loadFromHash(hash);
    assert.equal(allFired, 1);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    assert.equal(share.loadFromHash('@@non-valido@@'), false);
    errorSpy.mockRestore();
});

test('share ripristina stats preset unendole a quelle salvate', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        items: { ...dataStore.data.items, weapon: [{ name: 'Known Bow', stats: { 'Attack Damage': 20, 'Crit Chance': '5%' } }] }
    }, 'items');
    const share = new ShareManager({
        dataStore,
        equippedStore,
        location: { origin: 'https://example.com', pathname: '/' }
    });
    const payload = {
        equip: { weapon: { name: 'Known Bow', stats: { 'Attack Damage': 30 }, augments: ['', '', ''] } },
        elixirs: [],
        treeLevels: {},
        currentClass: 'archer',
        sharedPoints: 100
    };
    const hash = btoa(encodeURIComponent(JSON.stringify(payload)));
    assert.equal(share.loadFromHash(hash), true);
    assert.equal(equippedStore.state.activeEquip.weapon.stats['Attack Damage'], 30);
    assert.equal(equippedStore.state.activeEquip.weapon.stats['Crit Chance'], '5%');
});
