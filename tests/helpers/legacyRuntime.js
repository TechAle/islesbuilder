import { DataStore } from '../../js/store/dataStore.js';
import { BuildStore } from '../../js/store/equippedStore.js';
import { selectStats, withBaseStats } from '../../js/store/selectors.js';
import { SkillTreeManager } from '../../js/modules/skillTreeManager.js';
import { ShareManager } from '../../js/modules/shareManager.js';
import { ElixirManager } from '../../js/modules/elixirManager.js';
import { ItemManager } from '../../js/modules/itemManager.js';
import { DpsManager } from '../../js/modules/dpsManager.js';
import { simulateEnemy, applyDefenseDamage } from '../../js/modules/enemySimulator.js';
import { MONSTER_PRESETS, getDefaultDamagePercent } from '../../js/data/monsters.js';
import {
    parseAugment,
    getAugmentSuggestions,
    registerAugments,
    getAugmentStatBonuses
} from '../../js/modules/augmentManager.js';
import { ApiManager } from '../../js/modules/apiManager.js';
import { applyItemOverride } from '../../js/modules/itemOverrides.js';
import { ITEM_OVERRIDES } from '../../js/data/itemOverrides.js';
import {
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
} from '../../js/modules/classes/mage.js';
import { ITEM_DATABASE } from '../../js/data/items.js';
import { AUGMENT_DATABASE } from '../../js/data/augments.js';
import { INITIAL_ELIXIRS } from '../../js/data/elixirs.js';
import { CLASS_SKILL_TREES } from '../../js/data/skillTrees.js';
import { ITEM_UPGRADE_STAT_PER_LEVEL } from '../../js/data/constants.js';
import { SpecialAbilityManager } from '../../js/modules/specialAbilityManager.js';
import {
    onClick,
    passives,
    SPECIAL_ABILITY_OVERRIDES
} from '../../js/data/specialAbilities.js';

export {
    DataStore,
    BuildStore,
    selectStats,
    withBaseStats,
    SkillTreeManager,
    ShareManager,
    ElixirManager,
    ItemManager,
    DpsManager,
    simulateEnemy,
    applyDefenseDamage,
    MONSTER_PRESETS,
    getDefaultDamagePercent,
    parseAugment,
    getAugmentSuggestions,
    registerAugments,
    getAugmentStatBonuses,
    ApiManager,
    applyItemOverride,
    ITEM_OVERRIDES,
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
    getPassiveHitStats,
    ITEM_DATABASE,
    AUGMENT_DATABASE,
    INITIAL_ELIXIRS,
    CLASS_SKILL_TREES,
    ITEM_UPGRADE_STAT_PER_LEVEL,
    SpecialAbilityManager,
    onClick,
    passives,
    SPECIAL_ABILITY_OVERRIDES
};

export const specialAbilityManager = new SpecialAbilityManager();

export const TEST_AUGMENT_API = [
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

export function makeWorld() {
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

export function makeDamageBuild(weaponStats, coreName = '') {
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
