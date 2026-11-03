/**
 * @typedef {'warrior'|'archer'|'mage'} ClassKey
 */

/**
 * @typedef {'weapon'|'glove'|'helmet'|'amulet'|'chestplate'|'ring1'|'ring2'|'leggings'|'boots'|'feet'|'core'|'pets'} EquipSlot
 */

/**
 * Statistiche di un oggetto. Le chiavi sono dinamiche e dipendono dall'oggetto
 * (es. "Crit Chance", "Normal Attack", "Weapon Type", "element").
 * @typedef {Record<string, number|string>} ItemStats
 */

/**
 * Somma dei contributi flat e percentuali di una statistica.
 * @typedef {Object} StatTotals
 * @property {number} flat - Somma dei contributi espressi in valore assoluto
 * @property {number} percent - Somma dei contributi espressi in percentuale
 */

/**
 * @typedef {Object} Augment
 * @property {string} name
 * @property {ItemStats} [stats]
 */

/**
 * @typedef {Object} ItemPreset
 * @property {string} name
 * @property {ItemStats} stats
 */

/**
 * @typedef {Object} Elixir
 * @property {string} id - Identificativo univoco dell'elisir (usato per condivisione/salvataggio)
 * @property {string} name
 * @property {string} stat - Statistica modificata dall'elisir
 * @property {number} val - Livello selezionato dell'elisir (0-5)
 * @property {number} perLevel - Valore della statistica per ogni livello
 * @property {boolean} percent - True se il valore è percentuale
 */

/**
 * @typedef {Object} SkillParameter
 * @property {number} base - Valore al livello 1
 * @property {number} increase - Incremento per ogni livello successivo
 */

/**
 * @typedef {Object} SkillNode
 * @property {number} x - Percentuale coordinata X (0-100)
 * @property {number} y - Percentuale coordinata Y (0-100)
 * @property {number} max - Livello massimo del nodo
 * @property {number} costBase - Costo base in punti SP
 * @property {boolean} [center] - Se il nodo è il punto d'origine iniziale
 * @property {string} name - Nome visualizzato del nodo
 * @property {string} statKey - Chiave/descrizione della statistica modificata
 * @property {boolean} isDirect - True se il valore va applicato direttamente alle statistiche
 * @property {string} description - Descrizione del nodo (con eventuali segnaposto)
 * @property {Record<string, SkillParameter>} [parameters] - Parametri di scaling per livello
 */

/**
 * @typedef {Object} SkillTreeClass
 * @property {Record<string, SkillNode>} nodes
 * @property {Array<[string, string]>} edges
 */

/**
 * Dati di uno slot equipaggiato.
 * @typedef {Object} EquipSlotData
 * @property {string} name
 * @property {ItemStats} stats
 * @property {string[]} augments
 */

/**
 * Stato completo di una build.
 * @typedef {Object} BuildState
 * @property {number} sharedPoints
 * @property {ClassKey} currentClass
 * @property {Record<EquipSlot, EquipSlotData>} activeEquip
 * @property {Elixir[]} elixirs
 * @property {Record<ClassKey, Map<string, number>>} treeLevels
 */

/**
 * Dati globali di riferimento gestiti dal DataStore.
 * @typedef {Object} DomainData
 * @property {Record<string, ItemPreset[]>} items
 * @property {Augment[]} augments
 * @property {Elixir[]} elixirsConfig
 * @property {Record<ClassKey, SkillTreeClass>} skillTrees
 */

/**
 * Formato serializzato usato nei link di condivisione.
 * @typedef {Object} SerializedState
 * @property {Record<string, EquipSlotData>} equip
 * @property {Array<{id: string, val: number}>} elixirs
 * @property {Record<ClassKey, Array<[string, number]>>} treeLevels
 * @property {ClassKey} currentClass
 * @property {number} sharedPoints
 */

/**
 * Nodo pronto per il render dell'albero skill.
 * @typedef {Object} SkillNodeView
 * @property {string} id
 * @property {SkillNode} node
 * @property {number} level
 * @property {boolean} available
 */

/**
 * Collegamento pronto per il render dell'albero skill.
 * @typedef {Object} SkillEdgeView
 * @property {string} parent
 * @property {string} child
 * @property {boolean} active
 */

/**
 * Vista completa dell'albero skill corrente.
 * @typedef {Object} SkillTreeView
 * @property {SkillNodeView[]} nodes
 * @property {SkillEdgeView[]} edges
 * @property {ClassKey} currentClass
 * @property {number} sharedPoints
 */

/**
 * Dati calcolati per il tooltip di un nodo skill.
 * @typedef {Object} NodeInfo
 * @property {string} name
 * @property {number} level
 * @property {number} max
 * @property {string} description
 * @property {number} nextCost
 * @property {boolean} isMax
 */

/**
 * Risultato di un calcolo di danno/DPS.
 * @typedef {Object} DamageResult
 * @property {string} label - Nome della voce di danno
 * @property {number} value - Valore calcolato
 * @property {string} [unit] - Unità opzionale (es. "%", "DPS")
 */

/**
 * Risultato dello step "Base Damage".
 * @typedef {Object} BaseDamageStepResult
 * @property {string|null} damageType - Damage Type dell'arma (es. "Arcane")
 * @property {string|null} statName - Statistica usata (es. "Arcane Damage")
 * @property {number} damageStat - Valore flat della statistica (le % sono applicate dopo)
 * @property {number} defaultAttackPercent - Default Attack dell'arma in percentuale
 * @property {number} baseDamage - Danno base calcolato
 * @property {string} [missing] - Dato mancante che ha impedito il calcolo
 */

/**
 * Risultato dello step "Damage Modifiers".
 * @typedef {Object} DamageModifiersStepResult
 * @property {number} baseDamage - Base Damage di partenza
 * @property {number} percent - Somma dei modificatori percentuali
 * @property {number} damage - Danno dopo i modificatori
 * @property {Array<{label: string, percent: number}>} modifiers - Dettaglio dei modificatori
 */

/**
 * Contesto condiviso dagli step di calcolo del danno.
 * @typedef {Object} DamageContext
 * @property {Record<string, StatTotals>} statsValues
 * @property {Record<ClassKey, Record<string, number>>} skillValues
 * @property {BuildState} build
 * @property {EquipSlotData|null} weapon
 * @property {Record<string, any>} results - Risultati accumulati dagli step
 */

/**
 * Singolo step della pipeline di danno.
 * @typedef {Object} DamageStep
 * @property {string} id - Identificativo univoco dello step
 * @property {string} label - Nome leggibile
 * @property {(context: DamageContext) => Record<string, any>} run - Calcolo puro
 * @property {(result: any) => DamageResult[]} [toResults] - Converte il risultato in righe visualizzabili
 */

export {};
