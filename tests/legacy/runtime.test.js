import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

const base = '../../js';
const { DataStore } = await import(`${base}/store/dataStore.js`);
const { BuildStore } = await import(`${base}/store/equippedStore.js`);
const { selectStats } = await import(`${base}/store/selectors.js`);
const { withBaseStats } = await import(`${base}/store/selectors.js`);
const { SkillTreeManager } = await import(`${base}/modules/skillTreeManager.js`);
const { ShareManager } = await import(`${base}/modules/shareManager.js`);
const { ElixirManager } = await import(`${base}/modules/elixirManager.js`);
const { ItemManager } = await import(`${base}/modules/itemManager.js`);
const { DpsManager } = await import(`${base}/modules/dpsManager.js`);
const { simulateEnemy, applyDefenseDamage } = await import(`${base}/modules/enemySimulator.js`);
const { MONSTER_PRESETS, getDefaultDamagePercent } = await import(`${base}/data/monsters.js`);
const { parseAugment, getAugmentSuggestions, registerAugments } = await import(`${base}/modules/augmentManager.js`);
const { getAugmentStatBonuses } = await import(`${base}/modules/augmentManager.js`);
const { ApiManager } = await import(`${base}/modules/apiManager.js`);
const { applyItemOverride } = await import(`${base}/modules/itemOverrides.js`);
const { ITEM_OVERRIDES } = await import(`${base}/data/itemOverrides.js`);
const {
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
    getPotentialChargeEffects,
    getCrystalCombustionEffects,
    getSupportOrbEffects,
    getPassiveHitStats
} = await import(`${base}/modules/classes/mage.js`);
const { ITEM_DATABASE } = await import(`${base}/data/items.js`);
const { AUGMENT_DATABASE } = await import(`${base}/data/augments.js`);
const { INITIAL_ELIXIRS } = await import(`${base}/data/elixirs.js`);
const { CLASS_SKILL_TREES } = await import(`${base}/data/skillTrees.js`);
const { ITEM_UPGRADE_STAT_PER_LEVEL } = await import(`${base}/data/constants.js`);
const { SpecialAbilityManager } = await import(`${base}/modules/specialAbilityManager.js`);
const specialAbilityManager = new SpecialAbilityManager();
const { onClick, passives, SPECIAL_ABILITY_OVERRIDES } = await import(`${base}/data/specialAbilities.js`);
const TEST_AUGMENT_API = [
    { name: 'Arcane Damage', goesIn: 'weapon', group: 'damage', rarity: 'Common', tiers: [
        { tier: 1, effect: '+5% Arcane Damage', value: '+5%' },
        { tier: 3, effect: '+9% Arcane Damage', value: '+9%' }
    ] },
    { name: 'Arcane Defense', goesIn: 'armor', group: 'defence', rarity: 'Common', tiers: [
        { tier: 1, effect: '+4% Arcane Defense', value: '+4%' }
    ] },
    { name: 'Illusion Damage', goesIn: 'weapon', group: 'damage', rarity: 'Common', tiers: [] },
    { name: 'Hunter', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: 'Deal +25% damage if no other mobs are nearby.', value: '+25%' }
    ] },
    { name: 'Prosecution', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: 'Deal up to +15% damage the more health your enemy has.', value: '+15%' }
    ] },
    { name: 'Enraged', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: 'Deal up to +15% damage the less health you have.', value: '+15%' }
    ] },
    { name: 'Execution', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: 'Deal up to +20% damage the less health your enemy has.', value: '+20%' }
    ] },
    { name: 'First Strike', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: 'Your first hit on an enemy will deal +20% damage.', value: '+20%' }
    ] },
    { name: 'Combo', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: '15% to strike an extra hit at 50% damage', value: '15%' }
    ] },
    { name: 'Chain Lightning', goesIn: 'weapon', group: 'damage', rarity: 'Legendary', tiers: [
        { tier: 1, effect: 'CRITS have a 20% chance to chain 2 nearby enemies at 20% damage. 4s cooldown.', value: '20%' }
    ] },
    { name: 'Deathburst', goesIn: 'weapon', group: 'damage', rarity: 'Legendary', tiers: [
        { tier: 1, effect: 'Killing an enemy will cast smaller explosions, dealing 125% damage. 5s cooldown.', value: '125%' }
    ] },
    { name: 'Infected', goesIn: 'weapon', group: 'damage', rarity: 'Rare', tiers: [
        { tier: 1, effect: 'The target enemy will take +1.5% damage per hit for 2s, up to 10 hits.', value: '+1.5%' }
    ] },
    { name: "Nature's Bless", goesIn: 'weapon', group: 'utility', rarity: 'Epic', tiers: [
        { tier: 1, effect: 'Dealing effective elemental damage will briefly increase Elemental Power by 20 of you and nearby players.', value: '+20' }
    ] }
];
registerAugments(TEST_AUGMENT_API);


function makeWorld() {
    const dataStore = new DataStore({
        items: ITEM_DATABASE,
        augments: AUGMENT_DATABASE,
        elixirsConfig: INITIAL_ELIXIRS,
        skillTrees: CLASS_SKILL_TREES
    });
    const equippedStore = new BuildStore({
        skillTrees: dataStore.data.skillTrees,
        elixirsConfig: dataStore.data.elixirsConfig
    });
    return { dataStore, equippedStore };
}

// --- Store iniziali -------------------------------------------------------
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

// --- Eventi e isolamento --------------------------------------------------
test('equip emette solo equip (non skills/elixirs/class)', () => {
    const { equippedStore } = makeWorld();
    const fired = [];
    ['equip', 'skills', 'elixirs', 'class', 'all'].forEach(event => {
        equippedStore.subscribe(event, () => fired.push(event));
    });

    equippedStore.setEquipSlot('weapon', { name: 'Test', stats: { HP: 10 } });

    assert.deepEqual(fired.sort(), ['all', 'equip']);
});

test('skills emette solo skills (non equip)', () => {
    const { equippedStore } = makeWorld();
    const fired = [];
    ['equip', 'skills', 'all'].forEach(event => {
        equippedStore.subscribe(event, () => fired.push(event));
    });

    equippedStore.applySkillLevels('archer', equippedStore.state.treeLevels.archer, 90);

    assert.deepEqual(fired.sort(), ['all', 'skills']);
});

test('unsubscribe rimuove il listener', () => {
    const { equippedStore } = makeWorld();
    let count = 0;
    const off = equippedStore.subscribe('equip', () => count++);
    equippedStore.setEquipSlot('weapon', { name: 'A' });
    off();
    equippedStore.setEquipSlot('weapon', { name: 'B' });
    assert.equal(count, 1);
});

// --- selectStats ----------------------------------------------------------
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

test('selectStats applica lo scaling del livello di upgrade', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setEquipSlot('weapon', {
        name: 'Upgraded',
        upgradeLevel: 4,
        stats: {
            'Arcane Damage': 20,
            'Crit Chance': '10%',
            'Default Attack': 100,
            'Normal Attack': 50,
            'Level': 5,
            'Augment Slots': 3
        }
    });

    const { statsValues } = selectStats(dataStore.data, equippedStore.state);
    const multiplier = 1 + 4 * ITEM_UPGRADE_STAT_PER_LEVEL;
    assert.ok(Math.abs(statsValues['Arcane Damage'].flat - 20 * multiplier) < 1e-9);
    assert.ok(Math.abs(statsValues['Crit Chance'].percent - 10 * multiplier) < 1e-9);
    assert.equal(statsValues['Default Attack'], undefined);
    assert.equal(statsValues['Normal Attack'], undefined);
    assert.equal(statsValues['Level'], undefined);
    assert.equal(statsValues['Augment Slots'], undefined);
});

