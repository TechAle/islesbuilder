import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    BuildStore,
    selectStats,
    withBaseStats,
    ElixirManager,
    CLASS_SKILL_TREES,
    makeWorld
} from '../../helpers/legacyRuntime.js';

test('BuildStore stato iniziale', () => {
    const { equippedStore } = makeWorld();
    assert.equal(equippedStore.state.sharedPoints, 100);
    assert.equal(equippedStore.state.currentClass, 'archer');
    assert.equal(Object.keys(equippedStore.state.activeEquip).length, 12);
    assert.deepEqual(equippedStore.state.activeEquip.weapon.augments, ['', '']);
    assert.equal(equippedStore.state.treeLevels.archer.size, Object.keys(CLASS_SKILL_TREES.archer.nodes).length);
});

test('shared points: setSharedPoints aggiorna e clampa i punti', () => {
    const { equippedStore } = makeWorld();

    equippedStore.setSharedPoints(150);
    assert.equal(equippedStore.state.sharedPoints, 150);

    equippedStore.setSharedPoints(42.9);
    assert.equal(equippedStore.state.sharedPoints, 42);

    equippedStore.setSharedPoints(-5);
    assert.equal(equippedStore.state.sharedPoints, 0);
});

test('selectStats separa flat e percent da equip', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setEquipSlot('chestplate', {
        name: 'Chest',
        stats: { 'Base Defense': '100', 'Crit Chance': '10%', 'Level': 30, 'Augment Slots': 2 }
    });
    const { statsValues } = selectStats(dataStore.data, equippedStore.state);
    assert.deepEqual(statsValues['Base Defense'], { flat: 100, percent: 0 });
    assert.deepEqual(statsValues['Crit Chance'], { flat: 0, percent: 10 });
    assert.equal(statsValues['Level'], undefined);
    assert.equal(statsValues['Augment Slots'], undefined);
});

test('selectStats somma flat e percent sulla stessa stat', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setEquipSlot('ring1', { name: 'R1', stats: { 'Attack Damage': 10 } });
    equippedStore.setEquipSlot('ring2', { name: 'R2', stats: { 'Attack Damage': '5%' } });
    const { statsValues } = selectStats(dataStore.data, equippedStore.state);
    assert.deepEqual(statsValues['Attack Damage'], { flat: 10, percent: 5 });
});

test('selectStats applica elisir con perLevel e percent', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        elixirsConfig: [{ id: 'hp', name: 'HP Elixir', stat: 'Max Health', val: 3, perLevel: 10, percent: false }]
    }, 'elixirs');
    equippedStore.syncElixirs(dataStore.data.elixirsConfig);
    equippedStore.setElixirValue(0, 2);
    const { statsValues } = selectStats(dataStore.data, equippedStore.state);
    assert.deepEqual(statsValues['Max Health'], { flat: 20, percent: 0 });
});

test('setAll porta tutti gli elisir al massimo o a zero', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        elixirsConfig: [
            { id: 'hp', name: 'HP Elixir', stat: 'Max Health', val: 0, perLevel: 10, percent: false },
            { id: 'atk', name: 'Atk Elixir', stat: 'Attack Damage', val: 0, perLevel: 2, percent: true }
        ]
    }, 'elixirs');
    equippedStore.syncElixirs(dataStore.data.elixirsConfig);
    const manager = new ElixirManager({ equippedStore });

    let notifications = 0;
    equippedStore.subscribe('elixirs', () => notifications++);

    manager.setAll(5);
    assert.deepEqual(equippedStore.state.elixirs.map(e => e.val), [5, 5]);
    assert.equal(notifications, 1);

    manager.setAll(0);
    assert.deepEqual(equippedStore.state.elixirs.map(e => e.val), [0, 0]);
    assert.equal(notifications, 2);

    manager.setAll(99);
    assert.deepEqual(equippedStore.state.elixirs.map(e => e.val), [5, 5]);

    manager.setAll(-4);
    assert.deepEqual(equippedStore.state.elixirs.map(e => e.val), [0, 0]);
});

test('selectStats applica skill dirette e valori skill', () => {
    const { dataStore, equippedStore } = makeWorld();
    const levels = new Map(equippedStore.state.treeLevels.archer);
    levels.set('C', 2);   // +10% Ranged Damage (5 + 5)
    levels.set('UL', 1);  // 1 Calculated Strike (non diretta)
    equippedStore.applySkillLevels('archer', levels, 90);
    const { statsValues, skillValues } = selectStats(dataStore.data, equippedStore.state);
    assert.deepEqual(statsValues['Ranged Damage'], { flat: 0, percent: 10 });
    assert.equal(skillValues.archer['Calculated Strike'], 1);
});

test('selectStats non muta lo stato', () => {
    const { dataStore, equippedStore } = makeWorld();
    const before = JSON.stringify({
        equip: equippedStore.state.activeEquip,
        levels: [...equippedStore.state.treeLevels.archer.entries()]
    });
    selectStats(dataStore.data, equippedStore.state);
    const after = JSON.stringify({
        equip: equippedStore.state.activeEquip,
        levels: [...equippedStore.state.treeLevels.archer.entries()]
    });
    assert.equal(before, after);
});

test('withBaseStats aggiunge Elemental Power 100 e Crit Damage 50%', () => {
    const display = withBaseStats({});
    assert.deepEqual(display['Elemental Power'], { flat: 100, percent: 0 });
    assert.deepEqual(display['Crit Damage'], { flat: 0, percent: 50 });
});

test('withBaseStats somma le basi ai contributi esistenti senza mutare l originale', () => {
    const statsValues = {
        'Elemental Power': { flat: 98.3, percent: 25.6 },
        'Crit Damage': { flat: 0, percent: 60.9 }
    };

    const display = withBaseStats(statsValues);

    assert.deepEqual(display['Elemental Power'], { flat: 198.3, percent: 25.6 });
    assert.deepEqual(display['Crit Damage'], { flat: 0, percent: 110.9 });
    assert.deepEqual(statsValues['Elemental Power'], { flat: 98.3, percent: 25.6 });
    assert.deepEqual(statsValues['Crit Damage'], { flat: 0, percent: 60.9 });
});
