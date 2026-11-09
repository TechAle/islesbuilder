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
 * Livello di un augment.
 * @typedef {Object} AugmentLevel
 * @property {number} level
 * @property {number} value
 * @property {Record<string, number>} [params]
 */

/**
 * Effetto di un augment.
 * @typedef {Object} AugmentEffect
 * @property {string} type
 * @property {string} [stat]
 * @property {boolean} [percent]
 * @property {'missing'|'current'|'currentEnemy'} [hpBasis]
 * @property {number} [baseCoefficient]
 * @property {number} [growthCoefficient]
 */

/**
 * Override di effetto dichiarato in data/augments.js.
 * @typedef {Object} AugmentEffectOverride
 * @property {string} type
 * @property {string} [stat]
 * @property {boolean} [percent]
 * @property {'missing'|'current'|'currentEnemy'} [hpBasis]
 * @property {number} [baseCoefficient]
 * @property {number} [growthCoefficient]
 */

/**
 * Definizione completa di un augment (API + override).
 * @typedef {Object} AugmentDefinition
 * @property {string} name
 * @property {'weapon'|'armor'} goesIn
 * @property {string} group
 * @property {string} rarity
 * @property {AugmentEffect} effect
 * @property {AugmentLevel[]} levels
 */

/**
 * Abilità speciale o passive di un'arma.
 * @typedef {Object} SpecialAbility
 * @property {string} name - `NomeAbilità-NomeArma`
 * @property {string} ability - Nome dell'abilità originale
 * @property {string} weapon - Nome dell'arma
 * @property {'ability'|'passive'} kind
 * @property {'rightClick'|'f'|null} key
 * @property {number|null} energy
 * @property {number} damage - Percentuale di danno dell'abilità
 * @property {number} times - Numero di colpi/istanze per il danno
 * @property {number} hitsPerUse - Hit contati per gli effetti (default 1)
 * @property {boolean} [hitsMatchTimes] - Se true, gli hit seguono `times`
 * @property {number} [minHits] - Minimo hit selezionabili
 * @property {number} [maxHits] - Massimo hit selezionabili
 * @property {number} [minDamage] - Danno percentuale minimo selezionabile
 * @property {number} [maxDamage] - Danno percentuale massimo selezionabile
 * @property {number} [extraHitsPerSwing] - Hit extra per ogni attacco base
 * @property {number} [extraHitDamagePercent] - Danno percentuale degli hit extra
 * @property {number} [damageTakenIncreasePercent] - Aumento danno subito dal nemico
 * @property {Record<string, number>} [resistancePercent] - Resistenza nemica per elemento (es. { nature: -20 })
 * @property {number} [elementalPowerPercent] - Elemental Power% aggiunto dall'abilità
 * @property {boolean} [requiresPriorHit] - True se l'effetto richiede un colpo precedente
 * @property {number} cooldown - Cooldown in secondi (default 1.6 per onClick)
 * @property {number|null} everyHits - Per le passive: ogni quanti attacchi scatta
 * @property {string} text
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
 * @property {number} [upgradeLevel]
 * @property {boolean} [abilitiesEdited] - True se le abilità sono state modificate manualmente
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
 * @property {AugmentDefinition[]} augments
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
 * @property {string} [help] - Tooltip opzionale mostrato accanto alla label
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
 * @property {string|null} damageType - Tipo di danno dell'arma
 * @property {string} weaponClass - Classe dell'arma
 * @property {string} element - Elemento dell'arma
 * @property {number} elementSpecificPercent - Percentuale del danno elementale specifico
 * @property {number} elementalResistancePercent - Resistenza nemica per l'elemento (negativa = ridotta)
 * @property {number} abilityElementalPowerPercent - EP% fornito da abilità equipaggiate
 * @property {number} elementalChannelingPercent - Valore di Elemental Channeling
 * @property {number} percent - Modificatore percentuale del tipo di danno
 * @property {number} masteryPercent - Modificatore del mastery della classe arma
 * @property {number} masteryBonus - Danno aggiunto dal mastery
 * @property {number} [summaryDamage] - Danno finale dopo tutti i moltiplicatori
 * @property {number} damage - Danno finale
 * @property {Array<{label: string, percent: number}>} modifiers - Dettaglio dei modificatori
 * @property {number} elementalPower - Elemental Power totale
 * @property {number} elementalPowerPercent - Elemental Power% totale (abilità, Crystal Insights)
 * @property {number} crystalInsightsPercent - EP% medio stimato da Crystal Insights
 * @property {number} naturalDistillationPercent - Percentuale di Crit Damage convertita
 * @property {number} distilledCritDamagePercent - Crit Damage percentuale rimosso
 * @property {number} distilledElementalPowerFlat - EP flat guadagnato (2× il Crit Damage rimosso)
 * @property {number} elementalSynergyFlat - EP flat guadagnato da Elemental Synergy
 * @property {number} elementalDamagePercent - Percentuale elementale base
 * @property {number} effectiveElementalPercent - Percentuale elementale scalata dall'EP
 * @property {number} blueOrbs - BLUE orb medie attive
 * @property {number} blueDamageMultiplier - Moltiplicatore danno dato dalle BLUE orb
 * @property {number} blueDamagePercent - Bonus percentuale delle BLUE orb
 * @property {number} genericDamagePercent - Bonus `Damage%` generico (es. Glass Cannon)
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
 * @property {number} damageTakenIncreasePercent - Aumento danno subito dal nemico
 * @property {number} multiplierPercent - Aumento percentuale totale
 * @property {number} multiplier - Moltiplicatore applicato
 * @property {number} damage - Danno dopo il moltiplicatore
 */