test('selectStats limita lo scaling al livello massimo consentito', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setEquipSlot('weapon', {
        name: 'Tempest',
        upgradeLevel: 20,
        stats: {
            'Level': 26,
            'Arcane Damage': 47
        }
    });

    const { statsValues } = selectStats(dataStore.data, equippedStore.state);
    assert.ok(Math.abs(
        statsValues['Arcane Damage'].flat - 47 * (1 + 9 * ITEM_UPGRADE_STAT_PER_LEVEL)
    ) < 1e-9);
});

test('ItemManager limita il livello di upgrade in base al level oggetto', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new ItemManager({ dataStore, equippedStore });

    equippedStore.setEquipSlot('weapon', {
        name: 'Tempest',
        stats: { 'Level': 26 }
    });

    manager.handleUpgradeInput('weapon', '99');
    assert.equal(equippedStore.state.activeEquip.weapon.upgradeLevel, 9);

    manager.handleUpgradeInput('weapon', '-5');
    assert.equal(equippedStore.state.activeEquip.weapon.upgradeLevel, 0);
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

// --- SkillTreeManager -----------------------------------------------------
test('acquisto nodo scala i punti e rispetta il costo', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    manager.handleNodeClick('C', { shiftKey: false });
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 1);
    assert.equal(equippedStore.state.sharedPoints, 99);
    manager.handleNodeClick('C', { shiftKey: false });
    assert.equal(equippedStore.state.sharedPoints, 97); // costo livello 2 = 2
});

test('nodo non disponibile non viene acquistato', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    manager.handleNodeClick('L1a', { shiftKey: false });
    assert.equal(equippedStore.state.treeLevels.archer.get('L1a'), 0);
    assert.equal(equippedStore.state.sharedPoints, 100);
});

test('refund semplice senza orfani', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    manager.handleNodeClick('C', { shiftKey: false }); // -1
    manager.handleNodeClick('C', { shiftKey: false }); // -2
    manager.handleNodeClick('C', { shiftKey: true });  // +2
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 1);
    assert.equal(equippedStore.state.sharedPoints, 99);
});

test('refund a cascata: azzerare C rimborsa i discendenti orfani', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });

    // C x2 -> costo 3, poi L x1 (costBase 3) -> costo 3
    manager.handleNodeClick('C', { shiftKey: false });
    manager.handleNodeClick('C', { shiftKey: false });
    manager.handleNodeClick('L', { shiftKey: false });
    assert.equal(equippedStore.state.sharedPoints, 94);

    // Shift+click C da 2 a 1: L resta raggiungibile, nessun orfano
    manager.handleNodeClick('C', { shiftKey: true });
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 1);
    assert.equal(equippedStore.state.treeLevels.archer.get('L'), 1);
    assert.equal(equippedStore.state.sharedPoints, 96);

    // Shift+click C da 1 a 0: L diventa orfano e viene rimborsato (3)
    manager.handleNodeClick('C', { shiftKey: true });
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 0);
    assert.equal(equippedStore.state.treeLevels.archer.get('L'), 0);
    assert.equal(equippedStore.state.sharedPoints, 100);
});

test('refund a cascata su catena di tre nodi', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });

    // C x2 (3), L x1 (3), L1 x1 (costBase 2) = 8 spesi
    manager.handleNodeClick('C', { shiftKey: false });
    manager.handleNodeClick('C', { shiftKey: false });
    manager.handleNodeClick('L', { shiftKey: false });
    manager.handleNodeClick('L1', { shiftKey: false });
    assert.equal(equippedStore.state.sharedPoints, 92);

    manager.handleNodeClick('C', { shiftKey: true }); // 2 -> 1
    manager.handleNodeClick('C', { shiftKey: true }); // 1 -> 0, L e L1 orfani
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 0);
    assert.equal(equippedStore.state.treeLevels.archer.get('L'), 0);
    assert.equal(equippedStore.state.treeLevels.archer.get('L1'), 0);
    assert.equal(equippedStore.state.sharedPoints, 100);
});

test('punti insufficienti bloccano acquisto', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    equippedStore.applySkillLevels('archer', equippedStore.state.treeLevels.archer, 0);
    manager.handleNodeClick('C', { shiftKey: false });
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 0);
});

test('getNodeInfo calcola descrizione e costo prossimo livello', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    const info = manager.getNodeInfo('C');
    assert.equal(info.level, 0);
    assert.equal(info.nextCost, 1);
    assert.ok(info.description.includes('5%'));
});

test('getViewState coerente con classi ed edge', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    const view = manager.getViewState();
    assert.equal(view.currentClass, 'archer');
    assert.equal(view.nodes.length, Object.keys(CLASS_SKILL_TREES.archer.nodes).length);
    assert.equal(view.edges.length, CLASS_SKILL_TREES.archer.edges.length);
    assert.ok(view.nodes.find(n => n.id === 'C').available);
    assert.ok(!view.nodes.find(n => n.id === 'L1a').available);
});

test('cambio classe cambia albero attivo e conserva i livelli', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new SkillTreeManager({ dataStore, equippedStore });
    manager.handleNodeClick('C', { shiftKey: false });
    equippedStore.setCurrentClass('mage');
    assert.equal(manager.getActiveLevels(), equippedStore.state.treeLevels.mage);
    assert.equal(equippedStore.state.treeLevels.archer.get('C'), 1);
});

// --- ShareManager ---------------------------------------------------------
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

// --- ItemManager ----------------------------------------------------------
test('ItemManager applica preset e svuota slot', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        items: { ...dataStore.data.items, core: [{ name: 'Archer Core', stats: { 'Pierce Damage': '20%' } }] }
    }, 'items');
    const manager = new ItemManager({ dataStore, equippedStore });
    manager.handleItemInput('core', 'archer core');
    assert.equal(equippedStore.state.activeEquip.core.name, 'Archer Core');
    assert.deepEqual(equippedStore.state.activeEquip.core.stats, { 'Pierce Damage': '20%' });
    manager.handleItemInput('core', '');
    assert.equal(equippedStore.state.activeEquip.core.name, '');
    assert.deepEqual(equippedStore.state.activeEquip.core.stats, {});
});

test('ItemManager normalizza righe custom', () => {
    const { dataStore, equippedStore } = makeWorld();
    const manager = new ItemManager({ dataStore, equippedStore });
    const stats = manager.normalizeStats([
        { name: 'HP', value: '150' },
        { name: 'Crit', value: '12,5%' },
        { name: 'Note', value: 'abc' },
        { name: '', value: '10' }
    ]);
    assert.equal(stats.HP, 150);
    assert.equal(stats.Crit, '12,5%');
    assert.equal(stats.Note, 'abc');
    assert.equal(Object.keys(stats).length, 3);
});

test('ItemManager suggerimenti senza duplicati', () => {
    const { dataStore, equippedStore } = makeWorld();
    dataStore.updateData({
        items: {
            ...dataStore.data.items,
            weapon: [{ name: 'A', stats: { HP: 1, Crit: '2%' } }],
            helmet: [{ name: 'B', stats: { HP: 3 } }]
        }
    }, 'items');
    const manager = new ItemManager({ dataStore, equippedStore });
    const suggestions = manager.getStatSuggestions();
    assert.equal(suggestions.filter(s => s === 'HP').length, 1);
    assert.ok(suggestions.includes('Crit'));
});

// --- Calcolo danni: step base damage -------------------------------------
function makeDamageBuild(weaponStats, coreName = '') {
    /** @type {Record<string, any>} */
    const activeEquip = {
        weapon: { name: 'Test Weapon', stats: weaponStats, augments: ['', '', ''] }
    };

    if (coreName) {
        activeEquip.core = { name: coreName, stats: {}, augments: ['', '', ''] };
    }

    return {
        sharedPoints: 0,
        currentClass: 'archer',
        activeEquip,
        elixirs: [],
        treeLevels: {}
    };
}

