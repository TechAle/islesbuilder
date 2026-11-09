import {
    ARCHER_NODES,
    getArcherNodeLevel,
    getArcherNodeParameter,
    getArcherNodeValue
} from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/** Stack massimi base di Deadeye, prima di Deadeye Capacity. */
export const DEADEYE_BASE_MAX_STACKS = 3;

/** Durata fissa del buff di Perfect Chain, in secondi. */
export const PERFECT_CHAIN_DURATION = 5;

/**
 * Numero di trial della simulazione. Con 1000 trial la simulazione event-driven
 * impiega tipicamente 10-30ms e la varianza residua è trascurabile.
 */
export const DEADEYE_SIMULATION_TRIALS = 1000;

/**
 * Tetto massimo di sicurezza per la simulazione, in millisecondi.
 * Serve solo per macchine molto lente: in condizioni normali 1000 trial
 * finiscono molto prima.
 */
export const DEADEYE_MAX_SIMULATION_MS = 200;

/** Orizzonte simulato per ogni trial, in secondi. */
export const DEADEYE_SIMULATION_HORIZON = 60;

/** Tempo iniziale scartato per evitare di contare la fase di warm-up. */
export const DEADEYE_SIMULATION_WARMUP = 10;

/** Seed base della simulazione: fisso per rendere i risultati riproducibili. */
const DEADEYE_RNG_SEED = 0x9e3779b9;

/**
 * Cache modulo-level dei risultati. La simulazione è deterministica, quindi
 * può essere riusata tra contesti diversi con gli stessi input. Serve
 * soprattutto quando DpsManager ripete la pipeline per il TTK di Infected.
 * @type {Map<string, any>}
 */
const DEADEYE_EFFECTS_CACHE = new Map();
const DEADEYE_EFFECTS_CACHE_MAX = 64;

/** Orologio monotono, con fallback per ambienti senza `performance`. */
function now() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
}

/**
 * Generatore pseudo-casuale deterministico.
 *
 * Non usiamo `Math.random()` perché vogliamo che, a parità di input, il
 * risultato della simulazione sia sempre lo stesso. Ogni trial usa un seed
 * diverso ma ricavato in modo deterministico dal seed base.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function createRng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/**
 * Tempo fino al prossimo evento di Poisson con rate `rate`.
 * Se il rate è 0, l'evento non arriva mai.
 *
 * @param {number} rate
 * @param {() => number} rng
 * @returns {number}
 */
function exponential(rate, rng) {
    return rate > 0 ? -Math.log(1 - rng()) / rate : Infinity;
}

/**
 * Deadeye è un sistema retroazionato con reset:
 *
 *   critici → stack → Crit Chance → più critici → più stack
 *
 * e, quando gli stack raggiungono il massimo:
 *
 *   Perfect Chain → +Crit Damage per 5s → stack azzerati → riparte da 0
 *
 * Il tentativo precedente usava una simulazione fluida a passi (mean-field):
 * gli stack erano una quantità continua e il decadimento era `S -= S/τ × dt`.
 * Un double check con una simulazione Monte Carlo a stack individuali ha
 * mostrato che quel modello sovrastima la Crit Chance media, perché non
 * cattura la varianza: nella realtà i critici arrivano in modo irregolare,
 * i picchi raggiungono il cap prima, Perfect Chain parte più spesso e resetta
 * gli stack più spesso.
 *
 * Qui quindi simuliamo eventi discreti:
 *
 * - i critici arrivano come processo di Poisson con rate H × CritChance;
 * - ogni stack ha una scadenza esatta dopo `τ` secondi;
 * - quando il numero di stack raggiunge `maxStacks`, Perfect Chain parte,
 *   gli stack vengono azzerati e il timer del buff viene portato a 5s;
 * - il buff viene rinfrescato se Perfect Chain riparte prima che scada.
 *
 * La simulazione è Monte Carlo, ma con seed fisso: a parità di input il
 * risultato è identico. Non c'è variabilità tra un ricalcolo e l'altro.
 *
 * Approssimazioni:
 * - i critici sono trattati come processo di Poisson, non come colpi periodici
 *   con Bernoulli; è la stessa approssimazione usata dal modello hit condiviso;
 * - il tetto di tempo può ridurre il numero di trial su macchine molto lente;
 *   in condizioni normali 1000 trial finiscono in 10-30ms, molto sotto i 200ms;
 * - il risultato è una stima del valore atteso, non una simulazione esatta del
 *   singolo combattimento reale.
 *
 * @param {Object} options
 * @param {number} options.totalHitsPerSecond
 * @param {number} options.baseCritChancePercent
 * @param {number} options.critChancePerStackPercent
 * @param {number} options.stackDurationSeconds
 * @param {number} options.maxStacks
 * @param {number} options.perfectChainLevel
 * @param {number} options.seed
 * @param {number} options.deadline - timestamp dopo il quale interrompere
 * @returns {{
 *   stacks: number,
 *   critChancePercent: number,
 *   perfectChainUptime: number,
 *   completed: boolean
 * }}
 */
