import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import {
    SkillTreeManager,
    CLASS_SKILL_TREES,
    makeWorld
} from '../../helpers/legacyRuntime.js';

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