test('base damage: Arcane Damage 20 con Default Attack 85% => 17', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 85 })
    });

    assert.equal(steps.baseDamage.damageType, 'Arcane');
    assert.equal(steps.baseDamage.statName, 'Arcane Damage');
    assert.equal(steps.baseDamage.damageStat, 20);
    assert.equal(steps.baseDamage.defaultAttackPercent, 85);
    assert.equal(steps.baseDamage.baseDamage, 17);
    const results = manager.getResults();
    assert.deepEqual(
        results.slice(0, 5).map(r => r.label),
        ['Base Damage', 'Damage Modifiers', 'Damage', 'Critical Hit', 'Average Damage']
    );
    assert.equal(results[0].value, 17);
    assert.equal(results[2].value, 17);
    assert.ok(Math.abs(results[3].value - 25.5) < 1e-9);
    assert.equal(results[4].value, 17);
});

test('base damage: usa solo il flat, le percentuali arrivano dallo step successivo', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Slash Damage': { flat: 20, percent: 50 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Slash', 'Default Attack': 100 })
    });

    assert.equal(steps.baseDamage.damageStat, 20);
    assert.equal(steps.baseDamage.baseDamage, 20);
    assert.equal(steps.damageModifiers.percent, 50);
    assert.equal(steps.damageModifiers.damage, 30);
});

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

test('base damage: senza Damage Type non produce risultati', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Default Attack': 85 })
    });

    assert.equal(steps.baseDamage.baseDamage, 0);
    assert.equal(steps.baseDamage.missing, 'Damage Type');
    assert.deepEqual(manager.getResults(), []);
});

test('base damage: usa la statistica corrispondente al Damage Type', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Blunt Damage': { flat: 40, percent: 0 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Blunt', 'Default Attack': 50 })
    });

    assert.equal(steps.baseDamage.statName, 'Blunt Damage');
    assert.equal(steps.baseDamage.baseDamage, 20);
});

test('elemental power: EP scala il danno elementale (full set example)', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 67.2 },
            'Nature Damage': { flat: 0, percent: 20 },
            'Elemental Power': { flat: 98.3, percent: 25.6 }
        },
        skillValues: {},
        build: makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 85,
            'Weapon Type': 'magic',
            element: 'nature'
        })
    });

    assert.ok(Math.abs(steps.baseDamage.baseDamage - 40.46) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.elementalPower - 249.06) < 1e-2);
    assert.ok(Math.abs(steps.damageModifiers.effectiveElementalPercent - 49.812) < 1e-3);
    assert.ok(Math.abs(steps.damageModifiers.damage - 101.35) < 1e-1);
    assert.deepEqual(
        manager.getResults().slice(0, 6).map(r => r.label),
        ['Base Damage', 'Damage Modifiers', 'Elemental Power', 'Damage', 'Critical Hit', 'Average Damage']
    );
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

test('crit: 30% di crit rate pesa il 30% del danno critico', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Chance': { flat: 0, percent: 30 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.criticalDamage.critChance, 30);
    assert.equal(steps.criticalDamage.critDamagePercent, 50);
    assert.ok(Math.abs(steps.criticalDamage.criticalHit - 30) < 1e-9);
    assert.ok(Math.abs(steps.criticalDamage.averageDamage - 23) < 1e-9);
});

test('crit: il Crit Damage delle statistiche si somma al 50% base', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Chance': { flat: 0, percent: 30 },
            'Crit Damage': { flat: 0, percent: 50 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.criticalDamage.critDamagePercent, 100);
    assert.ok(Math.abs(steps.criticalDamage.criticalHit - 40) < 1e-9);
    assert.ok(Math.abs(steps.criticalDamage.averageDamage - 26) < 1e-9);
});

test('crit: crit chance negativa viene limitata a 0', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Chance': { flat: 0, percent: -20 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.criticalDamage.critChance, 0);
    assert.ok(Math.abs(steps.criticalDamage.averageDamage - 20) < 1e-9);
});

test('crit: oltre 100% il critico ha sempre successo ma il valore resta', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Crit Chance': { flat: 0, percent: 150 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.criticalDamage.critChance, 150);
    assert.equal(steps.criticalDamage.effectiveCritChance, 100);
    assert.equal(steps.criticalDamage.critChanceOverflow, 50);
    assert.ok(Math.abs(steps.criticalDamage.averageDamage - 30) < 1e-9);
});

// --- Statistiche di base in visualizzazione ------------------------------
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

test('attack speed: 0.6s per attacco e DPS calcolato sul danno medio', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.equal(steps.attackSpeed.attackInterval, 0.6);
    assert.ok(Math.abs(steps.attackSpeed.attacksPerSecond - 1 / 0.6) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.dps - 20 / 0.6) < 1e-9);
    assert.ok(Math.abs(manager.getDps() - 20 / 0.6) < 1e-9);
});

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

test('burst: con Mage Core infligge il 75% per 10s ogni 30s', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 30 }
        },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 }, 'Mage Core'),
        settings: { slowAttack: false, attackInterval: null, useBurst: true }
    });

    assert.equal(steps.criticalDamage.averageDamage, 23);
    assert.equal(steps.burst.enabled, true);
    assert.ok(Math.abs(steps.burst.burstDamagePerHit - 17.25) < 1e-9);
    assert.ok(Math.abs(steps.burst.burstDps - (17.25 * (10 / 0.75) / 30)) < 1e-9);
    assert.ok(Math.abs(steps.burst.burstEnergyPerSecond - 50 / 30) < 1e-9);
    assert.ok(Math.abs(steps.burst.energyPerSecondBurstOnly + 50 / 30) < 1e-9);
    assert.ok(Math.abs(steps.burst.totalDps - (23 / 0.6 + steps.burst.burstDps)) < 1e-9);
    assert.ok(Math.abs(steps.burst.energyPerSecond - (10 - 6 / 0.6 - 50 / 30)) < 1e-9);
    assert.ok(Math.abs(manager.getDps() - steps.burst.totalDps) < 1e-9);

    const rows = manager.getStepGroups()[4].results;
    assert.deepEqual(rows.map(r => r.label), [
        'Burst / Hit', 'Burst DPS', 'Energy per Second'
    ]);
});

test('burst: senza Mage Core la sezione richiede il core', () => {
    const manager = new DpsManager();
    manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 }, 'Archer Core'),
        settings: { slowAttack: false, attackInterval: null, useBurst: true }
    });

    const groups = manager.getStepGroups();
    assert.equal(groups.length, 5);
    assert.deepEqual(groups[4].results, [{ label: 'Burst', value: 'Requires Mage Core' }]);
    assert.ok(Math.abs(manager.getDps() - 20 / 0.6) < 1e-9);
});

test('burst: disattivato mostra la sezione con Burst Off e il DPS resta quello base', () => {
    const manager = new DpsManager();
    const steps = manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 }, 'Mage Core'),
        settings: { slowAttack: false, attackInterval: null, useBurst: false }
    });

    assert.equal(steps.burst.enabled, false);
    assert.equal(steps.burst.visible, true);
    assert.deepEqual(
        manager.getStepGroups().map(g => g.id),
        ['baseDamage', 'damageModifiers', 'criticalDamage', 'attackSpeed', 'burst']
    );
    assert.deepEqual(
        manager.getStepGroups().find(g => g.id === 'burst').results,
        [{ label: 'Burst', value: 'Off' }]
    );
    assert.ok(Math.abs(manager.getDps() - 20 / 0.6) < 1e-9);
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

test('elemental channeling: aggiunge il suo valore al danno elementale', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setCurrentClass('mage');
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

test('elemental knowledge: 1% aumenta il danno del 9%', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['DR1', 1]]);

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageMultiplier.multiplierPercent, 9);
    assert.ok(Math.abs(steps.damageMultiplier.damage - 21.8) < 1e-9);
});

test('elemental knowledge: la sezione è nascosta se il nodo è a 0', () => {
    const manager = new DpsManager();
    manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build: makeDamageBuild({ 'Damage Type': 'Arcane', 'Default Attack': 100 })
    });

    assert.ok(!manager.getStepGroups().some(g => g.id === 'damageMultiplier'));
});

