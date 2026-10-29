/**
 * @typedef {Object} ItemStats
 * @property {number|string} [HP]
 * @property {number|string} [Defense]
 * @property {number|string} [Speed]
 * @property {number|string} [Strength]
 * @property {number|string} [Agility]
 * @property {number|string} [Intelligence]
 * @property {number|string} ['Crit Chance']
 * @property {number|string} ['Crit Damage']
 * @property {number|string} ['Mana Regen']
 * @property {Record<string, number|string>} [customStat]
 */

/**
 * @typedef {Object} Augment
 * @property {string} name
 * @property {ItemStats} stats
 */

/**
 * @typedef {Object} ItemPreset
 * @property {string} name
 * @property {ItemStats} stats
 */

/**
 * @typedef {Object} Elixir
 * @property {string} id
 * @property {string} name
 * @property {string} stat
 * @property {number} val
 */

/**
 * @typedef {Object} SkillNode
 * @property {number} x - Percentuale coordinata X (0-100)
 * @property {number} y - Percentuale coordinata Y (0-100)
 * @property {number} max - Livello massimo del nodo
 * @property {number} costBase - Costo base in punti SP
 * @property {boolean} [center] - Se il nodo è il punto d'origine iniziale
 */

/**
 * @typedef {Object} SkillTreeClass
 * @property {Record<string, SkillNode>} nodes
 * @property {Array<[string, string]>} edges
 */

export const APIurl = "https://isleswiki.net/api/v1"

/** @type {Augment[]} */
export let AUGMENT_DATABASE = [
];

/** @type {Record<string, ItemPreset[]>} */
export let ITEM_DATABASE = {
    weapon: [
    ],
    glove: [
    ],
    helmet: [
    ],
    amulet: [
    ],
    chestplate: [
    ],
    ring: [
    ],
    leggings: [
    ],
    boots: [
    ],
    feet: [
    ],
    core: [
        {name: "Archer Core", stats: {"Pierce Damage": "20%"}},
        {name: "Assassin Core", stats: {"Stab Damage": "20%"}}
    ],
    pets: [
        // { name: 'Fenice', stats: { HP: 150, 'Mana Regen': 10 } } Per ricordare cosa danno
    ]
};

/** @type {Elixir[]} */
export let INITIAL_ELIXIRS = [
];