/**
 * Risultato dello step finale "Augments".
 * @typedef {Object} AugmentFinalStepResult
 * @property {boolean} enabled
 * @property {boolean} hasExecution
 * @property {boolean} hasSetExecution
 * @property {boolean} hasProsecution
 * @property {boolean} hasHunter
 * @property {boolean} hasEnraged
 * @property {boolean} hasInfected
 * @property {boolean} hasFirstStrike
 * @property {number} baseDamageBefore
 * @property {number} damageBefore
 * @property {number} augmentPercent
 * @property {string|null} damageType
 * @property {number} damageStatPercent
 * @property {number} natureBlessFlat
 * @property {number} natureBlessMultiplier
 * @property {number} infectedPercent
 * @property {number} enragedPercent
 * @property {number} executionPercent
 * @property {number} setExecutionPercent
 * @property {number} hunterPercent
 * @property {number} prosecutionPercent
 * @property {number} firstStrikePercent
 * @property {number} multiplier
 * @property {number} baseDamage
 * @property {number} damage
 */

/**
 * Effetti medi di Deadeye, calcolati dentro Critical Damage.
 * @typedef {Object} DeadeyeEffectsResult
 * @property {boolean} visible - Se uno dei nodi Deadeye è livellato
 * @property {boolean} enabled - Se la simulazione è stata eseguita
 * @property {number} totalHitsPerSecond - Hit/s usati per generare critici
 * @property {number} baseCritChancePercent - Crit Chance base + Hot Streak
 * @property {number} critChancePerStackPercent - Crit Chance per stack
 * @property {number} stackDurationSeconds - Durata degli stack
 * @property {number} maxStacks - Stack massimi (3 + Capacity)
 * @property {number} perfectChainLevel - Livello di Perfect Chain
 * @property {number} perfectChainCritDamagePercent - Crit Damage del buff
 * @property {number} averageStacks - Stack medi stimati
 * @property {number} averageCritChancePercent - Crit Chance media stimata
 * @property {number} critChanceBonusPercent - Bonus medio di Crit Chance
 * @property {number} perfectChainUptime - Uptime medio del buff (0-1)
 * @property {number} averagePerfectChainCritDamagePercent - Crit Damage medio
 * @property {string|null} reason - Motivo per cui non è attivo
 */

/**
 * Risultato di Elemental Burst.
 * @typedef {Object} ElementalBurstEffectsResult
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {number} level
 * @property {number} baseCritDamagePercent
 * @property {boolean} elementalChannelingActive
 * @property {number} elementalChannelingMultiplier
 * @property {number} critDamageBonusPercent
 * @property {string|null} reason
 */

