import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    DpsManager,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';

test('attack speed: Attack Cooldown riduce l intervallo', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Cooldown': { flat: 0, percent: -25 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.ok(Math.abs(steps.attackSpeed.attackInterval - 0.45) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.dps - 20 / 0.45) < 1e-9);
});

test('attack speed: energia e max energy con pozione sostenibile', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Energy Regen': { flat: 5, percent: 10 },
            'Max Energy': { flat: 50, percent: 20 },
            'Attack Energy': { flat: 10, percent: 0 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.ok(Math.abs(steps.attackSpeed.energyRegen - 16.5) < 1e-9);
    assert.equal(steps.attackSpeed.maxEnergy, 180);
    assert.equal(steps.attackSpeed.attackEnergyCost, 10);
    assert.ok(Math.abs(steps.attackSpeed.energyPerSecond - (16.5 - 10 / 0.6)) < 1e-9);
    assert.ok(steps.attackSpeed.secondsToEmpty > 120);
    assert.equal(steps.attackSpeed.sustain, false);
    assert.equal(steps.attackSpeed.potionSustainable, true);
    const sustainRow = manager.getStepGroups()[3].results.find(r => r.label === 'Sustain');
    assert.match(sustainRow.value, /^Yes but pot every .*s$/);
});

test('attack speed: energia insufficiente e sustain false', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 30, percent: 0 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.ok(Math.abs(steps.attackSpeed.energyPerSecond - (10 - 30 / 0.6)) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.secondsToEmpty - 100 / 40) < 1e-9);
    assert.equal(steps.attackSpeed.sustain, false);
    assert.ok(Math.abs(steps.attackSpeed.potionInterval - 0.625) < 1e-9);
    assert.equal(steps.attackSpeed.potionSustainable, false);
    const sustainRow = manager.getStepGroups()[3].results.find(r => r.label === 'Sustain');
    assert.equal(sustainRow.value, 'No');
});

test('attack speed: pozione ogni X secondi quando il deficit è sostenibile', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 10, percent: 0 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    const deficit = 10 / 0.6 - 10;
    assert.ok(Math.abs(steps.attackSpeed.potionInterval - 25 / deficit) < 1e-9);
    assert.equal(steps.attackSpeed.potionSustainable, true);
    const sustainRow = manager.getStepGroups()[3].results.find(r => r.label === 'Sustain');
    assert.equal(sustainRow.value, 'Yes but pot every 3,75s');
});

test('attack speed: nessuna pozione necessaria quando il sustain è attivo', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 5, percent: 0 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.attackSpeed.sustain, true);
    const rows = manager.getStepGroups()[3].results;
    const sustainRow = rows.find(r => r.label === 'Sustain');
    assert.equal(sustainRow.value, 'Yes');
    assert.ok(!rows.some(r => r.label === 'Drink Potion Every'));
});

test('attack speed: Attack Costs riduce il costo per attacco', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 10, percent: 0 },
            'Attack Costs': { flat: 0, percent: -50 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.attackSpeed.attackEnergyCost, 5);
    assert.equal(steps.attackSpeed.sustain, true);
});

test('slow attack: sovrascrive l intervallo di attacco', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 }),
        settings: { slowAttack: true, attackInterval: 1.2, useBurst: false }
    });

    assert.equal(steps.attackSpeed.attackInterval, 1.2);
    assert.ok(Math.abs(steps.attackSpeed.attacksPerSecond - 1 / 1.2) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.dps - 20 / 1.2) < 1e-9);
});

test('slow attack: senza override usa 0.6s', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 }),
        settings: { slowAttack: false, attackInterval: 1.2, useBurst: false }
    });

    assert.equal(steps.attackSpeed.attackInterval, 0.6);
});

test('attack speed: Energy Consumption della classe si somma ad Attack Costs', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 20, percent: 0 },
            'Attack Costs': { flat: 0, percent: -50 },
            'Magic Energy Consumption': { flat: 0, percent: -20 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic'
        })
    });

    assert.ok(Math.abs(steps.attackSpeed.attackEnergyCost - 6) < 1e-9);
});

test('attack speed: usa il consumo della classe arma corretta', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Slash Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 20, percent: 0 },
            'Magic Energy Consumption': { flat: 0, percent: -80 },
            'Melee Energy Consumption': { flat: 0, percent: -10 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Slash',
            'Default Attack': 100,
            'Weapon Type': 'melee'
        })
    });

    assert.equal(steps.attackSpeed.attackEnergyCost, 18);
});
