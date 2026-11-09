import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    selectStats,
    DpsManager,
    getElementalChannelingPercent,
    getElementalKnowledge,
    getGriefInflictionPercent,
    getGriefInflictionEffects,
    getLastSorrowPercent,
    getLastSorrowEffects,
    getFocusStacks,
    getFocusStacksEffects,
    getCrystalInsights,
    getCrystalInsightsElementalPowerPercent,
    getNaturalDistillationEffects,
    getElementalSynergyEffects,
    getCrystalCombustionEffects,
    getSupportOrbEffects,
    CLASS_SKILL_TREES,
    makeWorld,
    makeDamageBuild
} from '../../helpers/legacyRuntime.js';

test('elemental knowledge: ogni 1% vale +9% sul danno finale', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['DR1', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageMultiplier.elementalKnowledge, 5);
    assert.equal(steps.damageMultiplier.multiplierPercent, 45);
    assert.ok(Math.abs(steps.damageMultiplier.damage - 29) < 1e-9);
    assert.ok(Math.abs(steps.criticalDamage.baseDamage - 29) < 1e-9);

    const groups = manager.getStepGroups();
    const group = groups.find(g => g.id === 'damageMultiplier');
    assert.deepEqual(group.results.map(r => r.label), [
        'Elemental Knowledge', 'Damage Multiplier', 'Damage'
    ]);
});

test('elemental knowledge: selectStats produce il valore percentuale del nodo', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setCurrentClass('mage');
    equippedStore.state.treeLevels.mage.set('DR1', 5);

    const { skillValues } = selectStats(dataStore.data, equippedStore.state);
    assert.equal(skillValues.mage['Elemental Knowledge'], 5);
});

test('classi: le funzioni del mago restano attive cambiando schermata', () => {
    const context = {
        build: {
            currentClass: 'archer',
            treeLevels: { mage: new Map([['DR', 5], ['DR1', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.equal(getElementalChannelingPercent(context), 12.5);
    assert.deepEqual(getElementalKnowledge(context), {
        elementalKnowledgePercent: 5,
        damageMultiplierPercent: 45,
        damageMultiplier: 1.45
    });
});

test('grief infliction: si somma a Elemental Knowledge e scala con uptime', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['DR1', 1], ['L2', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { slowAttack: false, attackInterval: null, useBurst: false, griefUptime: 50 }
    });

    assert.equal(steps.damageMultiplier.elementalKnowledge, 1);
    assert.equal(steps.damageMultiplier.griefInflictionPercent, 65);
    assert.equal(steps.damageMultiplier.griefUptime, 50);
    assert.equal(steps.damageMultiplier.griefDamagePercent, 32.5);
    assert.equal(steps.damageMultiplier.multiplierPercent, 41.5);
    assert.ok(Math.abs(steps.damageMultiplier.damage - 28.3) < 1e-9);

    const group = manager.getStepGroups().find(g => g.id === 'damageMultiplier');
    assert.deepEqual(group.results.map(r => r.label), [
        'Elemental Knowledge', 'Grief Infliction', 'Grief Uptime', 'Damage Multiplier', 'Damage'
    ]);
});

test('last sorrow: si somma a EK e Grief e scala con uptime', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['DR1', 1], ['L2', 5], ['L2b', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: false,
            griefUptime: 100,
            lastSorrowUptime: 50
        }
    });

    assert.equal(steps.damageMultiplier.lastSorrowPercent, 25);
    assert.equal(steps.damageMultiplier.lastSorrowUptime, 50);
    assert.equal(steps.damageMultiplier.lastSorrowDamagePercent, 12.5);
    assert.equal(steps.damageMultiplier.multiplierPercent, 86.5);
    assert.ok(Math.abs(steps.damageMultiplier.damage - 37.3) < 1e-9);

    const group = manager.getStepGroups().find(g => g.id === 'damageMultiplier');
    assert.deepEqual(group.results.map(r => r.label), [
        'Elemental Knowledge', 'Grief Infliction', 'Grief Uptime',
        'Last Sorrow', 'Last Sorrow Uptime', 'Damage Multiplier', 'Damage'
    ]);
});

test('focus stacks: stacks medi × val, additivi agli altri', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([
        ['DR1', 1], ['L2', 5], ['L2b', 5], ['L1', 5], ['L1a', 5]
    ]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: false,
            griefUptime: 100,
            lastSorrowUptime: 50,
            focusStacks: 4
        }
    });

    assert.equal(steps.damageMultiplier.focusStacksPercent, 5);
    assert.equal(steps.damageMultiplier.focusMaxStacks, 8);
    assert.equal(steps.damageMultiplier.focusStacks, 4);
    assert.equal(steps.damageMultiplier.focusDamagePercent, 20);
    assert.equal(steps.damageMultiplier.multiplierPercent, 106.5);
    assert.ok(Math.abs(steps.damageMultiplier.damage - 41.3) < 1e-9);

    const group = manager.getStepGroups().find(g => g.id === 'damageMultiplier');
    assert.deepEqual(group.results.map(r => r.label), [
        'Elemental Knowledge', 'Grief Infliction', 'Grief Uptime',
        'Last Sorrow', 'Last Sorrow Uptime', 'Focus Stacks', 'Focus Damage',
        'Damage Multiplier', 'Damage'
    ]);
});