/**
 * Risultato medio di Critical Pity.
 * @typedef {Object} CriticalPityEffectsResult
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {number} level
 * @property {number} critChancePerStackPercent
 * @property {number} maxStacks
 * @property {number} durationSeconds
 * @property {number} totalHitsPerSecond
 * @property {number} averageCritChancePercent
 * @property {number} missChancePercent
 * @property {number} reachableStacks
 * @property {number} expectedStacks
 * @property {number} critChanceBonusPercent
 * @property {string|null} reason
 */

/**
 * Risultato medio di Ultimatum Criterium / Ultimatum Vagrus.
 * @typedef {Object} UltimateEffectsResult
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {number} durationSeconds
 * @property {number} burstCycle
 * @property {number} burstCastsPerSecond
 * @property {number} uptime
 * @property {number} critChancePercent
 * @property {number} critDamagePercent
 * @property {number} rawCritChancePercent
 * @property {number} rawCritDamagePercent
 * @property {number} secondWindChancePercent
 * @property {number} secondWindCooldownSeconds
 * @property {number} secondWindResetsPerSecond
 * @property {boolean} hasSecondWind
 * @property {string|null} reason
 */

/**
 * Effetti dei set equipaggiati.
 * @typedef {Object} ItemSetEffectsResult
 * @property {number} aetherbloomPieces
 * @property {string[]} aetherbloomSlots
 * @property {boolean} hasAetherbloom
 * @property {boolean} hasExecution
 * @property {number} executionPercent
 * @property {boolean} hasAlliance
 * @property {number} nearbyPlayers
 * @property {number} allianceCritChancePercent
 * @property {number} executionMaxPercent
 * @property {number} allianceCritChancePerPlayer
 * @property {number} allianceMaxPlayers
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
 * @property {number} [sharpshooterCritChancePercent] - Crit Chance da Hot Streak
 * @property {number} [sharpshooterCritDamagePercent] - Crit Damage da Hot Streak
 * @property {DeadeyeEffectsResult} deadeye - Effetti medi di Deadeye
 * @property {number} deadeyeCritChancePercent - Crit Chance media da Deadeye
 * @property {number} deadeyeCritDamagePercent - Crit Damage medio da Perfect Chain
 * @property {CriticalPityEffectsResult} criticalPity - Effetti medi di Critical Pity
 * @property {number} criticalPityCritChancePercent - Crit Chance media da Critical Pity
 * @property {ElementalBurstEffectsResult} elementalBurst - Effetti di Elemental Burst
 * @property {number} elementalBurstCritDamagePercent - Crit Damage da Elemental Burst
 * @property {UltimateEffectsResult} ultimate - Effetti medi di Ultimatum Criterium/Vagrus
 * @property {number} ultimateCritChancePercent - Crit Chance media da Ultimatum Criterium
 * @property {number} ultimateCritDamagePercent - Crit Damage medio da Ultimatum Vagrus
 * @property {ItemSetEffectsResult} itemSets - Effetti dei set equipaggiati
 * @property {number} distillationPercent - Percentuale convertita da Natural Distillation
 * @property {number} convertedCritDamagePercent - Crit Damage convertito in Elemental Power
 * @property {number} criticalHit - Danno del colpo critico
 * @property {number} averageDamage - Danno medio pesato sul crit rate
 * @property {number} damage - Danno finale dello step
 */