function runDeadeyeTrial({
    totalHitsPerSecond,
    baseCritChancePercent,
    critChancePerStackPercent,
    stackDurationSeconds,
    maxStacks,
    perfectChainLevel,
    seed,
    deadline
}) {
    const rng = createRng(seed);
    const baseCrit = Number.isFinite(baseCritChancePercent)
        ? baseCritChancePercent / 100
        : 0;
    const critPerStack = Number.isFinite(critChancePerStackPercent)
        ? critChancePerStackPercent / 100
        : 0;
    const duration = Math.max(0, stackDurationSeconds);

    // Coda dei critici che hanno generato stack. Tutti gli stack hanno la
    // stessa durata, quindi scadono nello stesso ordine in cui sono nati:
    // basta un array con un indice `head` invece di una priority queue.
    /** @type {number[]} */
    const critTimes = [];
    let head = 0;
    let perfectChainUntil = Infinity;
    let nextCrit = exponential(
        totalHitsPerSecond * Math.min(1, Math.max(0, baseCrit)),
        rng
    );

    let time = 0;
    let sumStacks = 0;
    let sumCritChance = 0;
    let perfectChainTime = 0;
    let activeTime = 0;
    let events = 0;

    /**
     * Accumula lo stato su un intervallo, ma solo dopo il warm-up.
     * @param {number} start
     * @param {number} end
     * @param {number} count
     * @param {boolean} buffActive
     */
    const accumulate = (start, end, count, buffActive) => {
        const from = Math.max(start, DEADEYE_SIMULATION_WARMUP);
        const dt = end - from;
        if (dt <= 0) return;

        sumStacks += count * dt;
        sumCritChance += (baseCrit + critPerStack * count) * dt;
        if (buffActive) perfectChainTime += dt;
        activeTime += dt;
    };

    while (time < DEADEYE_SIMULATION_HORIZON) {
        const count = critTimes.length - head;
        const nextExpiry = count > 0 ? critTimes[head] + duration : Infinity;
        const eventTime = Math.min(nextCrit, nextExpiry, perfectChainUntil);

        if (!Number.isFinite(eventTime) || eventTime > DEADEYE_SIMULATION_HORIZON) {
            // Nessun altro evento: accumula fino alla fine dell'orizzonte.
            accumulate(
                time,
                DEADEYE_SIMULATION_HORIZON,
                count,
                Number.isFinite(perfectChainUntil) && perfectChainUntil > time
            );
            break;
        }

        // Lo stato è costante tra un evento e il successivo.
        accumulate(
            time,
            eventTime,
            count,
            Number.isFinite(perfectChainUntil) && perfectChainUntil > time
        );
        time = eventTime;

        if (eventTime === nextExpiry) {
            // Scade lo stack più vecchio.
            head++;
        } else if (eventTime === perfectChainUntil) {
            // Scade Perfect Chain.
            perfectChainUntil = Infinity;
        } else {
            // Nuovo critico.
            if (perfectChainLevel > 0) {
                critTimes.push(time);
                if (critTimes.length - head >= maxStacks) {
                    // Perfect Chain consuma tutti gli stack e rinfresca il buff.
                    critTimes.length = 0;
                    head = 0;
                    perfectChainUntil = time + PERFECT_CHAIN_DURATION;
                }
            } else if (critTimes.length - head < maxStacks) {
                // Senza Perfect Chain gli stack si fermano al cap: i critici
                // in eccesso vengono sprecati.
                critTimes.push(time);
            }
        }

        // Compatta la coda ogni tanto per non farla crescere inutilmente.
        if (head > 256 && head * 2 > critTimes.length) {
            critTimes.splice(0, head);
            head = 0;
        }

        const nextCount = critTimes.length - head;
        const critRate = totalHitsPerSecond * Math.min(
            1,
            Math.max(0, baseCrit + critPerStack * nextCount)
        );
        nextCrit = time + exponential(critRate, rng);

        events++;
        if ((events & 511) === 0 && now() > deadline) {
            return {
                stacks: activeTime > 0 ? sumStacks / activeTime : 0,
                critChancePercent: activeTime > 0
                    ? (sumCritChance / activeTime) * 100
                    : baseCritChancePercent,
                perfectChainUptime: activeTime > 0
                    ? Math.min(1, perfectChainTime / activeTime)
                    : 0,
                completed: false
            };
        }
    }

    return {
        stacks: activeTime > 0 ? sumStacks / activeTime : 0,
        critChancePercent: activeTime > 0
            ? (sumCritChance / activeTime) * 100
            : baseCritChancePercent,
        perfectChainUptime: activeTime > 0
            ? Math.min(1, perfectChainTime / activeTime)
            : 0,
        completed: true
    };
}