test('elemental knowledge: selectStats produce il valore percentuale del nodo', () => {
    const { dataStore, equippedStore } = makeWorld();
    equippedStore.setCurrentClass('mage');
    equippedStore.state.treeLevels.mage.set('DR1', 5);

    const { skillValues } = selectStats(dataStore.data, equippedStore.state);
    assert.equal(skillValues.mage['Elemental Knowledge'], 5);
});

test('classi: le funzioni del mago leggono direttamente lo skill tree', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['DR', 5], ['DR1', 3]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.equal(getElementalChannelingPercent(context), 12.5);
    assert.deepEqual(getElementalKnowledge(context), {
        elementalKnowledgePercent: 3,
        damageMultiplierPercent: 27,
        damageMultiplier: 1.27
    });
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

test('grief infliction: uptime default 100%', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['L2', 5]]);

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageMultiplier.griefUptime, 100);
    assert.equal(steps.damageMultiplier.griefDamagePercent, 65);
    assert.equal(steps.damageMultiplier.multiplierPercent, 65);
    assert.ok(Math.abs(steps.damageMultiplier.damage - 33) < 1e-9);
});

test('classi: Grief Infliction legge il proprio nodo', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['L2', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.equal(getGriefInflictionPercent(context), 65);

    const archer = {
        build: {
            currentClass: 'archer',
            treeLevels: { mage: new Map([['L2', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.equal(getGriefInflictionPercent(archer), 65);
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

test('classi: Last Sorrow legge il proprio nodo', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['L2b', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.equal(getLastSorrowPercent(context), 25);

    const archer = {
        build: {
            currentClass: 'archer',
            treeLevels: { mage: new Map([['L2b', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.equal(getLastSorrowPercent(archer), 25);
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

test('classi: Focus Stacks legge stacks e capacity', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['L1', 5], ['L1a', 3]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.deepEqual(getFocusStacks(context), {
        focusStacksPercent: 5,
        focusCapacity: 3,
        maxStacks: 6
    });

    const archer = {
        build: {
            currentClass: 'archer',
            treeLevels: { mage: new Map([['L1', 5], ['L1a', 3]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };
    assert.deepEqual(getFocusStacks(archer), {
        focusStacksPercent: 5,
        focusCapacity: 3,
        maxStacks: 6
    });
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

test('natural distillation: 5% rimuove 2.5 Crit Damage e dà 5 EP flat', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['UL2', 1]]);

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 20, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.damageModifiers.distilledCritDamagePercent, 2.5);
    assert.equal(steps.damageModifiers.distilledElementalPowerFlat, 5);
    assert.equal(steps.damageModifiers.elementalPower, 105);
    assert.equal(steps.criticalDamage.effectiveCritDamagePercent, 47.5);
});

test('classi: Natural Distillation restituisce il modificatore firmato', () => {
    const context = {
        build: {
            currentClass: 'archer',
            treeLevels: { mage: new Map([['UL2', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.deepEqual(getNaturalDistillationEffects(context, 50), {
        distillationPercent: 25,
        convertedCritDamagePercent: 12.5,
        critDamageModifier: -12.5,
        elementalPowerFlat: 25
    });
});

test('classi: uptime e stack sono responsabilità del modulo mage', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: {
                mage: new Map([['L2', 5], ['L2b', 5], ['L1', 5], ['L1a', 5]])
            }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.deepEqual(getGriefInflictionEffects(context, 50), {
        griefInflictionPercent: 65,
        griefUptime: 50,
        griefDamagePercent: 32.5
    });

    assert.deepEqual(getLastSorrowEffects(context, 50), {
        lastSorrowPercent: 25,
        lastSorrowUptime: 50,
        lastSorrowDamagePercent: 12.5
    });

    assert.deepEqual(getFocusStacksEffects(context, 100), {
        focusStacksPercent: 5,
        focusCapacity: 5,
        maxStacks: 8,
        focusStacks: 8,
        focusDamagePercent: 40
    });
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

test('elemental synergy: aumenta il flat EP nel calcolo del danno', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        element: 'nature'
    });
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['UR', 5]]);

    const steps = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Nature Damage': { flat: 0, percent: 20 },
            'Energy Regen': { flat: 5, percent: 10 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    // Energy Regen 16.5 → 6 step × 5 = 30.
    assert.equal(steps.damageModifiers.elementalSynergyFlat, 30);
    assert.equal(steps.damageModifiers.elementalPower, 130);
    assert.ok(Math.abs(steps.damageModifiers.damage - 25.2) < 1e-9);
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
    equippedStore.setEquipSlot('ring1', { stats: { 'Thunder Damage': '10%' } });

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

test('potential charge: riduce il ciclo della burst in base ai kill', () => {
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UR1', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    assert.deepEqual(getPotentialChargeEffects(context, 10), {
        potentialChargeSeconds: 4,
        potentialChargeKills: 10,
        cooldownReduction: 40,
        burstCooldown: 0,
        burstCycle: 10
    });

    assert.deepEqual(getPotentialChargeEffects(context, 0), {
        potentialChargeSeconds: 4,
        potentialChargeKills: 0,
        cooldownReduction: 0,
        burstCooldown: 20,
        burstCycle: 30
    });
});

test('potential charge: aumenta Burst DPS e costo energia con i kill', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    }, 'Mage Core');
    build.currentClass = 'mage';
    build.treeLevels.mage = new Map([['UR1', 5]]);

    const steps = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 20, percent: 0 },
            'Attack Energy': { flat: 6, percent: 0 }
        },
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
            potentialChargeKills: 10
        }
    });

    assert.equal(steps.burst.burstCycle, 10);
    assert.ok(Math.abs(steps.burst.burstDps - (20 * 0.75 * (10 / 0.75) / 10)) < 1e-9);
    assert.ok(Math.abs(steps.burst.totalDps - (20 / 0.6 + steps.burst.burstDps)) < 1e-9);
    assert.ok(Math.abs(steps.burst.burstEnergyPerSecond - 5) < 1e-9);
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
            activeEquip: { core: { name: 'Archer Core', stats: {} } }
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
    const context = {
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['UL1', 5], ['R1', 5], ['R1a', 5]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    // hit base 1.6667 + esplosioni 1.3636 = 3.0303 hit/s
    // 50% crit → 1.515 crit/s → 3.030 shard medi → 90.909% EP
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

test('support orbs: la capacità extra è limitata a +3', () => {
    const context = {
        statsValues: { 'Crit Chance': { flat: 0, percent: 100 } },
        build: {
            currentClass: 'mage',
            treeLevels: { mage: new Map([['R2', 5], ['R2a', 3]]) }
        },
        skillTrees: CLASS_SKILL_TREES
    };

    const effects = getSupportOrbEffects(context);
    assert.ok(effects.extraCapacity <= 3 + 1e-9);
});

// --- Special abilities --------------------------------------------------
test('special abilities: parsing nome, danno, key e times', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click',
            note: 'Consumes 1 Spell Rune!'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null,
            note: null
        }
    ]);

    const whirlwind = onClick.find(entry => entry.name === 'Whirlwind-Tempest');
    const smite = passives.find(entry => entry.name === 'Smite-Tempest');

    assert.equal(onClick.length, 1);
    assert.equal(passives.length, 1);
    assert.equal(whirlwind.ability, 'Whirlwind');
    assert.equal(whirlwind.weapon, 'Tempest');
    assert.equal(whirlwind.key, 'rightClick');
    assert.equal(whirlwind.energy, 12);
    assert.equal(whirlwind.damage, 45);
    assert.equal(whirlwind.times, 3); // override
    assert.equal(whirlwind.cooldown, 1.6);
    assert.equal(smite.key, null);
    assert.equal(smite.damage, 150);
    assert.equal(smite.everyHits, 5); // override

    specialAbilityManager.reset();
});

test('special abilities: cooldown override', () => {
    specialAbilityManager.reset();

    SPECIAL_ABILITY_OVERRIDES['Test Strike-Test Weapon'] = { cooldown: 2.5 };
    specialAbilityManager.registerAbilities('Test Weapon', [
        {
            kind: 'ability',
            name: 'Test Strike',
            energy: 10,
            text: 'Deal 100% damage.',
            key: 'F'
        }
    ]);

    const ability = onClick.find(entry => entry.name === 'Test Strike-Test Weapon');
    assert.equal(ability.key, 'f');
    assert.equal(ability.cooldown, 2.5);

    delete SPECIAL_ABILITY_OVERRIDES['Test Strike-Test Weapon'];
    specialAbilityManager.reset();
});

test('special abilities: override per abilità senza danno', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Sporeheart Orb', [
        {
            kind: 'ability',
            name: 'Toxic Gas',
            energy: 20,
            text: 'Poison enemies around you, lowering their Defense by 25%.',
            key: 'Right click'
        }
    ]);

    const toxicGas = onClick.find(entry => entry.name === 'Toxic Gas-Sporeheart Orb');
    assert.equal(toxicGas.damage, 0);

    specialAbilityManager.reset();
});

test('special abilities: più onClick da oggetti diversi', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);
    specialAbilityManager.registerAbilities('Windstorm Greaves', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 35,
            text: 'Create a tornado, moving you forward and dealing 200 damage to enemies in its path.',
            key: 'F'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';
    build.activeEquip.feet = {
        name: 'Windstorm Greaves',
        stats: {},
        augments: ['', '', '']
    };

    const abilities = specialAbilityManager.getActiveOnClick({ build });
    assert.equal(abilities.length, 2);
    assert.deepEqual(
        abilities.map(ability => ability.name),
        ['Whirlwind-Tempest', 'Whirlwind-Windstorm Greaves']
    );
    assert.equal(abilities[1].key, 'f');

    specialAbilityManager.reset();
});

test('special attacks: applicano il reverse del Default Attack', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const manager = new DpsManager({ specialAbilityManager });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 50 }
        },
        skillValues: {},
        build
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.equal(steps.specialAttacks.reverseMultiplier, 100 / 85);
    assert.equal(whirlwind.times, 3);
    assert.equal(whirlwind.cooldown, 1.6);
    assert.equal(whirlwind.enabled, true);
    // 50% crit chance + 50% base crit damage => average multiplier 1.25
    assert.ok(Math.abs(steps.specialAttacks.averageDamage - 50.575) < 1e-9);
    assert.ok(Math.abs(whirlwind.damagePerUse - (50.575 * (100 / 85) * 0.45 * 3)) < 1e-9);
    assert.ok(Math.abs(whirlwind.castsPerSecond - (1 / 1.6)) < 1e-9);
    assert.ok(Math.abs(whirlwind.dps - (50.575 * (100 / 85) * 0.45 * 3) * (1 / 1.6)) < 1e-9);
    assert.ok(Math.abs(whirlwind.energyPerSecond - 7.5) < 1e-9);
    assert.ok(Math.abs(whirlwind.totalDps - (steps.attackSpeed.dps + whirlwind.dps)) < 1e-9);
    assert.ok(Math.abs(whirlwind.energyOnlySpecial - (-7.5)) < 1e-9);
    assert.ok(Math.abs(whirlwind.energyWithAttack - (steps.attackSpeed.energyPerSecond - 7.5)) < 1e-9);
    assert.ok(Math.abs(manager.getDps() - (steps.attackSpeed.dps + whirlwind.dps)) < 1e-9);

    specialAbilityManager.reset();
});

test('special attacks: cooldown override aumenta il cooldown effettivo', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { abilityCooldownOverrides: { 'Whirlwind-Tempest': 3.2 } }
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.ok(Math.abs(whirlwind.castsPerSecond - (1 / 3.2)) < 1e-9);
    assert.ok(Math.abs(whirlwind.dps - (47.6 * 0.45 * 3) * (1 / 3.2)) < 1e-9);

    specialAbilityManager.reset();
});

test('special attacks: includono energia e DPS della burst', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    }, 'Mage Core');
    build.activeEquip.weapon.name = 'Tempest';

    const manager = new DpsManager({ specialAbilityManager });
    const steps = manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 12 }
        },
        skillValues: {},
        build,
        settings: { useBurst: true }
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.ok(steps.burst.enabled);
    assert.ok(Math.abs(whirlwind.totalDps - (steps.burst.totalDps + whirlwind.dps)) < 1e-9);
    assert.ok(Math.abs(
        whirlwind.energyWithAttack - (steps.burst.energyPerSecond - whirlwind.energyPerSecond)
    ) < 1e-9);
    assert.ok(Math.abs(
        steps.attackSpeed.energyPerSecondAttackBurst - steps.burst.energyPerSecond
    ) < 1e-9);
    assert.ok(Math.abs(
        steps.attackSpeed.energyPerSecondAttackBurstSpecial
        - (steps.burst.energyPerSecond - whirlwind.energyPerSecond)
    ) < 1e-9);

    const specialGroup = manager.getStepGroups().find(group => group.id === 'specialAttacks');
    const specialLabels = specialGroup.results.map(row => row.label);
    assert.equal(specialLabels.includes('Energy per Second (Whirlwind + Normal Attack)'), false);
    assert.equal(specialLabels.includes('Sustain (Whirlwind + Normal Attack)'), false);

    specialAbilityManager.reset();
});

