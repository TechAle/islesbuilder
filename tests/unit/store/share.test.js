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

    it('clamps shared tree levels to node maxima and ignores unknown nodes', () => {
        const world = makeWorld();
        const share = shareFor(world);
        const hash = hashFor({
            equip: {},
            elixirs: [],
            treeLevels: {
                warrior: [],
                archer: [],
                mage: [['C', 99], ['NOPE', 5]]
            },
            currentClass: 'mage',
            sharedPoints: -5
        });

        expect(share.loadFromHash(hash)).toBe(true);
        expect(world.equippedStore.state.treeLevels.mage.get('C')).toBe(10);
        expect(world.equippedStore.state.treeLevels.mage.has('NOPE')).toBe(false);
        expect(world.equippedStore.state.sharedPoints).toBe(0);
    });
 
    it('drops shared skill nodes whose prerequisites are missing', () => {
        const world = makeWorld();
        const share = shareFor(world);
        const hash = hashFor({
            equip: {},
            elixirs: [],
            treeLevels: {
                warrior: [],
                archer: [],
                mage: [['C', 1], ['DR1', 5]]
            },
            currentClass: 'mage',
            sharedPoints: 80
        });

        expect(share.loadFromHash(hash)).toBe(true);
        expect(world.equippedStore.state.treeLevels.mage.get('C')).toBe(1);
        expect(world.equippedStore.state.treeLevels.mage.has('DR1')).toBe(false);
    });
 
    it('clamps shared elixir levels to the configured maximum', () => {
        const world = makeWorld();
        world.equippedStore.syncElixirs([
            { id: 'test', name: 'Test', stat: 'Arcane Damage', val: 0, perLevel: 1, percent: true }
        ]);
        const share = shareFor(world);
        const hash = hashFor({
            equip: {},
            elixirs: [{ id: 'test', val: 999 }],
            treeLevels: {},
            currentClass: 'mage',
            sharedPoints: 80
        });

        expect(share.loadFromHash(hash)).toBe(true);
        expect(world.equippedStore.state.elixirs[0].val).toBe(5);
    });
 });
