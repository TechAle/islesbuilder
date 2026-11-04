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
 * @property {number|string} value - Valore calcolato
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
 * @property {number} percent - Modificatore percentuale del tipo di danno
 * @property {number} masteryPercent - Modificatore del mastery della classe arma
 * @property {number} masteryBonus - Danno piatto aggiunto dal mastery (flatDamage × mastery%)
 * @property {number} damage - Danno finale
 * @property {Array<{label: string, percent: number}>} modifiers - Dettaglio dei modificatori
 * @property {number} elementalPower - Elemental Power totale
 * @property {number} crystalInsightsPercent - EP% medio stimato da Crystal Insights
 * @property {number} naturalDistillationPercent - Percentuale di Crit Damage convertita
 * @property {number} distilledCritDamagePercent - Crit Damage percentuale rimosso
 * @property {number} distilledElementalPowerFlat - EP flat guadagnato (2× il Crit Damage rimosso)
 * @property {number} elementalSynergyFlat - EP flat guadagnato da Elemental Synergy
 * @property {number} elementalDamagePercent - Percentuale elementale base
 * @property {number} effectiveElementalPercent - Percentuale elementale scalata dall'EP
 */

/**
 * Risultato di Natural Distillation.
 * @typedef {Object} NaturalDistillationEffect
 * @property {number} distillationPercent - Valore del nodo (es. 25)
 * @property {number} convertedCritDamagePercent - Crit Damage rimosso
 * @property {number} critDamageModifier - Modificatore con segno da sommare al Crit Damage
 * @property {number} elementalPowerFlat - EP flat guadagnato (2× il Crit Damage rimosso)
 */

/**
 * Risultato dello step "Damage Multiplier".
 * @typedef {Object} DamageMultiplierStepResult
 * @property {number} baseDamage - Danno prima del moltiplicatore
 * @property {number} elementalKnowledge - Valore del nodo Elemental Knowledge
 * @property {number} elementalKnowledgeDamagePercent - Aumento dato da Elemental Knowledge
 * @property {number} griefInflictionPercent - Valore del nodo Grief Infliction
 * @property {number} griefUptime - Uptime del Grief (1-100)
 * @property {number} griefDamagePercent - Aumento effettivo del Grief
 * @property {number} lastSorrowPercent - Valore del nodo Last Sorrow
 * @property {number} lastSorrowUptime - Uptime di Last Sorrow (1-100)
 * @property {number} lastSorrowDamagePercent - Aumento effettivo di Last Sorrow
 * @property {number} focusStacksPercent - Danno% per stack di Focus
 * @property {number} focusCapacity - Stack extra da Focus Capacity
 * @property {number} focusMaxStacks - Stack massimi (3 + Focus Capacity)
 * @property {number} focusStacks - Stack medi usati
 * @property {number} focusDamagePercent - Aumento effettivo di Focus
 * @property {number} multiplierPercent - Aumento percentuale totale
 * @property {number} multiplier - Moltiplicatore applicato
 * @property {number} damage - Danno dopo il moltiplicatore
 */

/**
 * Risultato dello step "Critical Damage".
 * @typedef {Object} CriticalDamageStepResult
 * @property {number} baseDamage - Danno non critico di partenza
 * @property {number} critChance - Probabilità di critico (può superare 100)
 * @property {number} effectiveCritChance - Probabilità usata nella media (max 100)
 * @property {number} critChanceOverflow - Quanto il crit chance supera 100
 * @property {number} critDamagePercent - Crit Damage totale (base + statistica)
 * @property {number} effectiveCritDamagePercent - Crit Damage dopo Natural Distillation
 * @property {number} distillationPercent - Percentuale convertita da Natural Distillation
 * @property {number} convertedCritDamagePercent - Crit Damage convertito in Elemental Power
 * @property {number} criticalHit - Danno del colpo critico
 * @property {number} averageDamage - Danno medio pesato sul crit rate
 * @property {number} damage - Danno finale dello step
 */