test('focus stacks: non supera il massimo dato da Focus Capacity', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['L1', 5], ['L1a', 5]]);

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: false,
            griefUptime: 100,
            lastSorrowUptime: 100,
            focusStacks: 10
        }
    });

    assert.equal(steps.damageMultiplier.focusMaxStacks, 8);
    assert.equal(steps.damageMultiplier.focusStacks, 8);
    assert.equal(steps.damageMultiplier.focusDamagePercent, 40);
});

test('crystal insights: stima EP% da crit rate, attack speed e durata', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UL1', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.deepEqual(getCrystalInsights(context), {
        chancePercent: 25,
        elementalPowerPercent: 30
    });

    // 50% crit, 1 attacco/0.6s → 0.833 crit/s → 0.208 shard/s → 1.667 shard medi → 50% EP
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 50) < 1e-9);

    // Con intervallo 1.2s la metà
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 1.2) - 25) < 1e-9);

    // Crit chance oltre 100 viene contata come 100
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 150, 0.6) - 100) < 1e-9);
});

test('crystal insights: aumenta Elemental Power nel calcolo del danno', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        element: 'nature'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['UL1', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Chance': { flat: 0, percent: 50 },
            'Nature Damage': { flat: 0, percent: 20 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.ok(Math.abs(steps.damageModifiers.crystalInsightsPercent - 50) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.elementalPower - 150) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.effectiveElementalPercent - 30) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 26) < 1e-9);

    const group = manager.getStepGroups().find(g => g.id === 'damageModifiers');
    assert.deepEqual(group.results.map(r => r.label), [
        'Damage Modifiers', 'Crystal Insights EP', 'Elemental Power', 'Damage'
    ]);
});

test('crystal insights: nessun effetto senza il nodo, indipendentemente dalla classe visualizzata', () => {
    const mage = {
        build: { currentClass: 'mage', treeLevels: { mage: new Map() } },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.equal(getCrystalInsightsElementalPowerPercent(mage, 50, 0.6), 0);

    const archer = {
        build: { currentClass: 'archer', treeLevels: { mage: new Map([['UL1', 5]]) } },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(archer, 50, 0.6) - 50) < 1e-9);
});

test('natural distillation: converte Crit Damage in EP e riduce il Crit Damage', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        element: 'nature'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['UL2', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Damage': { flat: 0, percent: 50 },
            'Nature Damage': { flat: 0, percent: 20 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    // Crit Damage totale 50 + 50 = 100; 25% rimosso = 25; EP flat guadagnato = 50.
    assert.equal(steps.damageModifiers.naturalDistillationPercent, 25);
    assert.equal(steps.damageModifiers.distilledCritDamagePercent, 25);
    assert.equal(steps.damageModifiers.distilledElementalPowerFlat, 50);
    assert.equal(steps.damageModifiers.elementalPower, 150);
    assert.ok(Math.abs(steps.damageModifiers.damage - 26) < 1e-9);

    // Il Crit Damage usato scende da 100 a 75.
    assert.equal(steps.criticalDamage.critDamagePercent, 100);
    assert.equal(steps.criticalDamage.distillationPercent, 25);
    assert.equal(steps.criticalDamage.convertedCritDamagePercent, 25);
    assert.equal(steps.criticalDamage.effectiveCritDamagePercent, 75);
    assert.ok(Math.abs(steps.criticalDamage.criticalHit - 45.5) < 1e-9);
});

test('elemental synergy: EP flat per Energy Regen intero sopra 10', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UR', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.deepEqual(getElementalSynergyEffects(context, 16.5), {
        a: 5,
        b: 50,
        energyRegen: 16.5,
        extraRegen: 6.5,
        steps: 6,
        elementalPowerFlat: 30
    });

    assert.equal(getElementalSynergyEffects(context, 12.9).elementalPowerFlat, 10);
    assert.equal(getElementalSynergyEffects(context, 9).elementalPowerFlat, 0);
});

