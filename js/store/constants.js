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
                description: "{c}% more Melee Damage",
                parameters: { c: { base: 5, increase: 5 } }
            },

            'UL': {
                x: 42, y: 32, max: 5, costBase: 2,
                name: "Wounded Striker",
                description: "Recover for {a}% of your damage dealt, up to {b}% Max Health. 0.5s cooldown.",
                parameters: {
                    a: { base: 0.5, increase: 0.5 },
                    b: { base: 2.5, increase: 0.5 }
                }
            },
            'UL1': {
                x: 34, y: 16, max: 5, costBase: 1,
                name: "Relentless Assault",
                description: "Killing an enemy will increase your next hit by {val}% damage.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'UL2': {
                x: 43, y: 16, max: 5, costBase: 1,
                name: "Chained Strike",
                description: "Every 5th Hit on an enemy deals {val}% more damage.",
                parameters: { val: { base: 10, increase: 5 } }
            },

            'UR': {
                x: 58, y: 32, max: 5, costBase: 2,
                name: "Healthy",
                statKey: "{val}% Health Regen",
                description: "{val}% More Health Regen",
                parameters: { val: { base: 10, increase: 10 } }
            },
            'UR1': {
                x: 57, y: 16, max: 5, costBase: 1,
                name: "Ultimatum Scream",
                description: "Casting your Ultimate will increase damage of default attacks by {val}% for 5s.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'UR2': {
                x: 66, y: 16, max: 5, costBase: 1,
                name: "Ultimatum Vengance",
                description: "Casting your Ultimate will increase damage of weapon abilities by {val}% for 5s.",
                parameters: { val: { base: 4, increase: 4 } }
            },

            'DL': {
                x: 42, y: 68, max: 5, costBase: 2,
                name: "Protection",
                statKey: "{val}% Base Defense",
                description: "{val}% More Base Defense",
                parameters: { val: { base: 5, increase: 5 } }
            },
            'DL1': {
                x: 34, y: 84, max: 5, costBase: 1,
                name: "Heavy Strikes",
                statKey: "{val}% Normal Damage",
                description: "{val}% Increase in Normal Damage",
                parameters: { val: { base: 2, increase: 2 } }
            },
            'DL2': {
                x: 43, y: 84, max: 5, costBase: 1,
                name: "Heavy Techniques",
                statKey: "{val}% Ability Damage",
                description: "{val}% Ability Damage",
                parameters: { val: { base: 2.5, increase: 2.5 } }
            },

            'DR': {
                x: 58, y: 68, max: 5, costBase: 2,
                name: "Hulky",
                statKey: "{val}% Max Health",
                description: "{val}% more Health",
                parameters: { val: { base: 5, increase: 5 } }
            },
            'DR1': {
                x: 57, y: 84, max: 5, costBase: 1,
                name: "Big Hitter",
                description: "Taking more than 50% damage in a single hit will slowly recover {val}% Max Health split across 5s. 20s cooldown.",
                parameters: { val: { base: 10, increase: 10 } }
            },
            'DR2': {
                x: 66, y: 84, max: 5, costBase: 1,
                name: "Team Tanker",
                description: "Take {val}% of the damage nearby players take.",
                parameters: { val: { base: 20, increase: 5 } }
            },

            'L': {
                x: 28, y: 50, max: 5, costBase: 3,
                name: "Infinite Ammo",
                description: "Consume {val}% less melee ammo.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'L1': {
                x: 18, y: 32, max: 5, costBase: 2,
                name: "Bloodlust Stacks",
                description: "Every hit you take within {time}s grants 1 Bloodlust stack, increasing damage by {dmg}% per stack. Up to 3 stacks.",
                parameters: {
                    time: { base: 1.25, increase: 1 },
                    dmg: { base: 1, increase: 1 }
                }
            },
            'L1a': {
                x: 8,  y: 22, max: 5, costBase: 1,
                name: "Bloodlust Capacity",
                description: "Increase the max stacks of Bloodlust by {val}.",
                parameters: { val: { base: 1, increase: 1 } }
            },
            'L1b': {
                x: 8,  y: 42, max: 5, costBase: 1,
                name: "Bloodthirsty",
                description: "When Bloodlust expires, your next hit will deal {val}% more damage per stack.",
                parameters: { val: { base: 1, increase: 1 } }
            },
            'L2': {
                x: 18, y: 68, max: 5, costBase: 2,
                name: "Battle Plates",
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
                description: "When a plate gets broken, deal {val}% Damage to nearby enemies.",
                parameters: { val: { base: 50, increase: 25 } }
            },
            'L2b': {
                x: 8,  y: 78, max: 5, costBase: 1,
                name: "Emergency Plating",
                description: "Gain {val}% reduced damage for {time}s after the last plate breaks.",
                parameters: {
                    val: { base: 10, increase: 2.5 },
                    time: { base: 4, increase: 0.5 }
                }
            },

            'R': {
                x: 72, y: 50, max: 5, costBase: 3,
                name: "Power Reservation",
                statKey: "-{val}% Energy Consumption",
                description: "-{val}% Energy Consumption",
                parameters: { val: { base: 3, increase: 3 } }
            },
            'R1': {
                x: 82, y: 32, max: 5, costBase: 2,
                name: "Potato Mines",
                description: "Getting hit has a {a}% chance to spawn a Potato Mine, which explodes whenever an enemy walks over it, dealing {b}% damage. Max 3 potatoes. One recharges every 8s.",
                parameters: {
                    a: { base: 10, increase: 10 },
                    b: { base: 10, increase: 10 }
                }
            },
            'R1a': {
                x: 92, y: 22, max: 5, costBase: 1,
                name: "Poisoned Potatoes",
                description: "Decrease the Defense of enemies hit by one by {a}% for {b}s.",
                parameters: {
                    a: { base: 5, increase: 5 },
                    b: { base: 6, increase: 1 }
                }
            },
            'R1b': {
                x: 92, y: 42, max: 5, costBase: 1,
                name: "Hot Potato",
                description: "After one explodes, your next hit will deal {val}% more damage.",
                parameters: { val: { base: 15, increase: 5 } }
            },
            'R2': {
                x: 82, y: 68, max: 5, costBase: 2,
                name: "Threatening",
                description: "Dealing damage increases your Threat towards that enemy by {val}% of your damage. Not always applicable.",
                parameters: { val: { base: 20, increase: 20 } }
            },
            'R2a': {
                x: 92, y: 58, max: 5, costBase: 1,
                name: "Threatening",
                description: "Constantly taunt nearby enemies, multiplying your threat by {val}% every few seconds. Not always applicable.",
                parameters: { val: { base: 4, increase: 4 } }
            },
            'R2b': {
                x: 92, y: 78, max: 5, costBase: 1,
                name: "Apex Aggressor",
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
            'C':   { x: 50, y: 50, max: 10, costBase: 1, center: true, description: "Concentrazione dell'Arciere: Aumenta la precisione generale e la gittata." },
            'UL':  { x: 42, y: 32, max: 5, costBase: 3, description: "Agilità Naturale: Aumenta la velocità di movimento e la schivata." },
            'UR': { x: 58, y: 32, max: 5, costBase: 3, description: "Tino Rapido: Riduce il tempo di caricamento dell'arco." },
            'DL':  { x: 42, y: 68, max: 5, costBase: 3, description: "Passo Felpato: Riduce la minaccia generata e aumenta i danni da distanza." },
            'DR': { x: 58, y: 68, max: 5, costBase: 3, description: "Occhio di Falco: Aumenta drasticamente la probabilità di critico a distanza." },
            'L':   { x: 30, y: 50, max: 5, costBase: 3, description: "Focalizzazione: Aumenta la rigenerazione di energia/mana per le abilità." },
            'R':  { x: 70, y: 50, max: 5, costBase: 3, description: "Balistica Avanzata: Aumenta la velocità dei proiettili scoccati." },
            'UL1': { x: 34, y: 16, max: 5, costBase: 1, description: "Riflessi Pronti: Aumenta la finestra temporale per i contrattacchi." },
            'UL2':{ x: 43, y: 16, max: 5, costBase: 1, description: "Schivata acrobatica: Fornisce invulnerabilità momentanea durante il movimento rapido." },
            'UR1': { x: 57, y: 16, max: 5, costBase: 1, description: "Tiro Multiplo: Consente di scoccare dardi addizionali." },
            'UR2':{ x: 66, y: 16, max: 5, costBase: 1, description: "Raffica: Aumenta temporaneamente la cadenza di fuoco." },
            'DL1': { x: 34, y: 84, max: 5, costBase: 1, description: "Camuffamento: Aumenta la furtività fuori dal combattimento." },
            'DL2':{ x: 43, y: 84, max: 5, costBase: 1, description: "Trappole: Aumenta l'efficacia e il danno delle trappole posizionate." },
            'DR1': { x: 57, y: 84, max: 5, costBase: 1, description: "Tiro Perforante: I colpi ignorano una percentuale dell'armatura nemica." },
            'DR2':{ x: 66, y: 84, max: 5, costBase: 1, description: "Cecchino: Danno bonus aumentato in base alla distanza dal bersaglio." },
            'L1':  { x: 20, y: 32, max: 5, costBase: 1, description: "Riserva di Stamina: Aumenta la stamina massima disponibile." },
            'L2': { x: 20, y: 68, max: 5, costBase: 1, description: "Recupero Veloce: Rigenera stamina più rapidamente dopo una schivata." },
            'L1a': { x: 10, y: 22, max: 5, costBase: 1, description: "Maestria della Faretra: Aumenta la capacità massima delle munizioni speciali." },
            'L1b':{ x: 10, y: 42, max: 5, costBase: 1, description: "Frecce Leggere: Riduce il consumo di stamina per tiro." },
            'L2a': { x: 10, y: 58, max: 5, costBase: 1, description: "Mobilità Estrema: Nessuna penalità di movimento mentre si carica l'arco." },
            'L2b':{ x: 10, y: 78, max: 5, costBase: 1, description: "Vento Favorevole: Aumenta la velocità d'attacco in spazi aperti." },
            'R1':  { x: 80, y: 32, max: 5, costBase: 1, description: "Tiro Preciso: Aumenta la stabilità della mira." },
            'R2': { x: 80, y: 68, max: 5, costBase: 1, description: "Impatto Violento: I dardi infliggono maggiore spinta indietro." },
            'R1a': { x: 90, y: 22, max: 5, costBase: 1, description: "Tiro alla Testa: Danni critici notevolmente aumentati sui punti deboli." },
            'R1b':{ x: 90, y: 42, max: 5, costBase: 1, description: "Esplosione Elementale: Le frecce applicano effetti elementali ad area." },
            'R2a': { x: 90, y: 58, max: 5, costBase: 1, description: "Puntatore Laser: Riduce la dispersione dei tiri a lunga distanza." },
            'R2b': { x: 90, y: 78, max: 5, costBase: 1, description: "Tempesta di Frecce: Sblocca un attacco speciale ad area a pioggia." }
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
            'C':   { x: 50, y: 50, max: 12, costBase: 1, center: true, description: "Essenza Arcana: Aumenta il pool di Mana massimo e la potenza magica globale." },
            'UL':  { x: 38, y: 30, max: 6, costBase: 2, description: "Scudo di Mana: Assorbe una percentuale dei danni entranti usando il mana anziché gli HP." },
            'UR': { x: 62, y: 30, max: 6, costBase: 2, description: "Catalizzatore: Riduce i tempi di casting di tutti gli incantesimi." },
            'DL':  { x: 38, y: 70, max: 6, costBase: 2, description: "Meditazione: Aumenta notevolmente la rigenerazione naturale del mana." },
            'DR': { x: 62, y: 70, max: 6, costBase: 2, description: "Affinità Elementale: Aumenta i danni inflitti da tutti gli elementi." },
            'L':   { x: 26, y: 50, max: 4, costBase: 4, description: "Maestria del Vuoto: Riduce il costo in mana delle abilità avanzate." },
            'R':  { x: 74, y: 50, max: 4, costBase: 4, description: "Sovraccarico: Aumenta la potenza magica a discapito di un maggior consumo di mana." },
            'UL1': { x: 28, y: 14, max: 4, costBase: 3, description: "Barriera Protettiva: Aumenta la resistenza magica." },
            'UL2':{ x: 42, y: 14, max: 4, costBase: 3, description: "Rifrazione: Ha una probabilità di respingere gli incantesimi nemici." },
            'UR1': { x: 58, y: 14, max: 4, costBase: 3, description: "Velocità Incantata: Aumenta la velocità di movimento durante il lancio." },
            'UR2':{ x: 72, y: 14, max: 4, costBase: 3, description: "Eco Arcano: Permette agli incantesimi di ripetersi con probabilità ridotta." },
            'DL1': { x: 28, y: 86, max: 4, costBase: 3, description: "Tranquillità: Aumenta la rigenerazione del mana quando si è immobili." },
            'DL2':{ x: 42, y: 86, max: 4, costBase: 3, description: "Risucchio Energetico: Ricarica mana quando si sconfiggono i nemici." },
            'DR1': { x: 58, y: 86, max: 4, costBase: 3, description: "Pietra Filosofale: Aumenta l'efficacia dei buff e delle pozioni." },
            'DR2':{ x: 72, y: 86, max: 4, costBase: 3, description: "Maestria Critica Magica: Aumenta probabilità e danno dei critici magici." },
            'L1':  { x: 16, y: 36, max: 5, costBase: 2, description: "Saggezza Antica: Aumenta permanentemente la riserva di mana." },
            'L2': { x: 16, y: 64, max: 5, costBase: 2, description: "Concentrazione Mentale: Immunità all'interruzione degli incantesimi per danni subiti." },
            'L1a': { x: 6,  y: 26, max: 3, costBase: 2, description: "Mente Brillante: Incrementa ulteriormente la potenza magica." },
            'L1b':{ x: 6,  y: 44, max: 3, costBase: 2, description: "Risparmio Energetico: Riduce i costi di mana degli incantesimi di supporto." },
            'L2a': { x: 6,  y: 56, max: 3, costBase: 2, description: "Tempesta Mentale: Aumenta la velocità di recupero delle abilità ad area." },
            'L2b':{ x: 6,  y: 74, max: 3, costBase: 2, description: "Trascendenza: Aumenta tutte le statistiche magiche quando il mana è al massimo." },
            'R1':  { x: 84, y: 36, max: 5, costBase: 2, description: "Piromanzia: Aumenta specificamente i danni da fuoco." },
            'R2': { x: 84, y: 64, max: 5, costBase: 2, description: "Criomanzia: Aumenta i danni da gelo e applica rallentamenti." },
            'R1a': { x: 94, y: 26, max: 3, costBase: 2, description: "Colpo Infernale: Aumenta il raggio e l'area d'effetto delle magie di fuoco." },
            'R1b':{ x: 94, y: 44, max: 3, costBase: 2, description: "Combustione: Aumenta i danni prolungati da ustione." },
            'R2a': { x: 94, y: 56, max: 3, costBase: 2, description: "Permafrost: Aumenta la durata dei congelamenti sui nemici." },
            'R2b': { x: 94, y: 74, max: 3, costBase: 2, description: "Tormenta: Sblocca l'incantesimo di controllo di massa della tormenta." }
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