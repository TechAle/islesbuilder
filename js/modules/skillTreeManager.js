/** @typedef {import('../data/types.js').ClassKey} ClassKey */
/** @typedef {import('../data/types.js').NodeInfo} NodeInfo */
/** @typedef {import('../data/types.js').SkillNode} SkillNode */
/** @typedef {import('../data/types.js').SkillTreeView} SkillTreeView */

/**
 * Logica dell'albero skill: disponibilità, costi, acquisto/refund e refund
 * a cascata dei discendenti orfani. Non tocca il DOM.
 */
export class SkillTreeManager {
    /**
     * @param {Object} options
     * @param {import('../store/dataStore.js').DataStore} options.dataStore
     * @param {import('../store/equippedStore.js').BuildStore} options.equippedStore
     */
    constructor({ dataStore, equippedStore }) {
        this.dataStore = dataStore;
        this.equippedStore = equippedStore;
    }

    /** @returns {Record<string, SkillNode>} */
    getActiveNodes() {
        return this.dataStore.data.skillTrees[this.equippedStore.state.currentClass].nodes;
    }

    /** @returns {Array<[string, string]>} */
    getActiveEdges() {
        return this.dataStore.data.skillTrees[this.equippedStore.state.currentClass].edges;
    }

    /** @returns {Map<string, number>} */
    getActiveLevels() {
        return this.equippedStore.state.treeLevels[this.equippedStore.state.currentClass];
    }

    /**
     * Verifica se un nodo dell'albero skill è sbloccabile.
     * @param {string} id
     * @returns {boolean}
     */
    isAvailable(id) {
        if (this.getActiveNodes()[id].center) return true;

        const levels = this.getActiveLevels();
        return this.getActiveEdges().some(([parent, child]) => {
            if (parent === id) return (levels.get(child) || 0) > 0;
            if (child === id) return (levels.get(parent) || 0) > 0;
            return false;
        });
    }

    /**
     * Calcola il costo totale investito in un nodo a un dato livello.
     * Il costo del livello L è `costBase * L`, quindi il totale è
     * `costBase * L * (L + 1) / 2`.
     * @param {string} nodeId
     * @param {number} level
     * @returns {number}
     */
    getInvestedCost(nodeId, level) {
        const node = this.getActiveNodes()[nodeId];
        if (!node || level <= 0) return 0;
        return node.costBase * level * (level + 1) / 2;
    }

    /**
     * Trova i nodi con livello maggiore di zero non più raggiungibili dal
     * nodo centrale passando solo per nodi attivi.
     * @param {Map<string, number>} levels
     * @returns {string[]}
     */
    findOrphanedNodes(levels) {
        const nodes = this.getActiveNodes();
        const centerId = Object.keys(nodes).find(id => nodes[id].center);
        /** @type {Set<string>} */
        const reachable = new Set();

        if (centerId && (levels.get(centerId) || 0) > 0) {
            /** @type {Map<string, string[]>} */
            const childrenByParent = new Map();
            this.getActiveEdges().forEach(([parent, child]) => {
                const children = childrenByParent.get(parent) || [];
                children.push(child);
                childrenByParent.set(parent, children);
            });

            /** @type {string[]} */
            const queue = [centerId];
            reachable.add(centerId);

            while (queue.length > 0) {
                const current = /** @type {string} */ (queue.shift());
                (childrenByParent.get(current) || []).forEach(child => {
                    if (reachable.has(child) || (levels.get(child) || 0) <= 0) return;
                    reachable.add(child);
                    queue.push(child);
                });
            }
        }

        return Object.keys(nodes).filter(id => (levels.get(id) || 0) > 0 && !reachable.has(id));
    }

    /**
     * Gestisce l'incremento/decremento di livello di un nodo.
     * Con Shift il livello viene decrementato e, se il nodo si azzera, i
     * discendenti rimasti orfani vengono rifondati a cascata.
     * @param {string} id
     * @param {{shiftKey: boolean}} event
     */
    handleNodeClick(id, event) {
        const node = this.getActiveNodes()[id];
        const className = this.equippedStore.state.currentClass;
        const currentLevels = this.getActiveLevels();
        const currentLevel = currentLevels.get(id) || 0;

        if (event.shiftKey) {
            if (currentLevel === 0) return;

            const newLevels = new Map(currentLevels);
            newLevels.set(id, currentLevel - 1);

            // Rifondo il livello appena rimosso dal nodo cliccato.
            let refund = currentLevel * node.costBase;

            // I discendenti non più raggiungibili dal centro vengono azzerati
            // e rifondati per l'intero investimento.
            this.findOrphanedNodes(newLevels).forEach(orphanId => {
                const orphanLevel = newLevels.get(orphanId) || 0;
                refund += this.getInvestedCost(orphanId, orphanLevel);
                newLevels.set(orphanId, 0);
            });

            this.equippedStore.applySkillLevels(
                className,
                newLevels,
                this.equippedStore.state.sharedPoints + refund
            );
            return;
        }

        if (!this.isAvailable(id) || currentLevel >= node.max) return;

        const cost = (currentLevel + 1) * node.costBase;
        if (this.equippedStore.state.sharedPoints < cost) return;

        const newLevels = new Map(currentLevels);
        newLevels.set(id, currentLevel + 1);

        this.equippedStore.applySkillLevels(
            className,
            newLevels,
            this.equippedStore.state.sharedPoints - cost
        );
    }

    /**
     * Prepara i dati per il render dell'albero corrente.
     * @returns {SkillTreeView}
     */
    getViewState() {
        const nodes = this.getActiveNodes();
        const levels = this.getActiveLevels();

        return {
            nodes: Object.keys(nodes).map(id => ({
                id,
                node: nodes[id],
                level: levels.get(id) || 0,
                available: this.isAvailable(id)
            })),
            edges: this.getActiveEdges().map(([parent, child]) => ({
                parent,
                child,
                active: (levels.get(parent) || 0) > 0 && (levels.get(child) || 0) > 0
            })),
            currentClass: this.equippedStore.state.currentClass,
            sharedPoints: this.equippedStore.state.sharedPoints
        };
    }

    /**
     * Calcola descrizione e costo del prossimo livello per il tooltip.
     * @param {string} id
     * @returns {NodeInfo}
     */
    getNodeInfo(id) {
        const node = this.getActiveNodes()[id];
        const level = this.getActiveLevels().get(id) || 0;
        let description = node.description || "Nessuna descrizione disponibile.";

        if (node.parameters) {
            Object.entries(node.parameters).forEach(([key, param]) => {
                const effectiveLevel = level > 0 ? level : 1;
                const calculatedVal = param.base + (param.increase * (effectiveLevel - 1));
                const formattedVal = Number(calculatedVal.toFixed(2));
                description = description.replace(new RegExp(`\\{${key}\\}`, 'g'), String(formattedVal));
            });
        }

        const nextLevel = level < node.max ? level + 1 : level;
        const nextCost = nextLevel * node.costBase;

        return {
            name: node.name,
            level,
            max: node.max,
            description,
            nextCost,
            isMax: level >= node.max
        };
    }
}
