/**
 * Abilità speciali estratte dalle armi.
 *
 * Le voci sono popolate a runtime dal parser partendo dalle abilità dell'API.
 * Il nome di ogni voce è sempre `NomeAbilità-NomeArma`.
 *
 * @typedef {import('./types.js').SpecialAbility} SpecialAbility
 */

/**
 * Abilità attivabili con tasto destro o F.
 * @type {SpecialAbility[]}
 */
export const onClick = [];

/**
 * Passive permanenti dell'arma.
 * @type {SpecialAbility[]}
 */
export const passives = [];

/**
 * Override manuali per abilità/passive.
 * La chiave è il nome completo `NomeAbilità-NomeArma`.
 *
 * @type {Record<string, Partial<SpecialAbility>>}
 */
export const SPECIAL_ABILITY_OVERRIDES = {
    // Smite colpisce ogni 5 attacchi; il 150% viene letto dal testo.
    'Smite-Tempest': { everyHits: 5 },

    // Whirlwind evoca tre tornado, ognuno al 45%. Come da convenzione, le
    // istanze multiple moltiplicano il danno ma contano come un hit effettivo.
    'Whirlwind-Tempest': { times: 3 },

    // Windstorm Greaves: il testo API può riportare "200 damage" senza %;
    // il valore reale è 200%.
    'Whirlwind-Windstorm Greaves': { damage: 200 },

    // Arrow Volley: due frecce, la seconda a metà. Totale 150%.
    'Arrow Volley-Bronze Bow': { damage: 150 },
    'Arrow Volley-Iron Bow': { damage: 150 },
    'Arrow Volley-Oak Bow': { damage: 150 },
    'Arrow Volley-Silver Bow': { damage: 150 },
    'Arrow Volley-Skeletal Bow': { damage: 150 },

    // Multi-hit: il danno viene moltiplicato per `times`, mentre gli hit
    // effettivi restano 1 (stessa convenzione di Whirlwind).
    'Rapid Strikes-Bronze Dagger': { times: 5 },
    'Rapid Strikes-Invar Dagger': { times: 5 },
    'Rapid Strikes-Iron Dagger': { times: 5 },
    'Rapid Strikes-Silver Dagger': { times: 5 },
    'Rapid Strikes-Vicious Dirk': { times: 5 },
    'Trinity-Bronze Greatbow': { times: 3 },
    'Trinity-Iron Greatbow': { times: 3 },
    'Trinity-Silver Greatbow': { times: 3 },
    'Tusknity-Alpha Tusk Greatbow': { times: 3 },
    'Gooey Blast-Blobblaster': { times: 5 },
    'Lovely Bunch-Loaded Coconut': { times: 3 },

    // Pesti che si dividono in 3 shard.
    'Splinter-Bronze Pot': { times: 3 },
    'Splinter-Iron Pot': { times: 3 },
    'Splinter-Silver Pot': { times: 3 },

    // "Rapidly": assumiamo 5 tick.
    'Flurry Knuckles-Bronze Gauntlet': { damage: 50, times: 5 },
    'Flurry Knuckles-Iron Gauntlet': { damage: 50, times: 5 },
    'Flurry Knuckles-Silver Gauntlet': { damage: 50, times: 5 },
    'Burst of Flames-Flameburster': { times: 5 },
    'Sporethrower-Fungocap Axe': { times: 5 },

    // Pozza: 45% ogni 0,5s per 10s (20 tick), cooldown 10s.
    'Poison Cloud-Pestilent Perfume': { times: 20, hitsPerUse: 20, cooldown: 10 },

    // DoT: 250% totali in 5 tick da 50%.
    "Dragon's Breath-Demeanor of Dragons": { damage: 50, times: 5 },

    // 60% + esplosione 100%: 2 istanze, 80% medio ciascuna.
    'Fleshy Mess-Cyclaxe': { damage: 80, times: 2 },

    // 125% all'apparire e allo sparire: 2 istanze.
    'Void Breach-Abysssplitter': { times: 2 },

    // Tre direzioni, 60% ciascuna.
    'Triquake-Silver Tome': { times: 3 },

    // Due detriti, ma il testo non indica una percentuale di danno.
    'Tremble-Bronze Crux': { times: 2, damage: 100 },
    'Tremble-Silver Crux': { times: 2, damage: 100 },

    // Abilità difensive/utility: la percentuale nel testo non è danno inflitto.
    'Toxic Gas-Sporeheart Orb': { damage: 0, defenseReductionPercent: 25 },
    'Bound By Spirits-Essencebinder Tome': { damage: 0 },

    // Il parser prende l'ultima %, che qui è la cura: forziamo il danno.
    'Bug Vitality-Glowbug Staff': {
        damage: 75,
        minHits: 1,
        maxHits: 5,
        hitsMatchTimes: true
    },
    'Honey Healing-The Drizzler': { damage: 250 },

    // Death Ledger: 30% ogni 0.5s per 10s (20 hit), cooldown 10s.
    'Death Ledger-Voras Deathnote': {
        times: 20,
        hitsPerUse: 20,
        cooldown: 10
    },

    // Astro Break: danno selezionabile tra 150% e 300%.
    'Astro Break-Astralweaver': {
        damage: 300,
        minDamage: 150,
        maxDamage: 300
    },

    // Awoken Fissure: il Void Rift aumenta il danno del 20%. Il bonus è
    // trattato come damageTakenIncreasePercent perché entra nello stesso
    // moltiplicatore finale del danno. Cooldown verificato: 3.8s.
    'Awoken Fissure-Riftripper': {
        damage: 250,
        cooldown: 3.8,
        damageTakenIncreasePercent: 20,
        requiresPriorHit: true
    },

    // Chain Stinger: un solo colpo al 200%, con cooldown 0.9s.
    // L'override esplicito evita che futuri cambi al testo cambino il parsing.
    'Chain Stinger-Royal Blowpipe': {
        damage: 200,
        times: 1,
        hitsPerUse: 1,
        cooldown: 0.9
    },

    // Toxin Hit (Recluse Stinger): 300% totali nel tempo, 5 tick da 60%,
    // cooldown 5s.
    'Toxin Hit-Recluse Stinger': {
        damage: 60,
        times: 5,
        cooldown: 5
    },

    // Runic Knuckles: 1 hit extra per swing, durata/cooldown 4s.
    'Runic Knuckles-Runic Putrifists': {
        damage: 0,
        extraHitsPerSwing: 1,
        extraHitDamagePercent: 100,
        cooldown: 4
    },

    // Abilità con percentuale non-danno o senza percentuale.
    'Blast Projectile-Oak Wand': { damage: 100 },

    // Royal Praise: riduce la resistenza Nature del nemico del 20% e dà
    // +25% Elemental Power. Non è un'abilità di danno diretto.
    'Royal Praise-Royal Tiara': {
        kind: 'passive',
        damage: 0,
        elementalPowerPercent: 25,
        resistancePercent: { nature: -20 },
        requiresPriorHit: true
    },

    // Soil Infestation: i nemici subiscono il 25% di danno in più.
    'Soil Infestation-Gloomfang Mace': {
        damage: 0,
        damageTakenIncreasePercent: 25
    },

    // Corrupt Aura (Abyssal Necklace): aura periodica ogni 3s mentre ci si
    // muove, 125% di danno ai nemici vicini.
    'Corrupt Aura-Abyssal Necklace': {
        damage: 125,
        cooldown: 3,
        periodic: true,
        // L'aura colpisce ogni 3s e il debuff dura 3s: assumiamo uptime 100%.
        defenseReductionPercent: 20
    },

    // Storm's Resonance: 5 aure da 33% (una al secondo), durata 5s e
    // cooldown 5s. Modellata come abilità attiva con 5 hit per cast.
    "Storm's Resonance-Storm's Fury": {
        kind: 'ability',
        damage: 33,
        times: 5,
        hitsPerUse: 5,
        cooldown: 5
    },

    // Cooldown specifici.
    'Log Throw-Giant Log': { cooldown: 1.2 },
    'Piercing-Windripper Crossbow': { cooldown: 1.2 },
    'Piercing-Silver Crossbow': { cooldown: 1 },
    'Godpierce-Aetheris': { cooldown: 1.5 },

    // Aracha Infestation (Voras Harbringer): il testo è solo nel lore.
    // Assumiamo 5 hit da 100% ciascuno.
    'Aracha Infestation-Voras Harbringer': {
        damage: 100,
        times: 5,
        hitsPerUse: 5,
        energy: 24
    }
};
