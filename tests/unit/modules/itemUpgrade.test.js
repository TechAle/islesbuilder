import { describe, expect, it } from 'vitest';
import { getItemBaseLevel, getMaxUpgradeLevel, clampUpgradeLevel } from '../../../js/modules/itemUpgrade.js';
import { ItemManager } from '../../../js/modules/itemManager.js';
import { selectStats } from '../../../js/store/selectors.js';
import { makeDataStore, makeWorld } from '../../helpers/data.js';
import { makeBuild } from '../../helpers/build.js';

describe('item upgrade levels', () => {
    it('reads the base level from item stats', () => {
        expect(getItemBaseLevel({ stats: { Level: 26 } })).toBe(26);
        expect(getItemBaseLevel({ stats: { Level: '12.5' } })).toBe(12.5);
        expect(getItemBaseLevel({ stats: {} })).toBe(0);
        expect(getItemBaseLevel(null)).toBe(0);
    });

    it('allows upgrades up to final level 35', () => {
        expect(getMaxUpgradeLevel({ stats: { Level: 0 } })).toBe(35);
        expect(getMaxUpgradeLevel({ stats: { Level: 26 } })).toBe(9);
        expect(getMaxUpgradeLevel({ stats: { Level: 30 } })).toBe(5);
        expect(getMaxUpgradeLevel({ stats: { Level: 35 } })).toBe(0);
        expect(getMaxUpgradeLevel({ stats: { Level: 99 } })).toBe(0);
    });

    it('clamps negative, decimal and too-high upgrade values', () => {
        expect(clampUpgradeLevel({ stats: { Level: 20 } }, -4)).toBe(0);
        expect(clampUpgradeLevel({ stats: { Level: 20 } }, 3.9)).toBe(3);
        expect(clampUpgradeLevel({ stats: { Level: 20 } }, 99)).toBe(15);
    });

    it('scales flat and percent stats with the upgrade multiplier', () => {
        const build = makeBuild({
            weapon: {
                name: 'Upgrade Dummy',
                stats: {
                    'Damage Type': 'Arcane',
                    'Default Attack': 100,
                    'Weapon Type': 'magic',
                    'Arcane Damage': 10,
                    'Crit Chance': '10%'
                }
            },
            upgradeLevel: 35
        });

        const { statsValues } = selectStats({ skillTrees: { warrior: { nodes: {} }, archer: { nodes: {} }, mage: { nodes: {} } } }, build);
        const multiplier = 1 + 35 * 0.066;

        expect(statsValues['Arcane Damage'].flat).toBeCloseTo(10 * multiplier, 10);
        expect(statsValues['Crit Chance'].percent).toBeCloseTo(10 * multiplier, 10);
    });
});

describe('ItemManager', () => {
    function setup() {
        const dataStore = makeDataStore();
        dataStore.data.items.weapon = [
            {
                name: 'Dummy Sword',
                stats: {
                    'Slash Damage': 20,
                    'Default Attack': 100,
                    'Damage Type': 'Slash',
                    'Weapon Type': 'melee'
                }
            }
        ];
        const { equippedStore } = makeWorld();
        const manager = new ItemManager({ dataStore, equippedStore });
        return { dataStore, equippedStore, manager };
    }

    it('applies a known preset and resets upgrade/abilities', () => {
        const { equippedStore, manager } = setup();
        manager.handleItemInput('weapon', 'Dummy Sword');

        expect(equippedStore.state.activeEquip.weapon.name).toBe('Dummy Sword');
        expect(equippedStore.state.activeEquip.weapon.stats['Slash Damage']).toBe(20);
        expect(equippedStore.state.activeEquip.weapon.upgradeLevel).toBe(0);
        expect(equippedStore.state.activeEquip.weapon.abilitiesEdited).toBe(false);
    });

    it('creates a custom item when the name is unknown', () => {
        const { equippedStore, manager } = setup();
        manager.handleItemInput('weapon', 'Custom Blade');

        expect(equippedStore.state.activeEquip.weapon.name).toBe('Custom Blade');
        expect(equippedStore.state.activeEquip.weapon.stats).toEqual({});
    });

    it('clears the slot when the name is empty', () => {
        const { equippedStore, manager } = setup();
        manager.handleItemInput('weapon', 'Dummy Sword');
        manager.handleItemInput('weapon', '');

        expect(equippedStore.state.activeEquip.weapon.name).toBe('');
        expect(equippedStore.state.activeEquip.weapon.stats).toEqual({});
        expect(equippedStore.state.activeEquip.weapon.augments).toEqual(['', '']);
    });

    it('ignores augment indexes outside the configured maximum', () => {
        const { equippedStore, manager } = setup();
        manager.handleAugmentInput('weapon', 0, 'Hunter 1');
        manager.handleAugmentInput('weapon', 1, 'Infected 1');
        manager.handleAugmentInput('weapon', 2, 'Combo 1');

        expect(equippedStore.state.activeEquip.weapon.augments).toEqual(['Hunter 1', 'Infected 1']);
    });

    it('saves custom stats from modal rows', () => {
        const { equippedStore, manager } = setup();
        manager.saveCustomItem('weapon', 'Custom Stats', [
            { name: 'Arcane Damage', value: '42' },
            { name: 'Crit Chance', value: '7.5%' },
            { name: '', value: 'ignored' }
        ]);

        expect(equippedStore.state.activeEquip.weapon.name).toBe('Custom Stats');
        expect(equippedStore.state.activeEquip.weapon.stats).toEqual({
            'Arcane Damage': 42,
            'Crit Chance': '7.5%'
        });
        expect(equippedStore.state.activeEquip.weapon.abilitiesEdited).toBe(true);
    });

    it('returns unique stat suggestions without technical percent keys', () => {
        const { dataStore, manager } = setup();
        dataStore.data.items.weapon.push({
            name: 'Weird Hammer',
            stats: {
                'Blunt Damage': 10,
                'Blunt Damage%': '18%',
                'Normal Attack': 12,
                'Augment Slots': 2
            }
        });

        const suggestions = manager.getStatSuggestions();
        expect(new Set(suggestions).size).toBe(suggestions.length);
        expect(suggestions).toContain('Blunt Damage');
        expect(suggestions).not.toContain('Blunt Damage%');
        expect(suggestions).not.toContain('Normal Attack');
        expect(suggestions).not.toContain('Augment Slots');
    });
});