/**
 * Risultato dello step "Sharpshooter".
 * @typedef {Object} SharpshooterStepResult
 * @property {boolean} visible - Se il nodo o i suoi potenziamenti sono attivi
 * @property {number} baseDamage - Danno prima del bonus Sharpshooter
 * @property {number} damage - Danno dopo il bonus Sharpshooter
 * @property {number} totalHitsPerSecond - Hit/s usati per stimare gli stack
 * @property {number} ricochetHitsPerSecond - Hit/s aggiunti da Ricochet
 * @property {number} stackValuePercent - Danno% per stack
 * @property {number} capacity - Stack extra da Sharpshooter Capacity
 * @property {number} maxStacks - Stack massimi (10 + capacity)
 * @property {number} windowSeconds - Finestra entro cui un hit dà uno stack
 * @property {number} gainCooldown - Cooldown tra i gain (0.2s)
 * @property {number} stacksPerSecond - Gain rate effettivo
 * @property {number} timeToMaxStacks - Secondi stimati per arrivare al cap
 * @property {boolean} canGainStacks - Se gli hit sono abbastanza frequenti
 * @property {number} sharpshooterResetsPerSecond - Reset di Sharpshooter al secondo (0-2)
 * @property {number} stackUptime - Uptime stimato degli stack (0-1)
 * @property {number} fightDurationSeconds - Durata stimata del fight (Infinity se non nota)
 * @property {number} rampFactor - Fattore medio della fase di ramp (0-1)
 * @property {number} stacks - Stack medi stimati
 * @property {number} damagePercent - Bonus danno totale da Sharpshooter
 * @property {number} hotStreakLevel - Livello del nodo Hot Streak
 * @property {boolean} hotStreakActive - Se Hot Streak è attivo
 * @property {number} hotStreakUptime - Quota di fight con Hot Streak attivo (0-1)
 * @property {number} hotStreakCritChancePercent - Crit Chance media da Hot Streak
 * @property {number} hotStreakCritDamagePercent - Crit Damage medio da Hot Streak
 * @property {boolean} enabled - Se Sharpshooter Stacks è livellato
 * @property {string|null} reason - Motivo per cui non è attivo
 */

/**
 * Risultato dello step "Ricochet".
 * @typedef {Object} RicochetStepResult
 * @property {number} ricochetPercent - Valore del nodo Ricochet
 * @property {number} procChance - Probabilità per attacco (0-1)
 * @property {number} attacksPerSecond - Attacchi ranged al secondo
 * @property {number} maxProcsPerSecond - Limite dato dal cooldown di 2s
 * @property {number} procsPerSecond - Proc effettivi al secondo
 * @property {number} reverseMultiplier - 100 / Default Attack
 * @property {number} abilityDamagePercent - Bonus `Ability Damage%`
 * @property {number} damagePerProc - Danno della singola freccia
 * @property {number} dps - DPS aggiunto da Ricochet
 * @property {number} hitsPerSecond - Hit al secondo aggiunti
 * @property {boolean} enabled - Richiede arma ranged e nodo attivo
 * @property {string|null} reason - Motivo per cui non è attivo
 */

/**
 * Risultato dello step "Special Attacks".
 * @typedef {Object} SpecialAttackStepResult
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {number} averageDamage
 * @property {number} reverseMultiplier
 * @property {number} energyRegen
 * @property {number} baseDps
 * @property {number} maxEnergy
 * @property {Array<{
 *   name: string,
 *   ability: string,
 *   weapon: string,
 *   key: string|null,
 *   energy: number|null,
 *   energyCost: number,
 *   damagePercent: number,
 *   times: number,
 *   hitsPerUse: number,
 *   hitsPerSecond: number,
 *   extraHitsPerSecond: number,
 *   extraDps: number,
 *   damageTakenIncreasePercent: number,
 *   minHits: number|null,
 *   maxHits: number|null,
 *   minDamage: number|null,
 *   maxDamage: number|null,
 *   cooldown: number,
 *   baseCooldown: number,
 *   enabled: boolean,
 *   damagePerHit: number,
 *   damagePerUse: number,
 *   castsPerSecond: number,
 *   dps: number,
 *   totalDps: number,
 *   energyPerSecond: number,
 *   energyOnlySpecial: number,
 *   sustainOnlySpecial: string,
 *   specialPotionInterval: number,
 *   energyWithAttack: number,
 *   sustainWithAttack: string,
 *   attackPotionInterval: number
 * }>} abilities
 */