test('special attacks: possono essere disabilitate dalle impostazioni', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { disabledSpecialAttacks: ['Whirlwind-Tempest'] }
    });

    const whirlwind = steps.specialAttacks.abilities.find(
        ability => ability.name === 'Whirlwind-Tempest'
    );

    assert.equal(whirlwind.enabled, false);
    assert.equal(whirlwind.dps, 0);
    assert.equal(whirlwind.energyPerSecond, 0);
    assert.equal(steps.specialAttacks.enabled, false);

    specialAbilityManager.reset();
});

test('burst: usa Average Damage con reverse del Default Attack', () => {
    specialAbilityManager.reset();

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    }, 'Mage Core');

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: {
            slowAttack: false,
            attackInterval: null,
            useBurst: true,
            griefUptime: 100,
            lastSorrowUptime: 100,
            focusStacks: 0,
            potentialChargeKills: 0,
            crystalExplosionOverride: false,
            crystalExplosionsPerSecond: 0
        }
    });

    assert.equal(steps.burst.reverseMultiplier, 100 / 85);
    assert.ok(Math.abs(steps.burst.burstDamagePerHit - (47.6 * 0.75)) < 1e-9);
    assert.ok(Math.abs(steps.burst.burstDps - (47.6 * 0.75 * (10 / 0.75) / 30)) < 1e-9);
});

test('passive Smite: danno e hit ogni 5 attacchi con reverse', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 12 }
        },
        skillValues: {},
        build
    });

    const attacksPerSecond = 1 / 0.6;
    const averageDamage = (47.6 * 0.85) * (1 + 0.12 * 0.5);
    const expectedDps = (attacksPerSecond / 5) * (averageDamage * 100 / 85) * 1.5;

    assert.ok(Math.abs(steps.attackSpeed.passiveDps - expectedDps) < 1e-9);
    assert.ok(Math.abs(expectedDps - 25.228) < 1e-3);
    assert.ok(Math.abs(steps.attackSpeed.passiveHitsPerSecond - attacksPerSecond / 5) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.dps - (averageDamage / 0.6 + expectedDps)) < 1e-9);

    const passiveHits = getPassiveHitStats({
        weapon: build.activeEquip.weapon,
        build,
        statsValues: { 'Crit Chance': { flat: 0, percent: 12 } },
        settings: {},
        specialAbilityManager
    });
    assert.ok(Math.abs(passiveHits.hitsPerSecond - attacksPerSecond / 5) < 1e-9);
    assert.ok(Math.abs(passiveHits.nonPassiveHitsPerSecond - attacksPerSecond) < 1e-9);
    assert.ok(Math.abs(passiveHits.totalHitsPerSecond - (attacksPerSecond + attacksPerSecond / 5)) < 1e-9);

    specialAbilityManager.reset();
});