/**
 * Risultato dello step "Attack Speed & Energy".
 * @typedef {Object} AttackSpeedStepResult
 * @property {number} damage - Danno medio per colpo
 * @property {number} attackInterval - Secondi per attacco
 * @property {number} attacksPerSecond - Attacchi al secondo
 * @property {number} dps - Danno al secondo
 * @property {number} attackEnergyCost - Energia consumata per attacco
 * @property {number} energyRegen - Energia rigenerata al secondo
 * @property {number} energyPerSecond - Saldo energetico al secondo
 * @property {number} maxEnergy - Energia massima
 * @property {number} secondsToEmpty - Secondi prima di esaurire l'energia (Infinity se non si esaurisce)
 * @property {boolean} sustain - True se l'energia rigenerata copre quella consumata
 * @property {number} potionInterval - Secondi tra una pozione e l'altra per mantenere l'energia
 * @property {boolean} potionSustainable - True se il cooldown delle pozioni basta
 */

/**
 * Impostazioni del calcolo danni.
 * @typedef {Object} DamageSettings
 * @property {boolean} slowAttack - Se true, usa attackInterval al posto del calcolo
 * @property {number|null} attackInterval - Intervallo attacco manuale in secondi
 * @property {boolean} useBurst - Se true, aggiunge il burst ogni 30s
 * @property {number} griefUptime - Uptime di Grief Infliction (1-100)
 * @property {number} lastSorrowUptime - Uptime di Last Sorrow (1-100)
 * @property {number} focusStacks - Stack medi di Focus (0-3+)
 * @property {number} potentialChargeKills - Kill medi per Potential Charge (0-30)
 */

/**
 * Risultato dello step "Burst DPS".
 * @typedef {Object} BurstStepResult
 * @property {boolean} visible - Se la sezione va mostrata
 * @property {boolean} available - Se il core Mage è equipaggiato
 * @property {boolean} enabled - Se il burst è attivo
 * @property {number} burstDps
 * @property {number} burstDamagePerSecond
 * @property {number} burstEnergyPerSecond
 * @property {number} potentialChargeSeconds
 * @property {number} potentialChargeKills
 * @property {number} cooldownReduction
 * @property {number} burstCooldown
 * @property {number} burstCycle
 * @property {number} attackDps
 * @property {number} totalDps
 * @property {number} energyPerSecond
 * @property {number} maxEnergy
 * @property {number} secondsToEmpty
 * @property {boolean} sustain
 * @property {number} potionInterval
 * @property {boolean} potionSustainable
 */

/**
 * Risultato degli effetti di Elemental Knowledge.
 * @typedef {Object} ElementalKnowledgeEffect
 * @property {number} elementalKnowledgePercent
 * @property {number} damageMultiplierPercent
 * @property {number} damageMultiplier
 */

/**
 * Risultato dello step "Crystal Combustion".
 * @typedef {Object} CrystalCombustionStepResult
 * @property {boolean} enabled
 * @property {number} averageDamage
 * @property {number} hitsPerSecond
 * @property {number} critsPerSecond
 * @property {number} recoverChancePercent
 * @property {number} powerChancePercent
 * @property {number} recoverCrystalsPerSecond
 * @property {number} powerCrystalsPerSecond
 * @property {number} crystalsPerSecond
 * @property {number} combustionPercent
 * @property {number} damagePerCrystal
 * @property {number} combustionDps
 * @property {number} totalDps
 */

/**
 * Contesto condiviso dagli step di calcolo del danno.
 * @typedef {Object} DamageContext
 * @property {Record<string, StatTotals>} statsValues
 * @property {Record<ClassKey, Record<string, number>>} skillValues
 * @property {BuildState} build
 * @property {Record<ClassKey, SkillTreeClass>} [skillTrees]
 * @property {EquipSlotData|null} weapon
 * @property {DamageSettings} settings
 * @property {Record<string, any>} results - Risultati accumulati dagli step
 */

/**
 * Singolo step della pipeline di danno.
 * @typedef {Object} DamageStep
 * @property {string} id - Identificativo univoco dello step
 * @property {string} label - Nome leggibile
 * @property {(context: DamageContext) => Record<string, any>} run - Calcolo puro
 * @property {(result: any) => DamageResult[]} [toResults] - Converte il risultato in righe visualizzabili
 * @property {(result: any) => boolean} [isVisible] - Se false, lo step non compare nel render
 */

export {};
