import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    selectStats,
    DpsManager,
    makeWorld,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';

test('damage modifiers: somma tipo, classe arma ed elemento (case-insensitive)', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 30 },
            'Magic Damage': { flat: 0, percent: 10 },
            'thunder damage': { flat: 0, percent: 15 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            element: 'thunder'
        })
    });

    assert.equal(steps.damageModifiers.percent, 30);
    assert.equal(steps.damageModifiers.masteryPercent, 10);
    assert.ok(Math.abs(steps.damageModifiers.masteryBonus - 2.99) < 1e-9);
    assert.equal(steps.damageModifiers.elementalPower, 100);
    assert.equal(steps.damageModifiers.elementalDamagePercent, 15);
    assert.ok(Math.abs(steps.damageModifiers.effectiveElementalPercent - 15) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 32.89) < 1e-9);
    assert.deepEqual(
        manager.getResults().slice(0, 8).map(r => r.label),
        ['Base Damage', 'Damage Modifiers', 'Elemental Power', 'Magic Mastery', 'Magic Mastery Damage', 'Damage', 'Critical Hit', 'Average Damage']
    );
});

test('damage modifiers: senza Weapon Type o element non aggiunge righe vuote', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 30 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.deepEqual(steps.damageModifiers.modifiers.map(m => m.label), ['Arcane Damage']);
});

test('damage modifiers: include le percentuali degli elisir', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        elixirsConfig: [
            { id: 'arcanum', name: 'Arcanum Elixir', stat: 'Arcane Damage', val: 0, perLevel: 2, percent: true }
        ]
    }, 'elixirs');
    equippedStore.syncElixirs(dataStore.data.elixirsConfig);
    equippedStore.setAllElixirValues(5);
    equippedStore.setEquipSlot('weapon', {
        name: 'Bronze Staff',
        stats: {
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            element: 'thunder',
            'Arcane Damage': 20
        }
    });

    const { statsValues, skillValues } = selectStats(dataStore.data, equippedStore.state);

    const manager = new DpsManager();
    const steps = manager.recalculate({ statsValues, skillValues, build: equippedStore.state });

    assert.equal(steps.damageModifiers.percent, 10);
    assert.equal(steps.damageModifiers.damage, 22);
});

test('elemental power: percentuale senza flat non aggiunge nulla', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Elemental Power': { flat: 0, percent: 50 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.ok(Math.abs(steps.damageModifiers.elementalPower - 150) < 1e-9);
    assert.equal(steps.damageModifiers.damage, 20);
    assert.ok(!manager.getResults().some(r => r.label === 'Elemental Power'));
});

test('elemental channeling: resta attivo anche cambiando schermata', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.state.treeLevels.mage.set('DR', 5);
    equippedStore.setEquipSlot('weapon', {
        name: 'Test Weapon',
        stats: {
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            element: 'nature',
            'Arcane Damage': 20
        }
    });

    const { statsValues, skillValues } = selectStats(dataStore.data, equippedStore.state);
    assert.equal(skillValues.mage['Elemental channeling'], 12.5);

    const steps = new DpsManager().recalculate({
        statsValues,
        skillValues,
        build: equippedStore.state,
        skillTrees: dataStore.data.skillTrees
    });

    assert.equal(steps.damageModifiers.elementalDamagePercent, 12.5);
    assert.ok(Math.abs(steps.damageModifiers.damage - 22.5) < 1e-9);
});

test('damage modifiers: il mastery aumenta il danno della sua percentuale', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 50, percent: 100 },
            'Magic Damage': { flat: 0, percent: 10 },
            'Nature Damage': { flat: 0, percent: 50 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            element: 'nature'
        })
    });

    // 50 × 2 × 1.5 = 150; +10% mastery = 165
    assert.ok(Math.abs(steps.damageModifiers.masteryBonus - 15) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 165) < 1e-9);
});

test('damage modifiers: il mastery applica la percentuale al danno finale', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Magic Damage': { flat: 0, percent: 50 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 85,
            'Weapon Type': 'magic'
        })
    });

    assert.ok(Math.abs(steps.baseDamage.baseDamage - 40.46) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.masteryBonus - 20.23) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 60.69) < 1e-9);
});

test('getStepGroups raggruppa i risultati per step', () => {
    const manager = new DpsManager();
    manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Chance': { flat: 0, percent: 30 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    const groups = manager.getStepGroups();
    assert.deepEqual(groups.map(g => g.id), ['baseDamage', 'damageModifiers', 'criticalDamage', 'attackSpeed']);
    assert.deepEqual(groups.map(g => g.label), ['Base Damage', 'Damage Modifiers', 'Critical Damage', 'Attack Speed & Energy']);
    assert.deepEqual(groups[0].results.map(r => r.label), ['Base Damage']);
    assert.deepEqual(groups[1].results.map(r => r.label), ['Damage Modifiers', 'Damage']);
    assert.deepEqual(groups[2].results.map(r => r.label), ['Critical Hit', 'Average Damage']);
    assert.deepEqual(groups[3].results.map(r => r.label), [
        'Attack Interval', 'Attacks per Second', 'DPS', 'DPS (all)',
        'Energy Regen', 'Energy per Second', 'Sustain', 'Time to 0 Energy'
    ]);
});

test('attack speed: mostra First Hit con il danno di un singolo colpo', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic'
        })
    });

    steps.attackSpeed.firstHitDamage = 123.45;

    const group = manager.getStepGroups().find(entry => entry.id === 'attackSpeed');
    const row = group.results.find(entry => entry.label === 'First Hit');

    assert.ok(row);
    assert.equal(row.value, 123.45);
    assert.ok(row.help.includes('passive'));
});
