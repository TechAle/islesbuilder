import { describe, expect, it } from 'vitest';
import { SkillTreeManager } from '../../../js/modules/skillTreeManager.js';
import { makeWorld } from '../../helpers/data.js';

describe('skill tree costs', () => {
    it('calculates invested cost with the cumulative formula', () => {
        const { dataStore, equippedStore } = makeWorld();
        const manager = new SkillTreeManager({ dataStore, equippedStore });

        expect(manager.getInvestedCost('C', 0)).toBe(0);
        expect(manager.getInvestedCost('C', 1)).toBe(1);
        expect(manager.getInvestedCost('C', 3)).toBe(6);
        expect(manager.getInvestedCost('L', 2)).toBe(9);
        expect(manager.getInvestedCost('DR1', 5)).toBe(15);
    });

    it('does not exceed the node maximum', () => {
        const { dataStore, equippedStore } = makeWorld();
        equippedStore.setCurrentClass('mage');
        equippedStore.setSharedPoints(500);
        const manager = new SkillTreeManager({ dataStore, equippedStore });

        for (let i = 0; i < 20; i++) {
            manager.handleNodeClick('C', { shiftKey: false });
        }

        expect(equippedStore.state.treeLevels.mage.get('C')).toBe(10);
        expect(equippedStore.state.sharedPoints).toBe(500 - 55);
    });

    it('refunds descendants that become orphaned', () => {
        const { dataStore, equippedStore } = makeWorld();
        equippedStore.setCurrentClass('mage');
        equippedStore.setSharedPoints(100);
        const manager = new SkillTreeManager({ dataStore, equippedStore });

        manager.handleNodeClick('C', { shiftKey: false });
        manager.handleNodeClick('L', { shiftKey: false });
        manager.handleNodeClick('L1', { shiftKey: false });
        manager.handleNodeClick('L1a', { shiftKey: false });

        const spentBefore = equippedStore.state.sharedPoints;
        expect(spentBefore).toBe(100 - 1 - 3 - 2 - 1);

        manager.handleNodeClick('C', { shiftKey: true });

        expect(equippedStore.state.treeLevels.mage.get('C')).toBe(0);
        expect(equippedStore.state.treeLevels.mage.get('L')).toBe(0);
        expect(equippedStore.state.treeLevels.mage.get('L1')).toBe(0);
        expect(equippedStore.state.treeLevels.mage.get('L1a')).toBe(0);
        expect(equippedStore.state.sharedPoints).toBe(100);
    });
});