test('the avatar: +10% Elemental Power per livello', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setCurrentClass('mage');
    equippedStore.state.treeLevels.mage.set('UL', 1);
    equippedStore.setEquipSlot('weapon', {
        name: 'Test Weapon',
        stats: {
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            'Arcane Damage': 100,
            element: 'thunder'
        }
    });
    equippedStore.setEquipSlot('ring1', { name: 'Test Ring', stats: { 'Thunder Damage': '10%' } });

    const { statsValues, skillValues } = selectStats(dataStore.data, equippedStore.state);
    const steps = new DpsManager().recalculate({
        statsValues,
        skillValues,
        build: equippedStore.state,
        skillTrees: dataStore.data.skillTrees
    });

    assert.ok(Math.abs(steps.damageModifiers.elementalPower - 110) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 111) < 1e-9);
});

test('energetic: +5 Energy Regen flat per livello', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setCurrentClass('mage');
    equippedStore.state.treeLevels.mage.set('DL', 1);

    const { statsValues } = selectStats(dataStore.data, equippedStore.state);
    assert.equal(statsValues['Energy Regen'].flat, 5);
    assert.equal(statsValues['Energy Regen'].percent, 0);

    equippedStore.state.treeLevels.mage.set('DL', 5);
    const level5 = selectStats(dataStore.data, equippedStore.state).statsValues;
    assert.equal(level5['Energy Regen'].flat, 25);
});

test('magical capacity: massimo livello 3 e valori del nodo', () => {
    const node = CLASS_SKILL_TREES.mage.nodes.R2a;
    assert.equal(node.max, 3);

    const effects = getSupportOrbEffects({
        statsValues: { 'Crit Chance': { flat: 0, percent: 100 } },
        build: { currentClass: 'mage', treeLevels: { mage: new Map([['R2', 5], ['R2a', 3]]) } },
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(effects.extraCapacityChancePercent, 30);
    assert.equal(effects.rechargeSeconds, 8);
    assert.equal(effects.extraCapacityDuration, 8);
});

test('power crystals: recuperano 4 Energy di base', () => {
    const node = CLASS_SKILL_TREES.mage.nodes.R1a;
    assert.equal(node.parameters.b.base, 4);
    assert.equal(node.parameters.b.increase, 4);
});

test('crystal insights: con la burst considera anche i suoi critici', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UL1', 5], ['UR1', 5]]) },
            activeEquip: { core: { name: 'Mage Core', stats: {} } }
        },
        skillTrees: CLASS_SKILL_TREES,
        settings: { useBurst: true, potentialChargeKills: 0 }
    };

    // 0.5/0.6 + (10/0.75/30)*0.5 = 1.0556 crit/s → 2.111 shard → 63.33% EP
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 63.33333333333333) < 1e-9);

    // Con Potential Charge a 10 kill il ciclo scende a 10s → 90% EP
    context.settings.potentialChargeKills = 10;
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 90) < 1e-9);
});

test('crystal insights: senza Mage Core i critici burst non contano', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UL1', 5]]) },
            activeEquip: { core: { name: 'Assassin Core', stats: {} } }
        },
        skillTrees: CLASS_SKILL_TREES,
        settings: { useBurst: true, potentialChargeKills: 0 }
    };

    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 50) < 1e-9);
});

