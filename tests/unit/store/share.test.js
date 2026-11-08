import { describe, expect, it } from 'vitest';
import { ShareManager } from '../../../js/modules/shareManager.js';
import { makeWorld } from '../../helpers/data.js';

function shareFor(world) {
    return new ShareManager({
        dataStore: world.dataStore,
        equippedStore: world.equippedStore,
        location: { origin: 'https://example.com', pathname: '/' }
    });
}

function hashFor(payload) {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
}

describe('ShareManager', () => {
    it('pads short augment arrays to the configured maximum', () => {
        const world = makeWorld();
        const share = shareFor(world);
        const hash = hashFor({
            equip: {
                weapon: {
                    name: 'Test Weapon',
                    stats: {},
                    augments: ['Hunter 1']
                }
            },
            elixirs: [],
            treeLevels: {},
            currentClass: 'mage',
            sharedPoints: 80
        });

        expect(share.loadFromHash(hash)).toBe(true);
        expect(world.equippedStore.state.activeEquip.weapon.augments).toEqual(['Hunter 1', '']);
    });

    it('truncates old builds with more augments than the maximum', () => {
        const world = makeWorld();
        const share = shareFor(world);
        const hash = hashFor({
            equip: {
                weapon: {
                    name: 'Test Weapon',
                    stats: {},
                    augments: ['Hunter 1', 'Infected 1', 'Combo 1']
                }
            },
            elixirs: [],
            treeLevels: {},
            currentClass: 'mage',
            sharedPoints: 80
        });

        expect(share.loadFromHash(hash)).toBe(true);
        expect(world.equippedStore.state.activeEquip.weapon.augments).toEqual(['Hunter 1', 'Infected 1']);
    });

    it('ignores an invalid current class from a shared build', () => {
        const world = makeWorld();
        const share = shareFor(world);
        const before = world.equippedStore.state.currentClass;
        const hash = hashFor({
            equip: {},
            elixirs: [],
            treeLevels: {},
            currentClass: 'invalid-class',
            sharedPoints: 80
        });

        expect(share.loadFromHash(hash)).toBe(true);
        expect(world.equippedStore.state.currentClass).toBe(before);
    });
});
