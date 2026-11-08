import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    selectStats,
    DpsManager,
    getAugmentStatBonuses,
    CLASS_SKILL_TREES,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';

test('augment: Arcane Damage 1 aggiunge +5% al tipo di danno', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 20
    });
    build.activeEquip.weapon.augments = ['Arcane Damage 1', '', ''];
    build.treeLevels = { warrior: new Map(), archer: new Map(), mage: new Map() };

    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    // Gli augment non entrano nelle statistiche: sono applicati alla fine.
    assert.equal(statsValues['Arcane Damage'].percent, 0);

    const steps = new DpsManager().recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageModifiers.percent, 0);
    assert.ok(Math.abs(steps.damageModifiers.damage - 20) < 1e-9);
    assert.ok(Math.abs(steps.augmentFinal.damage - 21) < 1e-9);
    assert.ok(Math.abs(steps.augmentFinal.damageStatPercent - 5) < 1e-9);
});

test('augment: Arcane Damage% si applica dopo critici e blue orb', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['Arcane Damage 1', '', ''];

    const steps = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageModifiers.percent, 0);
    assert.ok(Math.abs(steps.criticalDamage.damage - 150) < 1e-9);
    assert.ok(Math.abs(steps.augmentFinal.damage - 157.5) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.damage - 157.5) < 1e-9);
});

test('augment: Illusion Damage usa il fallback comune 5% + 2% per livello', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Illusion',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Illusion Damage': 20
    });
    build.activeEquip.weapon.augments = ['Illusion Damage 1', '', ''];
    build.treeLevels = { warrior: new Map(), archer: new Map(), mage: new Map() };

    const bonuses = getAugmentStatBonuses(build);
    assert.deepEqual(bonuses, [{ stat: 'Illusion Damage', value: 5, percent: true }]);

    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    assert.equal(statsValues['Illusion Damage'].percent, 0);

    const steps = new DpsManager().recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });
    assert.ok(Math.abs(steps.augmentFinal.damageStatPercent - 5) < 1e-9);
    assert.ok(Math.abs(steps.augmentFinal.damage - 21) < 1e-9);

    build.activeEquip.weapon.augments = ['Illusion Damage 6', '', ''];
    const level6 = getAugmentStatBonuses(build);
    assert.equal(level6[0].value, 15);
});

test('augment: Combo usa il reverse del Default Attack come le abilità', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['Combo 1', '', ''];

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    const expected = steps.augmentDamage.totalHitsPerSecond
        * 0.15
        * 0.5
        * steps.criticalDamage.damage
        * (100 / 85);

    assert.ok(Math.abs(steps.augmentDamage.comboDps - expected) < 1e-9);
    assert.ok(Math.abs(steps.augmentDamage.reverseMultiplier - 100 / 85) < 1e-9);
});

test('augment: Damage Multiplier resta visibile anche a HP 0', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['Prosecution 1', '', ''];

    const manager = new DpsManager();
    manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { prosecutionHpPercent: 0 }
    });

    const group = manager.getStepGroups().find(entry => entry.id === 'damageMultiplier');
    assert.ok(group);
    const prosecution = group.results.find(row => row.label === 'Prosecution Damage%');
    assert.ok(prosecution);
    assert.equal(prosecution.value, 0);
});

test('augment: Nature s Bless aggiunge Elemental Power flat', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 20,
        element: 'nature',
        'Nature Damage': '50%'
    });
    build.activeEquip.weapon.augments = ["Nature's Bless 1", '', ''];
    build.treeLevels = { warrior: new Map(), archer: new Map(), mage: new Map() };

    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    // Anche Nature's Bless viene applicato come ultimo passo, non nelle stats.
    assert.equal(statsValues['Elemental Power'], undefined);

    const steps = new DpsManager().recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.augmentFinal.natureBlessFlat, 20);
    assert.ok(Math.abs(steps.augmentFinal.natureBlessMultiplier - (1.6 / 1.5)) < 1e-9);
    assert.ok(Math.abs(steps.augmentFinal.damage - 32) < 1e-9);
});