test('crystal combustion: drop indipendenti, cooldown e danno da Average Damage', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['R1', 5], ['R1a', 5], ['R1b', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    // 1.667 hit/s; equilibrio con il feedback delle esplosioni: 1.3636 esplosioni/s.
    assert.ok(Math.abs(steps.crystalCombustion.hitsPerSecond - (1.6666666666666667 + 1.3636363636363638)) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.recoverCrystalsPerSecond - 0.6060606060606061) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.powerCrystalsPerSecond - 0.7575757575757576) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.explosionsPerSecond - 1.3636363636363638) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.crystalsPerSecond - 1.3636363636363638) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.combustionDps - 40.90909090909091) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.totalDps - (20 / 0.6 + 40.90909090909091)) < 1e-9);
    assert.ok(Math.abs(manager.getDps() - steps.crystalCombustion.totalDps) < 1e-9);

    const group = manager.getStepGroups().find(g => g.id === 'crystalCombustion');
    assert.deepEqual(group.results.map(r => r.label), [
        'Hits per Second', 'Recover Crystal / s', 'Power Crystal / s',
        'Explosions / s', 'Crystal Combustion DPS'
    ]);
});

test('crystal combustion: il cooldown 0.5s limita ogni tipo a 2 drop/s', () => {
    const context = {
        statsValues: { 'Crit Chance': { flat: 0, percent: 0 } },
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['R1', 5], ['R1a', 5], ['R1b', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES,
        settings: { slowAttack: true, attackInterval: 0.05, useBurst: false }
    };

    const effects = getCrystalCombustionEffects(context);
    assert.ok(Math.abs(effects.hitStats.totalHitsPerSecond - 20) < 1e-9);
    assert.equal(effects.maxExplosions, 4);
    assert.equal(effects.explosionsPerSecond, 4);
    assert.equal(effects.recoverCrystalsPerSecond, 2);
    assert.equal(effects.powerCrystalsPerSecond, 2);
    assert.equal(effects.crystalsPerSecond, 4);
});

test('crystal combustion: include gli hit della burst nei drop', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    }, 'Mage Core');
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['R1', 5], ['R1a', 5], ['R1b', 5]]);

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: true,
            griefUptime: 100,
            lastSorrowUptime: 100,
            focusStacks: 0,
            potentialChargeKills: 0
        }
    });

    // 1.667 normali + 0.444 burst = 2.111 hit/s; esplosioni di equilibrio 1.727/s
    assert.ok(Math.abs(steps.crystalCombustion.hitsPerSecond - (2.111111111111111 + 1.7272727272727273)) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.explosionsPerSecond - 1.7272727272727273) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.combustionDps - 51.81818181818182) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.totalDps - (20 / 0.6 + steps.burst.burstDps + 51.81818181818182)) < 1e-9);
});

test('crystal combustion: l override dello slider sostituisce le esplosioni calcolate', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['R1', 5], ['R1a', 5], ['R1b', 5]]);

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: false,
            griefUptime: 100,
            lastSorrowUptime: 100,
            focusStacks: 0,
            potentialChargeKills: 0,
            crystalExplosionOverride: true,
            crystalExplosionsPerSecond: 3
        }
    });

    assert.equal(steps.crystalCombustion.explosionsPerSecond, 3);
    assert.ok(Math.abs(steps.crystalCombustion.combustionDps - 90) < 1e-9);
    assert.ok(Math.abs(steps.crystalCombustion.totalDps - (20 / 0.6 + 90)) < 1e-9);
});

test('crystal insights: le esplosioni contano come hit e crit', () => {
    const baseBuild = {
        currentClass: 'mage',
        treeLevels: { mage: new Map([['UL1', 5], ['R1', 5], ['R1a', 5]]) }
    };

    // Senza Crystal Combustion i cristalli non esplodono e non contano come hit.
    const noCombustion = { build: baseBuild, skillTrees: CLASS_SKILL_TREES };
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(noCombustion, 50, 0.6) - 50) < 1e-9);

    // Con Crystal Combustion: hit base 1.6667 + esplosioni 1.3636 = 3.0303 hit/s
    // 50% crit → 1.515 crit/s → 3.030 shard medi → 90.909% EP
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UL1', 5], ['R1', 5], ['R1a', 5], ['R1b', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 90.9090909090909) < 1e-9);

    context.settings = { crystalExplosionOverride: true, crystalExplosionsPerSecond: 0 };
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 50) < 1e-9);
});

