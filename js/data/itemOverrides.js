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
        "Elemental Power": "25.6%"
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
    }
};