/**
 * Risultato dello step "Attack Speed & Energy".
 * @typedef {Object} AttackSpeedStepResult
 * @property {number} damage - Danno medio per colpo
 * @property {number} attackInterval - Secondi per attacco
 * @property {number} attacksPerSecond - Attacchi al secondo
 * @property {number} [firstHitDamage] - Danno di un singolo colpo, senza DPS di passive/abilità
 * @property {number} dps - Danno al secondo
 * @property {number} [dpsAll] - DPS totale: attack + burst + combustion + orb + special attack
 * @property {number} passiveDps - Danno al secondo dalle passive
 * @property {number} passiveHitsPerSecond - Hit al secondo dalle passive
 * @property {Array<{name: string, dps: number, hitsPerSecond: number}>} passiveBreakdown
 * @property {number} attackEnergyCost - Energia consumata per attacco
 * @property {number} energyRegen - Energia rigenerata al secondo
 * @property {number} energyPerSecond - Saldo energetico al secondo
 * @property {number} [energyPerSecondAttackBurst] - Energia/s con attacco + burst
 * @property {number} [energyPerSecondAttackBurstSpecial] - Energia/s con attacco + burst + special attack
 * @property {string} [sustainAttackBurst] - Sustain attacco + burst
 * @property {string} [sustainAttackBurstSpecial] - Sustain attacco + burst + special attack
 * @property {number} [secondsToEmptyAttackBurst] - Tempo a 0 energia con attacco + burst
 * @property {number} [secondsToEmptyAttackBurstSpecial] - Tempo a 0 energia con attacco + burst + special attack
 * @property {number} maxEnergy - Energia massima
 * @property {number} secondsToEmpty - Secondi prima di esaurire l'energia (Infinity se non si esaurisce)
 * @property {boolean} sustain - True se l'energia rigenerata copre quella consumata
 * @property {number} potionInterval - Secondi tra una pozione e l'altra per mantenere l'energia
 * @property {boolean} potionSustainable - True se il cooldown delle pozioni basta
 * @property {number} [calculatedStrikePercent] - Valore del nodo Calculated Strike
 * @property {number} [calculatedStrikeKillsPerSecond] - Kill al secondo usate per Calculated Strike
 * @property {number} [calculatedStrikeExtraAttacksPerSecond] - Attacchi extra/s da Calculated Strike
 * @property {number} [calculatedStrikeAttackSpeedPercent] - Aumento equivalente di attack speed
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
 * @property {number} [ultimateKillsPerSecond] - Kill al secondo per Second Wind (0-4)
 * @property {boolean} crystalExplosionOverride - Se true, usa il valore dello slider
 * @property {number} crystalExplosionsPerSecond - Cristalli esplosi al secondo (override)
 * @property {string[]} [disabledSpecialAttacks] - Nomi delle abilità onClick disabilitate
 * @property {Record<string, number>} [abilityCooldownOverrides] - Cooldown override per abilità
 * @property {Record<string, number>} [abilityHitCountOverrides] - Numero hit per abilità
 * @property {Record<string, number>} [abilityDamageOverrides] - Danno % per abilità
 * @property {number} [executionHpPercent] - HP attuali del nemico per Execution (0-100)
 * @property {number} [nearbyPlayers] - Giocatori vicini per Alliance (0-6)
 * @property {number} [prosecutionHpPercent] - HP attuali del nemico per Prosecution (0-100)
 * @property {number} [enragedHpPercent] - HP attuali del player per Enraged (0-100)
 * @property {number} [infectedHitsOverride] - Override hit/stacks di Infected (0 = automatico)
 * @property {number} [deathburstKillsPerSecond] - Kill al secondo per Deathburst
 * @property {number} [calculatedStrikeKillsPerSecond] - Kill al secondo per Calculated Strike (0-4)
 * @property {number} [sharpshooterResetsPerSecond] - Reset di Sharpshooter al secondo (0-2)
 * @property {number} [targetHealth] - Vita del target, usata per stimare gli stack di Infected
 * @property {number} [targetDefense] - Difesa del target, usata per stimare il TTK
 * @property {number} [estimatedTimeToKill] - TTK stimato interno per gli stack di Infected
 * @property {boolean} [firstHit] - Se true, esclude gli effetti che richiedono un colpo precedente
 */

