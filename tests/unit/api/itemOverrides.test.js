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
