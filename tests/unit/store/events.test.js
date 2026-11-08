import { describe, expect, it } from 'vitest';
import { makeWorld } from '../../helpers/data.js';

function recordEvents(store, names) {
    const fired = [];
    for (const name of names) {
        store.subscribe(name, () => fired.push(name));
    }
    return fired;
}

describe('store events', () => {
    it('emits equip only for equipment mutations', () => {
        const { equippedStore } = makeWorld();
        const fired = recordEvents(equippedStore, ['equip', 'skills', 'elixirs', 'class']);

        equippedStore.setEquipSlot('weapon', { name: 'Test' });
        equippedStore.setAugment('weapon', 0, 'Hunter 1');
        equippedStore.setUpgradeLevel('weapon', 3);

        expect(fired).toEqual(['equip', 'equip', 'equip']);
    });

    it('emits skills for shared points and skill levels', () => {
        const { equippedStore } = makeWorld();
        const fired = recordEvents(equippedStore, ['equip', 'skills', 'elixirs', 'class']);

        equippedStore.setSharedPoints(80);
        equippedStore.applySkillLevels('mage', new Map([['C', 1]]), 79);

        expect(fired).toEqual(['skills', 'skills']);
    });

    it('emits elixirs only for elixir mutations', () => {
        const { equippedStore } = makeWorld();
        equippedStore.syncElixirs([
            { id: 'test', name: 'Test', stat: 'Arcane Damage', val: 0, perLevel: 1, percent: true }
        ]);
        const fired = recordEvents(equippedStore, ['equip', 'skills', 'elixirs', 'class']);

        equippedStore.setElixirValue(0, 3);
        equippedStore.setAllElixirValues(5);

        expect(fired).toEqual(['elixirs', 'elixirs']);
    });

    it('emits class only for a valid class change', () => {
        const { equippedStore } = makeWorld();
        const fired = recordEvents(equippedStore, ['equip', 'skills', 'elixirs', 'class']);

        equippedStore.setCurrentClass('mage');
        equippedStore.setCurrentClass('invalid');

        expect(fired).toEqual(['class']);
        expect(equippedStore.state.currentClass).toBe('mage');
    });

    it('emits all when the whole state is replaced', () => {
        const { equippedStore } = makeWorld();
        const fired = recordEvents(equippedStore, ['all']);

        equippedStore.setState({ sharedPoints: 42 });

        expect(fired).toEqual(['all']);
        expect(equippedStore.state.sharedPoints).toBe(42);
    });

    it('clears listeners on unsubscribe', () => {
        const { equippedStore } = makeWorld();
        let count = 0;
        const off = equippedStore.subscribe('equip', () => count++);

        equippedStore.setEquipSlot('weapon', { name: 'A' });
        off();
        equippedStore.setEquipSlot('weapon', { name: 'B' });

        expect(count).toBe(1);
    });

    it('DataStore emits the updated domain event', () => {
        const { dataStore } = makeWorld();
        const fired = recordEvents(dataStore, ['items', 'augments', 'elixirs', 'skills']);

        dataStore.updateData({ augments: [] }, 'augments');

        expect(fired).toEqual(['augments']);
    });
});