/**
 * Esegue più trial e ne fa la media. Il seed di ogni trial è deterministico,
 * quindi il risultato non cambia tra un ricalcolo e l'altro. Il tempo è
 * limitato da `DEADEYE_MAX_SIMULATION_MS`: se la macchina è troppo lenta,
 * usiamo i trial completati (o il primo trial parziale) invece di bloccare
 * l'interfaccia.
 *
 * @param {Object} options
 * @param {number} options.totalHitsPerSecond
 * @param {number} options.baseCritChancePercent
 * @param {number} options.critChancePerStackPercent
 * @param {number} options.stackDurationSeconds
 * @param {number} options.maxStacks
 * @param {number} options.perfectChainLevel
 * @returns {{
 *   averageStacks: number,
 *   averageCritChancePercent: number,
 *   perfectChainUptime: number,
 *   completedTrials: number
 * }}
 */
function simulateDeadeye({
    totalHitsPerSecond,
    baseCritChancePercent,
    critChancePerStackPercent,
    stackDurationSeconds,
    maxStacks,
    perfectChainLevel
}) {
    const start = now();
    const deadline = start + DEADEYE_MAX_SIMULATION_MS;

    let totalStacks = 0;
    let totalCritChance = 0;
    let totalPerfectChainTime = 0;
    let completedTrials = 0;
    /** @type {ReturnType<typeof runDeadeyeTrial>|null} */
    let partialTrial = null;

    for (let trial = 0; trial < DEADEYE_SIMULATION_TRIALS; trial++) {
        if (now() > deadline) break;

        const result = runDeadeyeTrial({
            totalHitsPerSecond,
            baseCritChancePercent,
            critChancePerStackPercent,
            stackDurationSeconds,
            maxStacks,
            perfectChainLevel,
            seed: (DEADEYE_RNG_SEED + trial * 2654435761) >>> 0,
            deadline
        });

        if (!result.completed) {
            // Se non abbiamo ancora completato nessun trial, usiamo il parziale
            // per non restituire zero. Altrimenti ignoriamo il parziale.
            if (completedTrials === 0) partialTrial = result;
            break;
        }

        totalStacks += result.stacks;
        totalCritChance += result.critChancePercent;
        totalPerfectChainTime += result.perfectChainUptime;
        completedTrials++;
    }

    if (completedTrials === 0 && partialTrial) {
        return {
            averageStacks: partialTrial.stacks,
            averageCritChancePercent: partialTrial.critChancePercent,
            perfectChainUptime: partialTrial.perfectChainUptime,
            completedTrials: 0
        };
    }

    if (completedTrials === 0) {
        return {
            averageStacks: 0,
            averageCritChancePercent: baseCritChancePercent,
            perfectChainUptime: 0,
            completedTrials: 0
        };
    }

    return {
        averageStacks: totalStacks / completedTrials,
        averageCritChancePercent: totalCritChance / completedTrials,
        perfectChainUptime: totalPerfectChainTime / completedTrials,
        completedTrials
    };
}

/**
 * Effetti medi di Deadeye.
 *
 * @param {DamageContext} context
 * @param {number} totalHitsPerSecond
 * @param {number} baseCritChancePercent - Crit Chance base + Hot Streak
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   totalHitsPerSecond: number,
 *   baseCritChancePercent: number,
 *   critChancePerStackPercent: number,
 *   stackDurationSeconds: number,
 *   maxStacks: number,
 *   perfectChainLevel: number,
 *   perfectChainCritDamagePercent: number,
 *   averageStacks: number,
 *   averageCritChancePercent: number,
 *   critChanceBonusPercent: number,
 *   perfectChainUptime: number,
 *   averagePerfectChainCritDamagePercent: number,
 *   reason: string|null
 * }}
 */
