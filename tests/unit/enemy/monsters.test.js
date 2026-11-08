import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    DpsManager,
    simulateEnemy,
    MONSTER_PRESETS,
    getDefaultDamagePercent,
    CLASS_SKILL_TREES,
    specialAbilityManager,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';

test('monster presets: valori e resistenze', () => {
    assert.deepEqual(
        MONSTER_PRESETS.map(monster => [monster.name, monster.health, monster.defense]),
        [
            ['Goblin', 162, 7],
            ['Tooms', 117, 16],
            ['Citizen', 386, 125],
            ['Maw', 25797, 100],
            ['Void Storm', 101562, 110]
        ]
    );

    const maw = MONSTER_PRESETS.find(monster => monster.id === 'maw');
    assert.equal(getDefaultDamagePercent(maw, 'radiant'), 20);
    assert.equal(getDefaultDamagePercent(maw, 'void'), -20);
    assert.equal(getDefaultDamagePercent(maw, 'nature'), 0);

    const goblin = MONSTER_PRESETS.find(monster => monster.id === 'goblin');
    assert.equal(getDefaultDamagePercent(goblin, 'radiant'), 0);
});

test('enemy simulator: il primo colpo esclude gli effetti che richiedono un hit precedente', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilitiesFromStats('Royal Tiara', {
        'Ability 2': 'Royal Praise'
    });

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.activeEquip.weapon.stats.element = 'nature';
    build.activeEquip.helmet = { name: 'Royal Tiara', stats: {}, augments: ['', '', ''] };

    const statsValues = {
        'Arcane Damage': { flat: 100, percent: 0 },
        'Nature Damage': { flat: 0, percent: 5 }
    };

    const normal = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: {}
    });
    const firstHit = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { firstHit: true }
    });

    assert.ok(Math.abs(normal.criticalDamage.averageDamage - 131.25) < 1e-9);
    assert.ok(Math.abs(firstHit.criticalDamage.averageDamage - 105) < 1e-9);

    specialAbilityManager.reset();
});