test('support orbs: 1 hit/s per orb, fino a 3 orb', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['R2', 5]]);

    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.supportOrbs.spawnChancePercent, 18);
    assert.equal(steps.supportOrbs.durationSeconds, 8);
    assert.equal(steps.supportOrbs.damagePercent, 70);
    assert.equal(steps.supportOrbs.activeOrbs, 2);
    assert.equal(steps.supportOrbs.normalActiveOrbs, 2);
    assert.equal(steps.supportOrbs.specialActiveOrbs, 0);
    assert.equal(steps.supportOrbs.activeRedOrbs, 2 / 3);
    assert.equal(steps.supportOrbs.activeBlueOrbs, 2 / 3);
    assert.ok(Math.abs(steps.supportOrbs.blueUptime - 2 / 3) < 1e-9);
    assert.ok(Math.abs(steps.supportOrbs.blueDamageMultiplier - (1 + (2 / 3) * 20 / 100)) < 1e-9);
    assert.ok(Math.abs(steps.supportOrbs.orbDps - 10.577777777777776) < 1e-9);
    assert.ok(Math.abs(steps.supportOrbs.totalDps - (20 * steps.supportOrbs.blueDamageMultiplier / 0.6 + 10.577777777777776)) < 1e-9);
    assert.ok(Math.abs(manager.getDps() - steps.supportOrbs.totalDps) < 1e-9);
});

test('support orbs: livello 1 genera una RED orb ogni 3 orb', () => {
    const context = {
        statsValues: {},
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['R2', 1]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    const effects = getSupportOrbEffects(context);
    const expectedRedHits = 0.08 * (1 / 0.6) / 0.92;
    assert.ok(Math.abs(effects.orbHitsPerSecond - expectedRedHits) < 1e-9);
    assert.ok(Math.abs(effects.activeRedOrbs - expectedRedHits) < 1e-9);
    assert.ok(Math.abs(effects.activeBlueOrbs - expectedRedHits) < 1e-9);
    assert.ok(Math.abs(effects.activeOrbs - expectedRedHits * 3) < 1e-9);
    assert.ok(Math.abs(effects.blueDamageMultiplier - (1 + expectedRedHits * 4 / 100)) < 1e-9);
});

test('crystal insights: anche le orb rosse contano come hit e crit', () => {
    const context = {
        statsValues: { 'Crit Chance': { flat: 0, percent: 50 } },
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UL1', 5], ['R2', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    // Senza Magical Capacity non esistono orb speciali:
    // 2 orb normali → 0.667 RED
    // hit base 1.667 + 0.667 = 2.333 hit/s
    // 50% crit → 1.167 crit/s → 2.333 shard medi → 70% EP
    assert.ok(Math.abs(getCrystalInsightsElementalPowerPercent(context, 50, 0.6) - 70) < 1e-9);
});

test('support orbs: senza Magical Capacity non ci sono orb speciali', () => {
    const context = {
        statsValues: { 'Crit Chance': { flat: 0, percent: 100 } },
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['R2', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    const effects = getSupportOrbEffects(context);
    assert.equal(effects.extraCapacityChancePercent, 0);
    assert.equal(effects.extraCapacityDuration, 0);
    assert.equal(effects.extraCapacity, 0);
    assert.equal(effects.specialActiveOrbs, 0);
    assert.ok(effects.activeOrbs <= 3);
});

test('support orbs: Magical Capacity aggiunge capacità extra temporanea', () => {
    const context = {
        statsValues: { 'Crit Chance': { flat: 0, percent: 100 } },
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['R2', 5], ['R2a', 3]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    const effects = getSupportOrbEffects(context);
    assert.equal(effects.extraCapacityChancePercent, 30);
    assert.equal(effects.extraCapacityDuration, 8);
    assert.equal(effects.rechargeSeconds, 8);
    assert.ok(effects.extraCapacity > 0);
    assert.ok(effects.extraCapacity <= 3);
    assert.ok(effects.specialActiveOrbs > 0);
});

test('support orbs: le orb speciali richiedono comunque lo spawn di Support Orbs', () => {
    const context = {
        statsValues: { 'Crit Chance': { flat: 0, percent: 100 } },
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['R2a', 3]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    const effects = getSupportOrbEffects(context);
    assert.equal(effects.spawnChancePercent, 0);
    assert.equal(effects.extraCapacity, 0);
    assert.equal(effects.activeOrbs, 0);
    assert.equal(effects.specialActiveOrbs, 0);
});