test('smite: anche gli hit di Whirlwind aumentano i proc', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const withWhirlwind = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build
    });

    const withoutWhirlwind = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { disabledSpecialAttacks: ['Whirlwind-Tempest'] }
    });

    const whirlwindHits = 1 / 1.6;
    const expectedSmiteHits = ((1 / 0.6) + whirlwindHits) / 5;

    assert.ok(withWhirlwind.attackSpeed.passiveDps > withoutWhirlwind.attackSpeed.passiveDps);
    assert.ok(Math.abs(withWhirlwind.attackSpeed.passiveHitsPerSecond - expectedSmiteHits) < 1e-9);

    specialAbilityManager.reset();
});

test('smite: burst e altri hit aumentano i proc', () => {
    specialAbilityManager.reset();

    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    }, 'Mage Core');
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Arcane Damage': { flat: 47.6, percent: 0 } },
        skillValues: {},
        build,
        settings: { useBurst: true }
    });

    const attacksPerSecond = 1 / 0.6;
    assert.ok(steps.burst.enabled);
    assert.ok(steps.attackSpeed.passiveHitsPerSecond > attacksPerSecond / 5);

    specialAbilityManager.reset();
});

test('ability speciali: Toxic Gas aumenta il danno del 25%', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Sporeheart Orb', [
        {
            kind: 'ability',
            name: 'Toxic Gas',
            energy: 20,
            text: 'Poison enemies around you, lowering their Defense by 25%.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Aura',
        'Default Attack': 60,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Sporeheart Orb';

    const statsValues = { 'Aura Damage': { flat: 33.1, percent: 0 } };
    const enabled = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build
    });
    const disabled = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { disabledSpecialAttacks: ['Toxic Gas-Sporeheart Orb'] }
    });

    assert.ok(Math.abs(enabled.damageMultiplier.damage - disabled.damageMultiplier.damage * 1.25) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Astro Break può scegliere tra 150% e 300%', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Astralweaver', [
        {
            kind: 'ability',
            name: 'Astro Break',
            energy: 16,
            text: 'Fire an orb of dark matter, slowly growing and dealing 150-300% damage based on its size.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Astralweaver';

    const statsValues = { 'Arcane Damage': { flat: 40.7, percent: 0 } };
    const at150 = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityDamageOverrides: { 'Astro Break-Astralweaver': 150 } }
    });
    const at300 = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityDamageOverrides: { 'Astro Break-Astralweaver': 300 } }
    });

    const a150 = at150.specialAttacks.abilities[0];
    const a300 = at300.specialAttacks.abilities[0];
    assert.equal(a150.damagePercent, 150);
    assert.equal(a300.damagePercent, 300);
    assert.ok(Math.abs(a300.dps - a150.dps * 2) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Bug Vitality usa il numero di hit scelto', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Glowbug Staff', [
        {
            kind: 'ability',
            name: 'Bug Vitality',
            energy: 12,
            text: 'Spawn a bug that homes towards the target, dealing 75% damage and heals you for 1% Health every hit. Can hit multiple times.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 150,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Glowbug Staff';

    const statsValues = { 'Arcane Damage': { flat: 35.3, percent: 0 } };
    const one = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityHitCountOverrides: { 'Bug Vitality-Glowbug Staff': 1 } }
    });
    const five = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { abilityHitCountOverrides: { 'Bug Vitality-Glowbug Staff': 5 } }
    });

    const oneHit = one.specialAttacks.abilities[0];
    const fiveHits = five.specialAttacks.abilities[0];
    assert.equal(oneHit.times, 1);
    assert.equal(fiveHits.times, 5);
    assert.equal(fiveHits.hitsPerUse, 5);
    assert.ok(Math.abs(fiveHits.damagePerUse - oneHit.damagePerUse * 5) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Death Ledger fa 28 hit ogni 14s', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Voras Deathnote', [
        {
            kind: 'ability',
            name: 'Death Ledger',
            energy: 40,
            text: 'The note will target nearby enemies, dealing 30% damage every 0.5s.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Illusion',
        'Default Attack': 120,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Voras Deathnote';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: { 'Illusion Damage': { flat: 41.3, percent: 0 } },
        skillValues: {},
        build
    });

    const deathLedger = steps.specialAttacks.abilities[0];
    assert.equal(deathLedger.cooldown, 14);
    assert.equal(deathLedger.times, 28);
    assert.equal(deathLedger.hitsPerUse, 28);
    assert.ok(Math.abs(deathLedger.hitsPerSecond - 2) < 1e-9);

    specialAbilityManager.reset();
});

test('ability speciali: Runic Knuckles aggiunge 1 hit per swing', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Runic Putrifists', [
        {
            kind: 'ability',
            name: 'Runic Knuckles',
            energy: 30,
            text: 'Spawn a portal that will throw fists whenever you swing, for 4s.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Aura',
        'Default Attack': 60,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Runic Putrifists';

    const statsValues = { 'Aura Damage': { flat: 35.3, percent: 0 } };
    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build
    });

    const runic = steps.specialAttacks.abilities[0];
    assert.equal(runic.cooldown, 4);
    assert.ok(Math.abs(runic.extraHitsPerSecond - (1 / 0.6)) < 1e-9);
    assert.ok(runic.hitsPerSecond >= 1 / 0.6);
    assert.ok(runic.dps > 0);

    const slowSteps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues,
        skillValues: {},
        build,
        settings: { slowAttack: true, attackInterval: 0.3 }
    });
    const slowRunic = slowSteps.specialAttacks.abilities[0];
    assert.ok(Math.abs(slowRunic.extraHitsPerSecond - (1 / 0.3)) < 1e-9);

    specialAbilityManager.reset();
});

test('ability costs: riducono il costo energetico delle special attack', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Ability Costs': { flat: 0, percent: -50 }
        },
        skillValues: {},
        build
    });

    const whirlwind = steps.specialAttacks.abilities[0];
    assert.equal(whirlwind.energyCost, 6);
    assert.ok(Math.abs(whirlwind.energyPerSecond - 3.75) < 1e-9);

    specialAbilityManager.reset();
});

test('damage breakdown: le fonti sommano correttamente', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';
    build.currentClass = 'mage';
    build.treeLevels = { mage: new Map([['L2', 5]]) };

    const manager = new DpsManager({ specialAbilityManager });
    manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 47.6, percent: 0 },
            'Crit Chance': { flat: 0, percent: 12 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    const breakdown = manager.getDamageBreakdown();
    const sourcesTotal = breakdown.sources.reduce((sum, source) => sum + source.dps, 0);
    assert.ok(Math.abs(sourcesTotal - breakdown.total) < 1e-9);
    assert.ok(Math.abs(
        breakdown.sources.reduce((sum, source) => sum + source.percent, 0) - 100
    ) < 1e-9);

    assert.deepEqual(
        breakdown.sources.map(source => source.label).sort(),
        ['Attack', 'Smite-Tempest', 'Whirlwind']
    );
    assert.equal(breakdown.modifiers, undefined);

    specialAbilityManager.reset();
});

test('royal praise: Ability 2 registrata dall override e applica i suoi effetti', () => {
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

    const context = {
        build,
        skillTrees: CLASS_SKILL_TREES,
        statsValues: {},
        settings: {}
    };

    assert.equal(
        specialAbilityManager.getAbilityElementalPowerPercent(context),
        25
    );
    assert.equal(
        specialAbilityManager.getElementalResistancePercent(context, 'nature'),
        -20
    );
    assert.equal(
        specialAbilityManager.getElementalResistancePercent(context, 'thunder'),
        0
    );

    const steps = new DpsManager({ specialAbilityManager }).recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Nature Damage': { flat: 0, percent: 5 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.ok(Math.abs(steps.damageModifiers.abilityElementalPowerPercent - 25) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.elementalResistancePercent + 20) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.elementalPower - 125) < 1e-9);
    assert.ok(Math.abs(steps.damageModifiers.damage - 131.25) < 1e-9);

    specialAbilityManager.reset();
});

