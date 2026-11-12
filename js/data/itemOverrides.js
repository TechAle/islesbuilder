/**
 * Override manuali dei dati degli oggetti.
 *
 * L'API non è sempre aggiornata: se un oggetto presente nell'API ha lo stesso
 * nome di una voce qui sotto, i valori definiti qui sovrascrivono (o
 * aggiungono) quelli dell'API. Le chiavi delle statistiche sono quelle usate
 * dall'app (es. "Default Attack", "element", "Thunder Damage").
 *
 * La corrispondenza del nome non distingue maiuscole/minuscole.
 *
 * @type {Record<string, import('./types.js').ItemStats>}
 */
export const ITEM_OVERRIDES = {
    Tempest: {
        element: 'nature'
    },
    "Royal Blowpipe": {
        element: 'thunder'
    },
    "Oblivion": {
        "Default Attack": 100
    },
    "Demeanor of Dragons": {
        "Default Attack": 100
    },
    "Voras Harbringer": {
        "Default Attack": 85,
        "Ability 1": "Aracha Infestation"
    },
    "Invar Mace": {
        "Default Attack": 133
    },
    "Oak Bow": {
        "Default Attack": 100
    },
    // L'API restituisce Default Attack null per molte armi di livello basso.
    // I valori sono dedotti dalle armi dello stesso tipo/slot.
    "Bronze Focus": {
        "Default Attack": 60
    },
    "Bronze Gauntlet": {
        "Default Attack": 60
    },
    "Bronze Crux": {
        "Default Attack": 110
    },
    "Nightweb Crux": {
        "Default Attack": 110
    },
    "Oak Wand": {
        "Default Attack": 85
    },
    "Invar Axe": {
        "Default Attack": 75
    },
    "Bronze Dagger": {
        "Default Attack": 65
    },
    "Invar Dagger": {
        "Default Attack": 65
    },
    "Invar Hammer": {
        "Default Attack": 175
    },
    "Bronze Spear": {
        "Default Attack": 120
    },
    "Invar Spear": {
        "Default Attack": 120
    },
    "Flameburster": {
        "Default Attack": 100
    },
    "Invar Sword": {
        "Default Attack": 100
    },
    "Royal's Bane": {
        "Default Attack": 125
    },
    "Royal’s Bane": {
        "Default Attack": 125
    },
    "Bronze Handcannon": {
        "Default Attack": 115
    },
    "Bronze Pot": {
        "Default Attack": 90
    },
    "Bronze Kunai": {
        "Default Attack": 80
    },
    "Recluse Kunai": {
        "Default Attack": 80
    },
    "Pirate hat": {
        "Blunt Damage": "9.78%",
        "Heavy Damage": "9.83%",
        "Crit Damage": "16.04%",
        "Crit Chance": "9.07%",
        "Thunder Damage": "5%"
    },
    "Queen Bee Boots": {
        "Nature Damage": "5%",
        "Elemental Power": 31.9
    },
    "Queen Bee Chestplate": {
        "Nature Damage": "5%",
        "Elemental Power": 34.6
    },
    "Queen Bee Leggings": {
        "Nature Damage": "5%",
        "Elemental Power": 31.8
    },
    "Queen Bee Helmet": {
        "Nature Damage": "5%"
    },
    "Royal Tiara": {
        "Nature Damage": "5%",
        "Elemental Power": "25.6%",
        "Ability 2": "Royal Praise"
    },
    // The Drizzler: l'API riporta un'istanza con crit damage errato e non
    // espone l'elemento (glifo U+EA37 non mappato). Dati confermati in gioco:
    // +37.5% Crit Damage, elemento Nature, Honey Healing 250%.
    "The Drizzler": {
        "Crit Damage": "37.5%",
        element: 'nature',
        "Ability 1": "Honey Healing"
    },
    "Abyssal Blight Chestplate": {
        "Void Damage": "5%",
    },
    "Abyssal Blight Helmet": {
        "Void Damage": "5%",
    },
    "Abyssal Blight Leggings": {
        "Void Damage": "5%",
    },
    "Abyssal Blight Boots": {
        "Void Damage": "5%",
    },
    // Storm's Legacy: in gioco ogni pezzo dà anche +5% Void Damage e
    // +29 Elemental Power, non presenti nei dati API.
    "Storm's Legacy Helmet": {
        "Void Damage": "5%",
        "Elemental Power": 29,
    },
    "Storm's Legacy Chestplate": {
        "Void Damage": "5%",
        "Elemental Power": 29,
    },
    "Storm's Legacy Leggings": {
        "Void Damage": "5%",
        "Elemental Power": 29,
    },
    "Storm's Legacy Boots": {
        "Void Damage": "5%",
        "Elemental Power": 29,
    },
    "Blackrib Helmet": {
        "Thunder Damage": "5%"
    },
    "Blackrib Chestplate": {
        "Thunder Damage": "5%"
    },
    "Blackrib Leggings": {
        "Thunder Damage": "5%"
    },
    "Blackrib Boots": {
        "Thunder Damage": "5%"
    },
};
