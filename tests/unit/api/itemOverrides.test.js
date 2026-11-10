import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    DpsManager,
    ApiManager,
    applyItemOverride,
    ITEM_OVERRIDES,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';

test('override oggetto: sovrascrive i valori e mantiene gli altri', () => {
    const stats = applyItemOverride('tempest', {
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        element: 'nature'
    }, {
        Tempest: { element: 'thunder', 'Thunder Damage': '10%' }
    });

    assert.deepEqual(stats, {
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        element: 'thunder',
        'Thunder Damage': '10%'
    });
});

test('override oggetto: nome non presente resta invariato', () => {
    const stats = { 'Default Attack': 100 };
    const result = applyItemOverride('Bronze Staff', stats, { Tempest: { element: 'thunder' } });
    assert.equal(result, stats);
});

test('override oggetto: ApiManager applica gli override a Tempest', () => {
    const manager = new ApiManager({ dataStore: {} });
    const stats = manager.formatGearStats({
        damageType: 'Arcane',
        defaultAttack: 85,
        normalAttack: { max: 39.95 },
        slot: 'Sword',
        stats: [{ stat: 'Arcane Damage', max: 47, percent: false }]
    }, 'weapon', null, 'Tempest');

    assert.equal(stats['Default Attack'], 85);
    assert.equal(stats['Arcane Damage'], 47);
    assert.equal(stats['Weapon Type'], 'melee');
    assert.equal(stats.element, ITEM_OVERRIDES.Tempest.element);
    Object.entries(ITEM_OVERRIDES.Tempest).forEach(([key, value]) => {
        assert.equal(stats[key], value);
    });
});

test('override oggetto: Tempest produce un modificatore Thunder', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47, percent: 0 },
            'Thunder Damage': { flat: 0, percent: 10 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 85,
            'Weapon Type': 'melee',
            element: 'thunder'
        })
    });

    assert.ok(Math.abs(steps.baseDamage.baseDamage - 39.95) < 1e-9);
    assert.equal(steps.damageModifiers.percent, 0);
    assert.equal(steps.damageModifiers.elementalDamagePercent, 10);
    assert.ok(Math.abs(steps.damageModifiers.effectiveElementalPercent - 10) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 43.945) < 1e-9);
});

test('ApiManager classifica Royal Blowpipe come arma ranged', () => {
    const manager = new ApiManager({ dataStore: {} });
    const stats = manager.formatGearStats({
        damageType: 'Heavy',
        defaultAttack: 200,
        slot: 'Blowpipe',
        stats: [
            { stat: 'Heavy Damage', max: 45.3, percent: false },
            { stat: 'Crit Damage', max: 15, percent: true },
            { stat: 'Crit Chance', max: 9, percent: true }
        ]
    }, 'weapon', null, 'Royal Blowpipe');

    assert.equal(stats['Weapon Type'], 'ranged');
    assert.equal(stats['Damage Type'], 'Heavy');
    assert.equal(stats['Heavy Damage'], 45.3);
    assert.equal(stats.element, 'thunder');
});

test('override oggetto: Blackrib aggiunge 5% Thunder Damage', () => {
    const stats = applyItemOverride('Blackrib Helmet', {
        'Heavy Damage': '9.8%'
    }, ITEM_OVERRIDES);

    assert.equal(stats['Thunder Damage'], '5%');
    assert.equal(stats['Heavy Damage'], '9.8%');
});

test('override oggetto: Pirate hat usa i valori massimi aggiornati', () => {
    const stats = applyItemOverride('Pirate hat', {
        'Blunt Damage': '8%',
        'Heavy Damage': '8.8%',
        'Crit Damage': '19.4%',
        'Crit Chance': '11.7%'
    }, ITEM_OVERRIDES);

    assert.equal(stats['Blunt Damage'], '9.78%');
    assert.equal(stats['Heavy Damage'], '9.83%');
    assert.equal(stats['Crit Damage'], '16.04%');
    assert.equal(stats['Crit Chance'], '9.07%');
    assert.equal(stats['Thunder Damage'], '5%');
});

test('override oggetto: armi di livello basso hanno Default Attack dedotto', () => {
    const expected = {
        'Bronze Focus': 60,
        'Bronze Gauntlet': 60,
        'Bronze Crux': 110,
        'Nightweb Crux': 110,
        'Oak Wand': 85,
        'Invar Axe': 75,
        'Bronze Dagger': 65,
        'Invar Dagger': 65,
        'Invar Hammer': 175,
        'Bronze Spear': 120,
        'Invar Spear': 120,
        'Flameburster': 100,
        'Invar Sword': 100,
        "Royal's Bane": 125,
        'Bronze Handcannon': 115,
        'Bronze Pot': 90,
        'Bronze Kunai': 80,
        'Recluse Kunai': 80
    };

    Object.entries(expected).forEach(([name, defaultAttack]) => {
        const stats = applyItemOverride(name, { 'Default Attack': null }, ITEM_OVERRIDES);
        assert.equal(stats['Default Attack'], defaultAttack, name);
    });
});