test('soil infestation: 25% danno subito in piu e nessun danno diretto', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Gloomfang Mace', [
        {
            kind: 'ability',
            name: 'Soil Infestation',
            energy: 20,
            text: 'Infest the area around you, making nearby enemies take 25% more damage.',
            key: 'Right click'
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Gloomfang Mace';

    const context = { build, statsValues: {}, settings: {} };
    assert.equal(specialAbilityManager.getDamageTakenIncreasePercent(context), 25);

    const entries = specialAbilityManager.getOnClickCastStats(context).entries;
    assert.equal(entries[0].damage, 0);

    const manager = new DpsManager({ specialAbilityManager });
    manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });
    const multiplierRows = manager.getStepGroups()
        .find(group => group.id === 'damageMultiplier').results
        .map(row => row.label);
    assert.ok(multiplierRows.includes('Damage%'));

    specialAbilityManager.reset();
});

test('cambio oggetto: non corrompe le definizioni delle abilità', () => {
    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Tempest', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 85,
        'Weapon Type': 'magic'
    });
    build.activeEquip.weapon.name = 'Tempest';
    build.activeEquip.weapon.stats['Ability 1'] = 'Whirlwind';
    build.activeEquip.weapon.stats['Ability 2'] = 'Smite';

    const context = { build, statsValues: {}, settings: {} };
    assert.equal(specialAbilityManager.getActiveOnClick(context).length, 1);
    assert.equal(specialAbilityManager.getActivePassives(context).length, 1);

    const whirlwind = onClick.find(entry => entry.name === 'Whirlwind-Tempest');
    const smite = passives.find(entry => entry.name === 'Smite-Tempest');

    assert.equal(whirlwind.damage, 45);
    assert.equal(whirlwind.energy, 12);
    assert.equal(whirlwind.times, 3);
    assert.equal(smite.damage, 150);
    assert.equal(smite.everyHits, 5);
    assert.ok(!onClick.some(entry => entry.name === 'Smite-Tempest'));

    specialAbilityManager.reset();
});

test('modale oggetto: rimuovere o rinominare Ability aggiorna le abilità attive', () => {
    const { dataStore, equippedStore } = makeWorld();
    const itemManager = new ItemManager({ dataStore, equippedStore });

    specialAbilityManager.reset();
    specialAbilityManager.registerAbilities('Test Blade', [
        {
            kind: 'ability',
            name: 'Whirlwind',
            energy: 12,
            text: 'Cast three tornadoes on the ground, dealing 45% damage each.',
            key: 'Right click'
        },
        {
            kind: 'passive',
            name: 'Smite',
            energy: null,
            text: 'Strike lightning every fifth attack, dealing 150% damage to nearby enemies.',
            key: null
        }
    ]);

    equippedStore.setEquipSlot('weapon', {
        name: 'Test Blade',
        stats: {
            'Ability 1': 'Whirlwind',
            'Ability 2': 'Smite'
        },
        augments: ['', '', '']
    });

    const context = () => ({ build: equippedStore.state, statsValues: {}, settings: {} });

    assert.deepEqual(
        specialAbilityManager.getActiveOnClick(context()).map(a => a.ability),
        ['Whirlwind']
    );
    assert.deepEqual(
        specialAbilityManager.getActivePassives(context()).map(a => a.ability),
        ['Smite']
    );

    // Rimuove Ability 2 dal modale.
    itemManager.saveCustomItem('weapon', 'Test Blade', [
        { name: 'Ability 1', value: 'Whirlwind' }
    ]);

    assert.equal(equippedStore.state.activeEquip.weapon.abilitiesEdited, true);
    assert.deepEqual(
        specialAbilityManager.getActiveOnClick(context()).map(a => a.ability),
        ['Whirlwind']
    );
    assert.deepEqual(specialAbilityManager.getActivePassives(context()), []);

    // Rinomina Ability 1 in Smite: Whirlwind sparisce, Smite diventa passiva.
    itemManager.saveCustomItem('weapon', 'Test Blade', [
        { name: 'Ability 1', value: 'Smite' }
    ]);

    assert.deepEqual(specialAbilityManager.getActiveOnClick(context()), []);
    assert.deepEqual(
        specialAbilityManager.getActivePassives(context()).map(a => a.ability),
        ['Smite']
    );

    specialAbilityManager.reset();
});

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

test('enemy simulator: Damage% modifica il danno prima della difesa', () => {
    const result = simulateEnemy({
        health: 200,
        defense: 100,
        damagePercent: 20,
        firstHitDamage: 100,
        dps: 100,
        energyPerSecond: 0,
        maxEnergy: 100
    });

    assert.equal(result.damagePercent, 20);
    assert.equal(result.firstHitDamage, 120);
    assert.equal(result.dps, 120);
    assert.equal(result.realFirstHitDamage, applyDefenseDamage(120, 100));

    const negative = simulateEnemy({
        health: 200,
        defense: 0,
        damagePercent: -20,
        firstHitDamage: 100,
        dps: 100,
        energyPerSecond: 0,
        maxEnergy: 100
    });
    assert.equal(negative.realFirstHitDamage, 80);
});

test('enemy simulator: formula difesa e oneshot', () => {
    assert.equal(applyDefenseDamage(100, 0), 100);
    assert.ok(Math.abs(applyDefenseDamage(100, 100) - 59.09090909090909) < 1e-9);

    const oneshot = simulateEnemy({
        health: 50,
        defense: 0,
        firstHitDamage: 100,
        dps: 200,
        energyPerSecond: -1,
        maxEnergy: 100
    });

    assert.equal(oneshot.oneshot, true);
    assert.equal(oneshot.timeToKill, 0);
    assert.equal(oneshot.potionsNeeded, 0);
    assert.equal(oneshot.realFirstHitDamage, 100);
});

test('enemy simulator: tempo, pozioni e cast right-click', () => {
    const result = simulateEnemy({
        health: 1000,
        defense: 0,
        firstHitDamage: 20,
        dps: 10,
        energyPerSecond: -10,
        maxEnergy: 100,
        abilities: [
            {
                name: 'Whirlwind',
                enabled: true,
                castsPerSecond: 0.5,
                damagePercent: 45,
                damageTakenIncreasePercent: 0,
                extraHitsPerSecond: 0
            }
        ]
    });

    assert.equal(result.oneshot, false);
    assert.ok(Math.abs(result.timeToKill - 98) < 1e-9);
    assert.equal(result.potionsNeeded, Math.ceil((10 * 98 - 100) / 25));
    assert.equal(result.potionCooldownEnough, true);
    assert.deepEqual(result.abilities, [{ name: 'Whirlwind', casts: 49 }]);
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

test('augment: parsing nomi e suggerimenti per slot', () => {
    assert.equal(parseAugment('Hunter 1').augment.name, 'Hunter');
    assert.equal(parseAugment('Hunter 5').level.level, 5);
    assert.equal(parseAugment('Hunter 5').level.value, 65);
    assert.equal(parseAugment('Arcane Damage 3').level.value, 9);
    assert.equal(parseAugment('Hunter'), null);
    assert.equal(parseAugment('Hunter 6').level.value, 75);
    assert.equal(parseAugment('Hunter 7'), null);

    const weapon = getAugmentSuggestions('weapon');
    const armor = getAugmentSuggestions('armor');

    assert.ok(weapon.includes('Hunter 1'));
    assert.ok(weapon.includes('Arcane Damage 5'));
    assert.ok(weapon.includes('Illusion Damage 6'));
    assert.equal(parseAugment('Illusion Damage 6').level.value, 15);
    assert.ok(!weapon.includes('Arcane Defense 1'));

    assert.ok(armor.includes('Arcane Defense 1'));
    assert.ok(armor.includes('Arcane Defense 5'));
    assert.ok(!armor.includes('Hunter 1'));
});

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

test('augment: il bonus del tipo di danno vale solo per il tipo dell arma', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Illusion',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Illusion Damage': 20
    });
    build.activeEquip.weapon.augments = ['Arcane Damage 1', '', ''];
    build.treeLevels = { warrior: new Map(), archer: new Map(), mage: new Map() };

    const { statsValues } = selectStats({ skillTrees: CLASS_SKILL_TREES }, build);
    const steps = new DpsManager().recalculate({
        statsValues,
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    assert.equal(steps.augmentFinal.damageStatPercent, 0);
    assert.ok(Math.abs(steps.augmentFinal.damage - 20) < 1e-9);
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

test('augment: gli augment armor non valgono sull arma e viceversa', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 20
    });
    build.activeEquip.weapon.augments = ['Arcane Defense 1', '', ''];
    build.activeEquip.helmet = { name: 'Helmet', stats: {}, augments: ['Hunter 1', '', ''] };

    const bonuses = getAugmentStatBonuses(build);
    assert.equal(bonuses.length, 0);
});