/** @type {Record<'warrior'|'archer'|'mage', SkillTreeClass>} */
export let CLASS_SKILL_TREES = {
    warrior: {
        nodes: {
            'C': {
                x: 50, y: 50, max: 10, costBase: 1, center: true,
                name: "Melee Mastery",
                statKey: "{c}% Melee Damage",
                isDirect: true,
                description: "{c}% more Melee Damage",
                parameters: { c: { base: 5, increase: 5 } }
            },

            'UL': {
                x: 42, y: 32, max: 5, costBase: 2,
                name: "Wounded Striker",
                statKey: "{level} Wounded Striker",
                isDirect: false,
                description: "Recover for {a}% of your damage dealt, up to {b}% Max Health. 0.5s cooldown.",
                parameters: {
                    a: { base: 0.5, increase: 0.5 },
                    b: { base: 2.5, increase: 0.5 }
                }
            },
            'UL1': {
                x: 34, y: 16, max: 5, costBase: 1,
                name: "Relentless Assault",
                statKey: "{level} Relentless Assault",
                isDirect: false,
                description: "Killing an enemy will increase your next hit by {val}% damage.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'UL2': {
                x: 43, y: 16, max: 5, costBase: 1,
                name: "Chained Strike",
                statKey: "{level} Chained Strike",
                isDirect: false,
                description: "Every 5th Hit on an enemy deals {val}% more damage.",
                parameters: { val: { base: 10, increase: 5 } }
            },

            'UR': {
                x: 58, y: 32, max: 5, costBase: 2,
                name: "Healthy",
                statKey: "{val}% Health Regen",
                isDirect: true,
                description: "{val}% More Health Regen",
                parameters: { val: { base: 10, increase: 10 } }
            },
            'UR1': {
                x: 57, y: 16, max: 5, costBase: 1,
                name: "Ultimatum Scream",
                statKey: "{level} Ultimatum Scream",
                isDirect: false,
                description: "Casting your Ultimate will increase damage of default attacks by {val}% for 5s.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'UR2': {
                x: 66, y: 16, max: 5, costBase: 1,
                name: "Ultimatum Vengance",
                statKey: "{level} Ultimatum Vengance",
                isDirect: false,
                description: "Casting your Ultimate will increase damage of weapon abilities by {val}% for 5s.",
                parameters: { val: { base: 4, increase: 4 } }
            },

            'DL': {
                x: 42, y: 68, max: 5, costBase: 2,
                name: "Protection",
                statKey: "{val}% Base Defense",
                isDirect: true,
                description: "{val}% More Base Defense",
                parameters: { val: { base: 5, increase: 5 } }
            },
            'DL1': {
                x: 34, y: 84, max: 5, costBase: 1,
                name: "Heavy Strikes",
                statKey: "{val}% Normal Damage",
                isDirect: true,
                description: "{val}% Increase in Normal Damage",
                parameters: { val: { base: 2, increase: 2 } }
            },
            'DL2': {
                x: 43, y: 84, max: 5, costBase: 1,
                name: "Heavy Techniques",
                statKey: "{val}% Ability Damage",
                isDirect: true,
                description: "{val}% Ability Damage",
                parameters: { val: { base: 2.5, increase: 2.5 } }
            },

            'DR': {
                x: 58, y: 68, max: 5, costBase: 2,
                name: "Hulky",
                statKey: "{val}% Max Health",
                isDirect: true,
                description: "{val}% more Health",
                parameters: { val: { base: 5, increase: 5 } }
            },
            'DR1': {
                x: 57, y: 84, max: 5, costBase: 1,
                name: "Big Hitter",
                statKey: "{level} Big Hitter",
                isDirect: false,
                description: "Taking more than 50% damage in a single hit will slowly recover {val}% Max Health split across 5s. 20s cooldown.",
                parameters: { val: { base: 10, increase: 10 } }
            },
            'DR2': {
                x: 66, y: 84, max: 5, costBase: 1,
                name: "Team Tanker",
                statKey: "{level} Team Tanker",
                isDirect: false,
                description: "Take {val}% of the damage nearby players take.",
                parameters: { val: { base: 20, increase: 5 } }
            },

            'L': {
                x: 28, y: 50, max: 5, costBase: 3,
                name: "Infinite Ammo",
                statKey: "{level} Infinite Ammo",
                isDirect: false,
                description: "Consume {val}% less melee ammo.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'L1': {
                x: 18, y: 32, max: 5, costBase: 2,
                name: "Bloodlust Stacks",
                statKey: "{level} Bloodlust Stacks",
                isDirect: false,
                description: "Every hit you take within {time}s grants 1 Bloodlust stack, increasing damage by {dmg}% per stack. Up to 3 stacks.",
                parameters: {
                    time: { base: 1.25, increase: 1 },
                    dmg: { base: 1, increase: 1 }
                }
            },
            'L1a': {
                x: 8,  y: 22, max: 5, costBase: 1,
                name: "Bloodlust Capacity",
                statKey: "{level} Bloodlust Capacity",
                isDirect: false,
                description: "Increase the max stacks of Bloodlust by {val}.",
                parameters: { val: { base: 1, increase: 1 } }
            },
            'L1b': {
                x: 8,  y: 42, max: 5, costBase: 1,
                name: "Bloodthirsty",
                statKey: "{level} Bloodthirsty",
                isDirect: false,
                description: "When Bloodlust expires, your next hit will deal {val}% more damage per stack.",
                parameters: { val: { base: 1, increase: 1 } }
            },
            'L2': {
                x: 18, y: 68, max: 5, costBase: 2,
                name: "Battle Plates",
                statKey: "{level} Battle Plates",
                isDirect: false,
                description: "Generate a Plate every 6 seconds, negating hits that deal less than {hp}% Max Health. Max {plates} Plates. Will start regenerating {regen}s after your last hit.",
                parameters: {
                    hp: { base: 7.5, increase: 2.5 },
                    plates: { base: 1, increase: 1 },
                    regen: { base: 20, increase: -1 }
                }
            },
            'L2a': {
                x: 8,  y: 58, max: 5, costBase: 1,
                name: "Burst Plating",
                statKey: "{level} Burst Plating",
                isDirect: false,
                description: "When a plate gets broken, deal {val}% Damage to nearby enemies.",
                parameters: { val: { base: 50, increase: 25 } }
            },
            'L2b': {
                x: 8,  y: 78, max: 5, costBase: 1,
                name: "Emergency Plating",
                statKey: "{level} Emergency Plating",
                isDirect: false,
                description: "Gain {val}% reduced damage for {time}s after the last plate breaks.",
                parameters: {
                    val: { base: 10, increase: 2.5 },
                    time: { base: 4, increase: 0.5 }
                }
            },

            'R': {
                x: 72, y: 50, max: 5, costBase: 3,
                name: "Power Reservation",
                statKey: "-{val}% Melee Energy Consumption",
                isDirect: true,
                description: "-{val}% Energy Consumption for melee",
                parameters: { val: { base: 3, increase: 3 } }
            },
            'R1': {
                x: 82, y: 32, max: 5, costBase: 2,
                name: "Potato Mines",
                statKey: "{level} Potato Mines",
                isDirect: false,
                description: "Getting hit has a {a}% chance to spawn a Potato Mine, which explodes whenever an enemy walks over it, dealing {b}% damage. Max 3 potatoes. One recharges every 8s.",
                parameters: {
                    a: { base: 10, increase: 10 },
                    b: { base: 10, increase: 10 }
                }
            },
            'R1a': {
                x: 92, y: 22, max: 5, costBase: 1,
                name: "Poisoned Potatoes",
                statKey: "{level} Poisoned Potatoes",
                isDirect: false,
                description: "Decrease the Defense of enemies hit by one by {a}% for {b}s.",
                parameters: {
                    a: { base: 5, increase: 5 },
                    b: { base: 6, increase: 1 }
                }
            },
            'R1b': {
                x: 92, y: 42, max: 5, costBase: 1,
                name: "Hot Potato",
                statKey: "{level} Hot Potato",
                isDirect: false,
                description: "After one explodes, your next hit will deal {val}% more damage.",
                parameters: { val: { base: 15, increase: 5 } }
            },
            'R2': {
                x: 82, y: 68, max: 5, costBase: 2,
                name: "Threatening",
                statKey: "{level} Threatening",
                isDirect: false,
                description: "Dealing damage increases your Threat towards that enemy by {val}% of your damage. Not always applicable.",
                parameters: { val: { base: 20, increase: 20 } }
            },
            'R2a': {
                x: 92, y: 58, max: 5, costBase: 1,
                name: "Threatening",
                statKey: "{level} Threatening",
                isDirect: false,
                description: "Constantly taunt nearby enemies, multiplying your threat by {val}% every few seconds. Not always applicable.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'R2b': {
                x: 92, y: 78, max: 5, costBase: 1,
                name: "Apex Aggressor",
                statKey: "{level} Apex Aggressor",
                isDirect: false,
                description: "Deal {val}% more damage while you are the enemy's highest threat.",
                parameters: { val: { base: 4, increase: 4 } }
            }
        },
        edges: [
            ['C','L'], ['C','R'], ['C','UL'], ['C','UR'], ['C','DL'], ['C','DR'],
            ['UL','UL1'], ['UL','UL2'], ['UR','UR1'], ['UR','UR2'],
            ['DL','DL1'], ['DL','DL2'], ['DR','DR1'], ['DR','DR2'],
            ['L','L1'], ['L','L2'], ['R','R1'], ['R','R2'],
            ['L1','L1a'], ['L1','L1b'], ['L2','L2a'], ['L2','L2b'],
            ['R1','R1a'], ['R1','R1b'], ['R2','R2a'], ['R2','R2b']
        ]
    },
    archer: {
        nodes: {
            'C': {
                x: 50, y: 50, max: 10, costBase: 1, center: true,
                name: "Ranged Mastery",
                statKey: "{c}% Ranged Damage",
                isDirect: true,
                description: "Increase any Ranged Damage by {c}%.",
                parameters: { c: { base: 5.0, increase: 5.0 } }
            },

            'UL': {
                x: 42, y: 32, max: 5, costBase: 2,
                name: "Calculated Strike",
                statKey: "{level} Calculated Strike",
                isDirect: false,
                description: "Killing an enemy has a {val}% chance to reset your attack cooldown.",
                parameters: { val: { base: 10.0, increase: 10.0 } }
            },
            'UL1': {
                x: 34, y: 16, max: 5, costBase: 1,
                name: "Ricochet",
                statKey: "{level} Ricochet",
                isDirect: false,
                description: "Ranged attacks have a {val}% chance to fire an arrow to the nearest enemy. 2s cooldown. Does not include magic attacks.",
                parameters: { val: { base: 10.0, increase: 10.0 } }
            },
            'UL2': {
                x: 43, y: 16, max: 5, costBase: 1,
                name: "Critical Pity",
                statKey: "{level} Critical Pity",
                isDirect: false,
                description: "Missing a CRIT will increase your Crit Chance by {a} for 2.0s, up to {b} times. Removed when crit.",
                parameters: { a: { base: 0.35, increase: 0.35 }, b: {base: 2, increase: 1} }
            },

            'UR': {
                x: 58, y: 32, max: 5, costBase: 2,
                name: "Elemental Burst",
                statKey: "{level} Elemental Burst",
                isDirect: false,
                description: "Gain {val} Crit Damage for every unique Elemental Defense active.",
                parameters: { val: { base: 1.5, increase: 1.5 } }
            },
            'UR1': {
                x: 57, y: 16, max: 5, costBase: 1,
                name: "Ultimatum Criterium",
                statKey: "{level} Ultimatum Criterium",
                isDirect: false,
                description: "Casting your Ultimate will increase your Crit Chance by {val} for 5s.",
                parameters: { val: { base: 2.0, increase: 2.0 } }
            },
            'UR2': {
                x: 66, y: 16, max: 5, costBase: 1,
                name: "Ultimatum Vagrus",
                statKey: "{level} Ultimatum Vagrus",
                isDirect: false,
                description: "Casting your Ultimate will increase your Crit Damage by {val} for 5s.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },

            'DL': {
                x: 42, y: 68, max: 5, costBase: 2,
                name: "Powerful",
                statKey: "{val}% Crit Damage",
                isDirect: true,
                description: "{val}% more Critical Damage.",
                parameters: { val: { base: 8.0, increase: 8.0 } }
            },
            'DL1': {
                x: 34, y: 84, max: 5, costBase: 1,
                name: "Swift strikes",
                statKey: "-{val}% Attack Cooldown",
                isDirect: true,
                description: "Decrease the cooldown of your default attacks by {val}%.",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },
            'DL2': {
                x: 43, y: 84, max: 5, costBase: 1,
                name: "Swift channels",
                statKey: "{val}% Ability Cooldown",
                isDirect: true,
                description: "Decrease the cooldown of your weapon abilities by {val}%.",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },

            'DR': {
                x: 58, y: 68, max: 5, costBase: 2,
                name: "Tactcal",
                statKey: "{val}% Crit Chance",
                isDirect: true,
                description: "Gain {val} Critical Chance.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },
            'DR1': {
                x: 57, y: 84, max: 5, costBase: 1,
                name: "Evasion",
                statKey: "{level} Evasion",
                isDirect: false,
                description: "Taking damage grants {val} speed for {b}a",
                parameters: { val: { base: 5.0, increase: 5.0 }, b: { base: 2, increase: 0.5 } }
            },
            'DR2': {
                x: 66, y: 84, max: 5, costBase: 1,
                name: "Steady footing",
                statKey: "{val}% Defense",
                isDirect: true,
                description: "Take {val}% less damage while moving.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },

            'L': {
                x: 28, y: 50, max: 5, costBase: 3,
                name: "Infinite ammo",
                statKey: "{level} Infinite ammo",
                isDirect: false,
                description: "Consume {val}% less ranged ammo.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },
            'L1': {
                x: 18, y: 32, max: 5, costBase: 2,
                name: "Sharpshooter stacks",
                statKey: "{level} Sharpshooter stacks",
                isDirect: false,
                description: "Every hit within {a}s grants 1 Sharpshooter stack, increasing damage by {val}% per stack. Up to 10 stacks. Will reset upon taking damage. 0.2s cooldown.",
                parameters: { val: { base: 0.3, increase: 0.3 }, a: { base: 0.4, increase: 0.4 } }
            },
            'L1a': {
                x: 8,  y: 22, max: 5, costBase: 1,
                name: "Sharpshooter capacity",
                statKey: "{level} Sharpshooter capacity",
                isDirect: false,
                description: "Increase the max stacks of Sharpshooter by {val}.",
                parameters: { val: { base: 3.0, increase: 3.0 } }
            },
            'L1b': {
                x: 8,  y: 42, max: 5, costBase: 1,
                name: "Hot streak",
                statKey: "{level} Hot streak",
                isDirect: false,
                description: "Upon reaching 10 stacks, gain {a} Crit Chance and {b} Crit Damage for 5s.",
                parameters: { a: { base: 1.5, increase: 1.5 }, b: { base: 4, increase: 4 } },
            },
            'L2': {
                x: 18, y: 68, max: 5, costBase: 2,
                name: "Deadeye stacks",
                statKey: "{level} Deadeye stacks",
                isDirect: false,
                description: "Critical Hits grant 1 Deadeye stack, increasing Crit Chance by {val} per stack for {b}s, up to 3 stacks.",
                parameters: { val: { base: 0.5, increase: 0.5 }, b: { base: 1.25, increase: 1.25 } }
            },
            'L2a': {
                x: 8,  y: 58, max: 5, costBase: 1,
                name: "Deadeye capacity",
                statKey: "{level} Deadeye capacity",
                isDirect: false,
                description: "Increase the max stacks of Deadeye by {val}.",
                parameters: { val: { base: 1.0, increase: 1.0 } }
            },
            'L2b': {
                x: 8,  y: 78, max: 5, costBase: 1,
                name: "Perfect Chain",
                statKey: "{level} Perfect Chain",
                isDirect: false,
                description: "At max stacks, increase Crit Damage by {val} for 5s and remove all stacks.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },

            'R': {
                x: 72, y: 50, max: 5, costBase: 3,
                name: "Power Reservation",
                statKey: "-{val}% Ranged Energy Consumption",
                isDirect: true,
                description: "Ranged weapons consume -{val}% energy.",
                parameters: { val: { base: 3.0, increase: 3.0 } }
            },
            'R1': {
                x: 82, y: 32, max: 5, costBase: 2,
                name: "Glass cannon max health",
                statKey: "{level} Glass cannon max health",
                isDirect: false,
                description: "Max Health by -{a}%, but increase your damage by {val}%.",
                parameters: { val: { base: 7.5, increase: 7.5 }, a: { base: 30, increase: 10 } }
            },
            'R1a': {
                x: 92, y: 22, max: 5, costBase: 1,
                name: "Glass cannon health regen",
                statKey: "{level} Glass cannon health regen",
                isDirect: false,
                description: "Health Regen by -{a}%, but increase your damage by {val}%.",
                parameters: { val: { base: 2.5, increase: 2.5 }, a: { base: 40, increase: 15 } }
            },
            'R1b': {
                x: 92, y: 42, max: 5, costBase: 1,
                name: "Glass cannon defense",
                statKey: "{level} Glass cannon defense",
                isDirect: false,
                description: "Base Defense by {a}%, but increase your damage by {val}%.",
                parameters: { val: { base: 6.0, increase: 6.0 }, a: { base: 20, increase: 10 } }
            },
            'R2': {
                x: 82, y: 68, max: 5, costBase: 2,
                name: "Crazy crits",
                statKey: "{level} Crazy crits",
                isDirect: false,
                description: "Any Crit Chance beyond 100% can land a CRAZY CRIT, increasing your damage by {val}%.",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },
            'R2a': {
                x: 92, y: 58, max: 5, costBase: 1,
                name: "Crazy damage more crit damage",
                statKey: "{level} Crazy damage more crit damage",
                isDirect: false,
                description: "Add {val}% of your Crit Damage to CRAZY CRITS.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },
            'R2b': {
                x: 92, y: 78, max: 5, costBase: 1,
                name: "Crazy damage less crit chance",
                statKey: "{level} Crazy damage less crit chance",
                isDirect: false,
                description: "CRAZY CRITS can trigger at {val}% less Crit Chance.",
                parameters: { val: { base: 2.0, increase: 2.0 } }
            }
        },
        edges: [
            ['C','L'], ['C','R'], ['C','UL'], ['C','UR'], ['C','DL'], ['C','DR'],
            ['UL','UL1'], ['UL','UL2'], ['UR','UR1'], ['UR','UR2'],
            ['DL','DL1'], ['DL','DL2'], ['DR','DR1'], ['DR','DR2'],
            ['L','L1'], ['L','L2'], ['R','R1'], ['R','R2'],
            ['L1','L1a'], ['L1','L1b'], ['L2','L2a'], ['L2','L2b'],
            ['R1','R1a'], ['R1','R1b'], ['R2','R2a'], ['R2','R2b']
        ]
    },
    mage: {
        nodes: {
            'C': {
                x: 50, y: 50, max: 10, costBase: 1, center: true,
                name: "Magic Mastery",
                statKey: "{c}% Magic Damage",
                isDirect: true,
                description: "Increase any Magic Damage by {c}%.",
                parameters: { c: { base: 5.0, increase: 5.0 } }
            },

            'UL': {
                x: 42, y: 32, max: 5, costBase: 2,
                name: "The Avatar",
                statKey: "{val}% Elemental Power",
                isDirect: true,
                description: "Increase Elemental Power by {val}%.",
                parameters: { val: { base: 8.0, increase: 8.0 } }
            },
            'UL1': {
                x: 34, y: 16, max: 5, costBase: 1,
                name: "Crystal Insights",
                statKey: "{level} Crystal Insights",
                isDirect: false,
                description: "Landing a CRIT has a {a}% chance to spawn a Crystal Shard that increases Elemental Power by {b}% for 8s when near.",
                parameters: { a: { base: 5, increase: 5}, b: { base: 6, increase: 6} }
            },
            'UL2': {
                x: 43, y: 16, max: 5, costBase: 1,
                name: "Natural Distillation",
                statKey: "{level} Natural Distillation",
                isDirect: false,
                description: "Converts {val}% of your Crit Damage into Elemental Power.",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },

            'UR': {
                x: 58, y: 32, max: 5, costBase: 2,
                name: "Elemental Synergy",
                statKey: "{level} Elemental Synergy",
                isDirect: false,
                description: "Gain {a} Elemental Power for every 1 Energy Regen above 10/s, up to {b}",
                parameters: { a: { base: 2, increase: 2 }, b: { base: 10.0, increase: 10.0 } }
            },
            'UR1': {
                x: 57, y: 16, max: 5, costBase: 1,
                name: "Potential Charge",
                statKey: "{level} Potential Charge",
                isDirect: false,
                description: "Killing an enemy will lower the Ultimate cooldown by {val}s.",
                parameters: { val: { base: 0.8, increase: 0.8 } }
            },
            'UR2': {
                x: 66, y: 16, max: 5, costBase: 1,
                name: "Ultimate Cheering",
                statKey: "{level} Ultimate Cheering",
                isDirect: false,
                description: "Casting your Ultimate will recover {a}% Max Health and {b} Energy split across 5s.",
                parameters: { a: { base: 2.5, increase: 2.5 }, b: { base: 5.0, increase: 5.0 } }
            },

            'DL': {
                x: 42, y: 68, max: 5, costBase: 2,
                name: "Energetic",
                statKey: "{val}% Energy Regen",
                isDirect: true,
                description: "Gain {val} Energy Regen",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },
            'DL1': {
                x: 34, y: 84, max: 5, costBase: 1,
                name: "Mystic Flow",
                statKey: "-{val}% Attack Costs",
                isDirect: true,
                description: "Default attacks take {val}% less energy.",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },
            'DL2': {
                x: 43, y: 84, max: 5, costBase: 1,
                name: "Mystic Surge",
                statKey: "-{val}% Ability Costs",
                isDirect: true,
                description: "Weapon abilities take {val}% less energy.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },

            'DR': {
                x: 58, y: 68, max: 5, costBase: 2,
                name: "Elemental channeling",
                statKey: "{level} Elemental channeling",
                isDirect: false,
                description: "Gain {val} Elemental Damage of every type",
                parameters: { val: { base: 2.5, increase: 2.5 } }
            },
            'DR1': {
                x: 57, y: 84, max: 5, costBase: 1,
                name: "Elemental Knowledge",
                statKey: "{level} Elemental Knowledge",
                isDirect: false,
                description: "Gain {val}% damage for every unique elemental defense.",
                parameters: { val: { base: 1.0, increase: 1.0 } }
            },
            'DR2': {
                x: 66, y: 84, max: 5, costBase: 1,
                name: "Reenergize",
                statKey: "{level} Reenergize",
                isDirect: false,
                description: "Recover {val} Energy for every 1% damage taken.",
                parameters: { val: { base: 0.15, increase: 0.15 } }
            },

            'L': {
                x: 28, y: 50, max: 5, costBase: 3,
                name: "Infinite Ammo",
                statKey: "{level} Infinite Ammo",
                isDirect: false,
                description: "Consume {val}% less magic ammo.",
                parameters: { val: { base: 4.0, increase: 4.0 } }
            },
            'L1': {
                x: 18, y: 32, max: 5, costBase: 2,
                name: "Focus Stacks",
                statKey: "{level} Focus Stacks",
                isDirect: false,
                description: "Every shared kill within {a}s will grant 1 Focus stack, increasing damage by {val}% per stack, up to 3 stacks.",
                parameters: { val: { base: 1.0, increase: 1.0 }, a: { base: 1.0, increase: 1.0 } }
            },
            'L1a': {
                x: 8,  y: 22, max: 5, costBase: 1,
                name: "Focus Capacity",
                statKey: "{level} Focus Capacity",
                isDirect: false,
                description: "Increase the max stacks of Focus by {val}.",
                parameters: { val: { base: 1.0, increase: 1.0 } }
            },
            'L1b': {
                x: 8,  y: 42, max: 5, costBase: 1,
                name: "Mindful Recovery",
                statKey: "{level} Mindful Recovery",
                isDirect: false,
                description: "When Focus expires, regain {a} Energy and {b}% Max Health per stack.",
                parameters: { a: { base: 1.5, increase: 1.5 }, b: { base: 0.5, increase: 0.5 } }
            },
            'L2': {
                x: 18, y: 68, max: 5, costBase: 2,
                name: "Grief Infliction",
                statKey: "{level} Grief Infliction",
                isDirect: false,
                description: "Killing an enemy will inflict Grief to nearby enemies for {a}s. Affected enemies take {val}% more damage.",
                parameters: { val: { base: 13.0, increase: 13.0 }, a: { base: 2, increase: 2 } }
            },
            'L2a': {
                x: 8,  y: 58, max: 5, costBase: 1,
                name: "Empathic Soul",
                statKey: "{level} Empathic Soul",
                isDirect: false,
                description: "Enemies inflicted with Grief will recover {val}% Max Health on kill.",
                parameters: { val: { base: 2.0, increase: 2.0 } }
            },
            'L2b': {
                x: 8,  y: 78, max: 5, costBase: 1,
                name: "Last Sorrow",
                statKey: "{level} Last Sorrow",
                isDirect: false,
                description: "When Grief expires, the enemy will take {val}% more damage on the next hit.",
                parameters: { val: { base: 5.0, increase: 5.0 } }
            },

            'R': {
                x: 72, y: 50, max: 5, costBase: 3,
                name: "Power Reservation",
                statKey: "-{val}% Magic Energy Consumption",
                isDirect: true,
                description: "Magic weapons consume -{val}% energy.",
                parameters: { val: { base: 3.0, increase: 3.0 } }
            },
            'R1': {
                x: 82, y: 32, max: 5, costBase: 2,
                name: "Recover Crystal",
                statKey: "{level} Recover Crystal",
                isDirect: false,
                description: "Hitting an enemy has a {a}% chance to drop a Healing Crystal. Pick it up to recover {b}% Max Health. 0.5s cooldown",
                parameters: { a: { base: 4.0, increase: 4.0 }, b: { base: 2.0, increase: 2.0 } }
            },
            'R1a': {
                x: 92, y: 22, max: 5, costBase: 1,
                name: "Power Crystal",
                statKey: "{level} Power Crystal",
                isDirect: false,
                description: "Hitting an enemy has a {a}% chance to drop an Energy Crystal. Pick it up to recover {b} Energy. 0.5s cooldown",
                parameters: { a: { base: 5.0, increase: 5.0 }, b: { base: 30.0, increase: 30.0 } }
            },
            'R1b': {
                x: 92, y: 42, max: 5, costBase: 1,
                name: "Crystal Combustion",
                statKey: "{level} Crystal Combustion",
                isDirect: false,
                description: "Crystals that despawn will deal {val}% damage to nearby enemies.",
                parameters: { val: { base: 30.0, increase: 30.0 } }
            },
            'R2': {
                x: 82, y: 68, max: 5, costBase: 2,
                name: "Support Orbs",
                statKey: "{level} Support Orbs",
                isDirect: false,
                description: "Hits have a {a}% chance to spawn a Magical Orb around you, shooting at enemies. Lasts {b}s, up to 3 orbs. RED: Deals {c}% damage. GREEN: Heals a player for {d}%. BLUE: The enemy takes {e}% damage.",
                parameters: { a: { base: 6.0, increase: 3.0 }, b: { base: 4.0, increase: 1.0 }, c: { base: 30.0, increase: 10.0 }, d: { base: 6.0, increase: 3.0 }, e: { base: 4.0, increase: 4.0 } }
            },
            'R2a': {
                x: 92, y: 58, max: 5, costBase: 1,
                name: "Magical Capacity",
                statKey: "{level} Magical Capacity",
                isDirect: false,
                description: "CRITS have a {val}% chance to restore 1 Charge, up to 3. Recharging takes {a}s per orb.",
                parameters: { val: { base: 10.0, increase: 10.0 }, a: { base: 12.0, increase: -2.0 } }
            },
            'R2b': {
                x: 92, y: 78, max: 5, costBase: 1,
                name: "Magical Syphon",
                statKey: "{level} Magical Syphon",
                isDirect: false,
                description: "When an orb expires, recover {a}% Max Health and 6.0 Energy to yourself and nearby players.",
                parameters: { a: { base: 1.0, increase: 1.0 }, b: { base: 6.0, increase: 3.0 } }
            }
        },
        edges: [
            ['C','L'], ['C','R'], ['C','UL'], ['C','UR'], ['C','DL'], ['C','DR'],
            ['UL','UL1'], ['UL','UL2'], ['UR','UR1'], ['UR','UR2'],
            ['DL','DL1'], ['DL','DL2'], ['DR','DR1'], ['DR','DR2'],
            ['L','L1'], ['L','L2'], ['R','R1'], ['R','R2'],
            ['L1','L1a'], ['L1','L1b'], ['L2','L2a'], ['L2','L2b'],
            ['R1','R1a'], ['R1','R1b'], ['R2','R2a'], ['R2','R2b']
        ]
    }
};