export function getDeadeyeEffects(
    context,
    totalHitsPerSecond,
    baseCritChancePercent
) {
    const critChancePerStackPercent = getArcherNodeValue(
        context,
        ARCHER_NODES.deadeyeStacks
    );
    const capacity = getArcherNodeValue(
        context,
        ARCHER_NODES.deadeyeCapacity
    );
    const stackDurationSeconds = getArcherNodeParameter(
        context,
        ARCHER_NODES.deadeyeStacks,
        'b'
    );
    const perfectChainLevel = getArcherNodeLevel(
        context,
        ARCHER_NODES.perfectChain
    );
    const perfectChainCritDamagePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.perfectChain
    );
    const maxStacks = DEADEYE_BASE_MAX_STACKS + capacity;
    const visible = critChancePerStackPercent > 0
        || capacity > 0
        || perfectChainLevel > 0;

    const empty = {
        visible,
        enabled: false,
        totalHitsPerSecond,
        baseCritChancePercent,
        critChancePerStackPercent,
        stackDurationSeconds,
        maxStacks,
        perfectChainLevel,
        perfectChainCritDamagePercent,
        averageStacks: 0,
        averageCritChancePercent: baseCritChancePercent,
        critChanceBonusPercent: 0,
        perfectChainUptime: 0,
        averagePerfectChainCritDamagePercent: 0,
        reason: null
    };

    if (!visible) return empty;

    if (context.settings?.firstHit) {
        return { ...empty, reason: 'First hit' };
    }

    if (critChancePerStackPercent <= 0) {
        return { ...empty, reason: 'Requires Deadeye Stacks' };
    }

    if (!Number.isFinite(totalHitsPerSecond)
        || totalHitsPerSecond <= 0
        || !Number.isFinite(stackDurationSeconds)
        || stackDurationSeconds <= 0) {
        return { ...empty, reason: 'No critical hits to build stacks' };
    }

    // La simulazione dipende solo da questi valori. La cachiamo per evitare
    // di ripeterla se lo step viene richiamato più volte nello stesso calcolo.
    const cache = context.cache ?? (context.cache = {});
    const cacheKey = [
        totalHitsPerSecond.toFixed(10),
        baseCritChancePercent.toFixed(10),
        critChancePerStackPercent.toFixed(10),
        stackDurationSeconds.toFixed(10),
        maxStacks.toFixed(10),
        perfectChainCritDamagePercent.toFixed(10),
        perfectChainLevel.toFixed(10)
    ].join('|');
    const cached = DEADEYE_EFFECTS_CACHE.get(cacheKey)
        ?? cache.deadeyeEffects?.[cacheKey];
    if (cached) {
        cache.deadeyeEffects = cache.deadeyeEffects ?? {};
        cache.deadeyeEffects[cacheKey] = cached;
        return { ...empty, ...cached, enabled: true, reason: null };
    }

    const simulation = simulateDeadeye({
        totalHitsPerSecond,
        baseCritChancePercent,
        critChancePerStackPercent,
        stackDurationSeconds,
        maxStacks,
        perfectChainLevel
    });

    const critChanceBonusPercent = simulation.averageStacks
        * critChancePerStackPercent;
    const averagePerfectChainCritDamagePercent = perfectChainLevel > 0
        ? perfectChainCritDamagePercent * simulation.perfectChainUptime
        : 0;

    const result = {
        ...empty,
        enabled: true,
        averageStacks: simulation.averageStacks,
        averageCritChancePercent: simulation.averageCritChancePercent,
        critChanceBonusPercent,
        perfectChainUptime: simulation.perfectChainUptime,
        averagePerfectChainCritDamagePercent,
        reason: null
    };

    cache.deadeyeEffects = cache.deadeyeEffects ?? {};
    cache.deadeyeEffects[cacheKey] = result;

    // Cache globale solo se la simulazione ha completato tutti i trial.
    // Un risultato parziale (tetto di 200ms raggiunto) resta solo nella cache
    // del contesto corrente, così non "inquina" ricalcoli successivi.
    if (simulation.completedTrials === DEADEYE_SIMULATION_TRIALS) {
        DEADEYE_EFFECTS_CACHE.set(cacheKey, result);
        if (DEADEYE_EFFECTS_CACHE.size > DEADEYE_EFFECTS_CACHE_MAX) {
            const oldestKey = DEADEYE_EFFECTS_CACHE.keys().next().value;
            if (oldestKey !== undefined) DEADEYE_EFFECTS_CACHE.delete(oldestKey);
        }
    }

    return result;
}