test('augment: First Strike vale solo sul first hit', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['First Strike 1', '', ''];

    const normal = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });
    const firstHit = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { firstHit: true }
    });

    assert.ok(Math.abs(normal.criticalDamage.averageDamage - 100) < 1e-9);
    assert.ok(Math.abs(firstHit.augmentFinal.damage - 120) < 1e-9);
    assert.ok(Math.abs(firstHit.criticalDamage.averageDamage - 100) < 1e-9);
});

test('augment: Combo, Chain Lightning e Deathburst producono DPS extra', () => {
    const comboBuild = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    comboBuild.activeEquip.weapon.augments = ['Combo 1', '', ''];
    const combo = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build: comboBuild,
        skillTrees: CLASS_SKILL_TREES
    });
    assert.ok(Math.abs(combo.augmentDamage.comboDps - 12.5) < 1e-9);

    const chainBuild = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    chainBuild.activeEquip.weapon.augments = ['Chain Lightning 1', '', ''];
    const chain = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build: chainBuild,
        skillTrees: CLASS_SKILL_TREES
    });
    assert.ok(Math.abs(chain.augmentDamage.chainLightningDps - 15) < 1e-9);

    const deathBuild = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    deathBuild.activeEquip.weapon.augments = ['Deathburst 1', '', ''];
    const death = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build: deathBuild,
        skillTrees: CLASS_SKILL_TREES
    });
    assert.ok(Math.abs(death.augmentDamage.deathburstDps - 25) < 1e-9);
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

test('augment final: applicato dopo critici e prima del DPS', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['Hunter 1', '', ''];

    const steps = new DpsManager().recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { executionHpPercent: 50, prosecutionHpPercent: 50, enragedHpPercent: 50 }
    });

    assert.ok(Math.abs(steps.criticalDamage.damage - 150) < 1e-9);
    assert.ok(Math.abs(steps.augmentFinal.damage - 187.5) < 1e-9);
    assert.ok(Math.abs(steps.attackSpeed.damage - 187.5) < 1e-9);

    const manager = new DpsManager();
    manager.recalculate({
        statsValues: {
            'Arcane Damage': { flat: 100, percent: 0 },
            'Crit Chance': { flat: 0, percent: 100 }
        },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { executionHpPercent: 50, prosecutionHpPercent: 50, enragedHpPercent: 50 }
    });
    const group = manager.getStepGroups().find(entry => entry.id === 'damageMultiplier');
    const damageRow = group.results.find(row => row.label === 'Damage');
    assert.ok(Math.abs(damageRow.value - 187.5) < 1e-9);
});

test('augment: le righe sono dentro Damage Multiplier, senza sezione Augments', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['Combo 1', '', ''];

    const manager = new DpsManager();
    manager.recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES
    });

    const groups = manager.getStepGroups();
    const multiplier = groups.find(group => group.id === 'damageMultiplier');
    assert.ok(multiplier);
    assert.ok(multiplier.results.some(row => row.label === 'Combo DPS'));
    assert.ok(multiplier.results.some(row => row.label === 'Augment DPS'));
    assert.ok(!groups.some(group => group.id === 'augmentDamage'));
});

test('augment: due Infected non si stackano', () => {
    const build = makeDamageBuild({
        'Damage Type': 'Arcane',
        'Default Attack': 100,
        'Weapon Type': 'magic',
        'Arcane Damage': 100
    });
    build.activeEquip.weapon.augments = ['Infected 1', 'Infected 1', ''];

    const steps = new DpsManager().recalculate({
        statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
        skillValues: {},
        build,
        skillTrees: CLASS_SKILL_TREES,
        settings: { infectedHitsOverride: 10 }
    });

    // Un solo Infected 1: 10 hit × 1.5% = 15%. Il secondo non si somma.
    assert.ok(Math.abs(steps.augmentFinal.infectedPercent - 15) < 1e-9);
});

test('augment: Hunter, Prosecution, Enraged, Execution e Infected sono additivi', () => {
    const make = augment => {
        const build = makeDamageBuild({
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            'Arcane Damage': 100
        });
        build.activeEquip.weapon.augments = [augment, '', ''];
        return new DpsManager().recalculate({
            statsValues: { 'Arcane Damage': { flat: 100, percent: 0 } },
            skillValues: {},
            build,
            skillTrees: CLASS_SKILL_TREES,
            settings: {
                executionHpPercent: 50,
                prosecutionHpPercent: 50,
                enragedHpPercent: 50,
                infectedHitsOverride: 10
            }
        });
    };

    const hunter = make('Hunter 1');
    assert.ok(Math.abs(hunter.augmentFinal.hunterPercent - 25) < 1e-9);

    const hunter5 = make('Hunter 5');
    assert.ok(hunter5.augmentFinal.hunterPercent > hunter.augmentFinal.hunterPercent);
    assert.ok(Math.abs(hunter5.augmentFinal.hunterPercent - 65) < 1e-9);

    const prosecution = make('Prosecution 1');
    assert.ok(Math.abs(prosecution.augmentFinal.prosecutionPercent - 7.5) < 1e-9);

    const enraged = make('Enraged 1');
    assert.ok(Math.abs(enraged.augmentFinal.enragedPercent - 7.5) < 1e-9);

    const execution = make('Execution 1');
    assert.ok(Math.abs(execution.augmentFinal.executionPercent - 10) < 1e-9);

    const infected = make('Infected 1');
    assert.ok(Math.abs(infected.augmentFinal.infectedPercent - 15) < 1e-9);
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

test('enemy simulator: First Strike aggiunge 0.6s al tempo di kill', () => {
    const base = {
        health: 1000,
        defense: 0,
        firstHitDamage: 100,
        dps: 100,
        energyPerSecond: 0,
        maxEnergy: 100
    };

    const without = simulateEnemy(base);
    const withFirstStrike = simulateEnemy({ ...base, firstStrikePercent: 20 });

    assert.ok(Math.abs(without.timeToKill - 9) < 1e-9);
    assert.ok(Math.abs(withFirstStrike.timeToKill - 9.6) < 1e-9);
});

// --- Override manuali degli oggetti --------------------------------------
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

test('ApiManager: Giant Log mantiene flat e percentuale di Blunt Damage', () => {
    const manager = new ApiManager({ dataStore: {} });
    const stats = manager.formatGearStats({
        damageType: 'Blunt',
        defaultAttack: 175,
        normalAttack: { min: 73.68, max: 73.68 },
        slot: 'Hammer',
        stats: [
            { stat: 'Blunt Damage', percent: false, max: 42.1 },
            { stat: 'Blunt Damage', percent: true, max: 18 },
            { stat: 'Crit Damage', percent: true, max: 60.9 }
        ]
    }, 'weapon', null, 'Giant Log');

    assert.equal(stats['Blunt Damage'], 42.1);
    assert.equal(stats['Blunt Damage%'], '18%');
    assert.equal(stats['Crit Damage'], '60.9%');
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