/**
 * Risultato dello step "Burst DPS".
 * @typedef {Object} BurstStepResult
 * @property {boolean} visible - Se la sezione va mostrata
 * @property {boolean} available - Se un core con burst (Mage/Archer) è equipaggiato
 * @property {string|null} coreName - Nome del core che abilita la burst
 * @property {boolean} enabled - Se il burst è attivo
 * @property {number} burstDps
 * @property {number} burstDamagePerHit
 * @property {number} energyPerSecondBurstOnly
 * @property {number} reverseMultiplier
 * @property {number} burstEnergyPerSecond
 * @property {number} potentialChargeSeconds
 * @property {number} potentialChargeKills
 * @property {number} cooldownReduction
 * @property {number} burstCooldown
 * @property {number} effectiveBurstCooldown
 * @property {number} burstCycle
 * @property {number} burstCastsPerSecond
 * @property {number} secondWindChancePercent
 * @property {number} secondWindCooldownSeconds
 * @property {number} secondWindResetsPerSecond
 * @property {boolean} hasSecondWind
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
 * @property {number} explosionsPerSecond
 * @property {number} maxExplosions
 * @property {number} crystalTypesActive
 */

/**
 * Risultato dello step "Support Orbs".
 * @typedef {Object} SupportOrbsStepResult
 * @property {boolean} enabled
 * @property {number} averageDamage
 * @property {number} spawnChancePercent
 * @property {number} durationSeconds
 * @property {number} damagePercent
 * @property {number} activeOrbs
 * @property {number} baseCapacity
 * @property {number} normalActiveOrbs
 * @property {number} specialActiveOrbs
 * @property {number} extraCapacity
 * @property {number} activeRedOrbs
 * @property {number} activeBlueOrbs
 * @property {number} blueUptime
 * @property {number} blueDamageMultiplier
 * @property {number} blueDamagePercent
 * @property {number} hitsPerSecond
 * @property {number} explosionsPerSecond
 * @property {number} orbHitsPerSecond
 * @property {number} orbDamage
 * @property {number} orbDps
 * @property {number} totalDps
 */

/**
 * Risultato dello step "Augments".
 * @typedef {Object} AugmentDamageStepResult
 * @property {boolean} enabled
 * @property {boolean} hasAny
 * @property {boolean} hasHpAugments
 * @property {boolean} hasEnemyHpAugments
 * @property {boolean} hasExecution
 * @property {boolean} hasProsecution
 * @property {boolean} hasHunter
 * @property {boolean} hasEnraged
 * @property {boolean} hasInfected
 * @property {boolean} hasFirstStrike
 * @property {number} firstStrikePercent
 * @property {number} averageDamage
 * @property {number} reverseMultiplier
 * @property {number} augmentBaseDamage
 * @property {number} totalHitsPerSecond
 * @property {number} critsPerSecond
 * @property {number} killsPerSecond
 * @property {number} comboDps
 * @property {number} chainLightningDps
 * @property {number} deathburstDps
 * @property {number} totalDps
 * @property {boolean} hasCombo
 * @property {boolean} hasChainLightning
 * @property {boolean} hasDeathburst
 */

/**
 * Contesto condiviso dagli step di calcolo del danno.
 * @typedef {Object} DamageContext
 * @property {Record<string, StatTotals>} statsValues
 * @property {Record<ClassKey, Record<string, number>>} skillValues
 * @property {BuildState} build
 * @property {Record<ClassKey, SkillTreeClass>} [skillTrees]
 * @property {EquipSlotData|null} weapon
 * @property {import('../modules/specialAbilityManager.js').SpecialAbilityManager} [specialAbilityManager]
 * @property {DamageSettings} settings
 * @property {Record<string, any>} results - Risultati accumulati dagli step
 * @property {Record<string, any>} [cache] - Cache interna della pipeline
 */

/**
 * Singolo step della pipeline di danno.
 * @typedef {Object} DamageStep
 * @property {string} id - Identificativo univoco dello step
 * @property {string} label - Nome leggibile
 * @property {(context: DamageContext) => Record<string, any>} run - Calcolo puro
 * @property {(result: any) => Array<{label: string, dps: number}>} [getDpsParts] - Contributi DPS della sezione
 * @property {(result: any) => DamageResult[]} [toResults] - Converte il risultato in righe visualizzabili
 * @property {(result: any) => boolean} [isVisible] - Se false, lo step non compare nel render
 */

export {};
