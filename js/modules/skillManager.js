import { equippedStore } from '../store/equippedStore.js';
import { dataStore } from "../store/dataStore.js";
import { SVG_NAMESPACE } from '../store/constants.js';

/** @typedef {import('../store/constants.js').ClassKey} ClassKey */
/** @typedef {import('../store/constants.js').SkillNode} SkillNode */

export class SkillManager {
    constructor() {
        /** @type {HTMLElement|null} */
        this.layer = document.getElementById('nodes');
        /** @type {SVGSVGElement|null} */
        this.svg = /** @type {SVGSVGElement|null} */ (document.getElementById('wires'));
        /** @type {HTMLElement|null} */
        this.pointsEl = document.getElementById('points');
        /** @type {NodeListOf<HTMLElement>} */
        this.classBtns = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.class-btn'));

        // Creazione del tooltip per l'hover se non esiste già nel DOM
        /** @type {HTMLElement} */
        this.tooltip = document.getElementById('skill-tooltip') || this.createTooltip();

        this.bindEvents();
    }

    /**
     * Crea il tooltip flottante usato al passaggio del mouse sui nodi.
     * @returns {HTMLElement}
     */
    createTooltip() {
        const tip = document.createElement('div');
        tip.id = 'skill-tooltip';
        tip.className = 'skill-tooltip';
        tip.style.display = 'none';
        tip.style.position = 'absolute';
        tip.style.zIndex = '1000';
        tip.style.pointerEvents = 'none';
        document.body.appendChild(tip);
        return tip;
    }

    /** Collega gli eventi di selezione della classe. */
    bindEvents() {
        this.classBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                const selectedClass = /** @type {ClassKey} */ (target.dataset.class);

                this.classBtns.forEach(b => b.classList.remove('active'));
                target.classList.add('active');

                equippedStore.setCurrentClass(selectedClass);
            });
        });
    }

    /** @returns {Record<string, SkillNode>} */
    getActiveNodes() { return dataStore.data.skillTrees[equippedStore.state.currentClass].nodes; }

    /** @returns {Array<[string, string]>} */
    getActiveEdges() { return dataStore.data.skillTrees[equippedStore.state.currentClass].edges; }

    /** @returns {Map<string, number>} */
    getActiveLevels() { return equippedStore.state.treeLevels[equippedStore.state.currentClass]; }

    /**
     * Verifica se un nodo dell'albero abilità è sbloccabile
     * @param {string} id
     * @returns {boolean}
     */
    isAvailable(id) {
        if (this.getActiveNodes()[id].center) return true;
        const curLvl = this.getActiveLevels();
        return this.getActiveEdges().some(([a, b]) => (a === id ? (curLvl.get(b) || 0) > 0 : b === id ? (curLvl.get(a) || 0) > 0 : false));
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
     * nodo centrale passando solo per nodi attivi. Questi nodi sono orfani e
     * vanno rifondati integralmente.
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
     * @param {MouseEvent} event
     */
    handleNodeClick(id, event) {
        const node = this.getActiveNodes()[id];
        const className = equippedStore.state.currentClass;
        const currentLevels = this.getActiveLevels();
        const curLvl = currentLevels.get(id) || 0;

        if (event.shiftKey) {
            if (curLvl === 0) return;

            const newLevels = new Map(currentLevels);
            newLevels.set(id, curLvl - 1);

            // Rifondo il livello appena rimosso dal nodo cliccato.
            let refund = curLvl * node.costBase;

            // I discendenti non più raggiungibili dal centro vengono azzerati
            // e rifondati per l'intero investimento.
            this.findOrphanedNodes(newLevels).forEach(orphanId => {
                const orphanLevel = newLevels.get(orphanId) || 0;
                refund += this.getInvestedCost(orphanId, orphanLevel);
                newLevels.set(orphanId, 0);
            });

            equippedStore.applySkillLevels(
                className,
                newLevels,
                equippedStore.state.sharedPoints + refund
            );
            return;
        }

        if (!this.isAvailable(id) || curLvl >= node.max) return;
        const cost = (curLvl + 1) * node.costBase;
        if (equippedStore.state.sharedPoints < cost) return;

        const newLevels = new Map(currentLevels);
        newLevels.set(id, curLvl + 1);

        equippedStore.applySkillLevels(
            className,
            newLevels,
            equippedStore.state.sharedPoints - cost
        );
    }

    /** Disegna i collegamenti SVG dinamici tra i vari nodi abilità. */
    drawWires() {
        if (!this.svg || !this.layer) return;
        const svg = this.svg;
        svg.innerHTML = '';

        // Otteniamo le dimensioni reali in pixel del contenitore dei nodi
        const rect = this.layer.getBoundingClientRect();
        const width = rect.width || this.layer.clientWidth || 500;
        const height = rect.height || this.layer.clientHeight || 500;

        // Impostiamo viewBox ed dimensioni esplicite sul tag SVG per allinearlo perfettamente al layer dei nodi
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';

        const currentNodes = this.getActiveNodes();
        const currentLevels = this.getActiveLevels();

        this.getActiveEdges().forEach(([a, b]) => {
            const p = currentNodes[a], q = currentNodes[b];
            if (!p || !q) return;

            // Convertiamo le percentuali (x, y) nelle coordinate reali in pixel basate sulle dimensioni del container
            const x1 = (p.x / 100) * width;
            const y1 = (p.y / 100) * height;
            const x2 = (q.x / 100) * width;
            const y2 = (q.y / 100) * height;

            const line = document.createElementNS(SVG_NAMESPACE, 'path');

            const d = Math.abs(x1 - x2) > Math.abs(y1 - y2)
                ? `M${x1} ${y1} H${(x1 + x2) / 2} V${y2} H${x2}`
                : `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`;

            const isWireActive = (currentLevels.get(a) || 0) > 0 && (currentLevels.get(b) || 0) > 0;
            line.setAttribute('d', d);
            line.setAttribute('class', 'wire' + (isWireActive ? ' active' : ''));
            svg.appendChild(line);
        });
    }

    /** Renderizza nuovamente i pulsanti dei nodi, i punti SP e i collegamenti. */
    render() {
        if (!this.layer) return;
        const layer = this.layer;
        layer.innerHTML = '';

        const currentNodes = this.getActiveNodes();
        const currentLevels = this.getActiveLevels();

        Object.keys(currentNodes).forEach(id => {
            const n = currentNodes[id];
            const curLvl = currentLevels.get(id) || 0;
            const available = this.isAvailable(id);

            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'node' + (n.center ? ' center' : '') + (curLvl > 0 ? ' unlocked' : available ? ' available' : ' locked');
            b.style.left = n.x + '%';
            b.style.top = n.y + '%';
            b.disabled = (!available && curLvl === 0);
            b.innerHTML = curLvl > 0 ? `${curLvl}<span class="lvl-badge">${curLvl}/${n.max}</span>` : '';

            // Eventi Click
            b.addEventListener('click', (e) => this.handleNodeClick(id, e));

            // Eventi Hover per il Tooltip
            b.addEventListener('mouseenter', () => {
                if (!this.tooltip) return;

                let desc = n.description || "Nessuna descrizione disponibile.";

                // Se il nodo ha dei parametri di scaling definiti
                if (n.parameters) {
                    Object.entries(n.parameters).forEach(([key, param]) => {
                        // Calcolo del valore: base + (aumento * livello)
                        // Nota: se il livello è 0, mostriamo comunque il valore base o 0 a seconda di come preferisci
                        const effectiveLvl = curLvl > 0 ? curLvl : 1;
                        const calculatedVal = param.base + (param.increase * (effectiveLvl - 1));

                        // Sostituisce {key} nella stringa (es. {c}) con il valore calcolato
                        const formattedVal = Number(calculatedVal.toFixed(2));
                        desc = desc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(formattedVal));
                    });
                }

                const nextLevel = curLvl < n.max ? curLvl + 1 : curLvl;
                const nextCost = nextLevel * n.costBase;

                this.tooltip.innerHTML = `<strong>${n.name}</strong> (${curLvl}/${n.max})<br>${desc}<br><small>Costo prossimo livello: ${curLvl >= n.max ? "MAX" : nextCost + " SP"}</small>`;
                this.tooltip.style.display = 'block';
            });

            b.addEventListener('mousemove', (e) => {
                if (!this.tooltip) return;
                this.tooltip.style.left = (e.pageX + 15) + 'px';
                this.tooltip.style.top = (e.pageY + 15) + 'px';
            });

            b.addEventListener('mouseleave', () => {
                if (!this.tooltip) return;
                this.tooltip.style.display = 'none';
            });

            layer.appendChild(b);
        });

        if (this.pointsEl) this.pointsEl.textContent = String(equippedStore.state.sharedPoints);
        this.classBtns.forEach(btn => {
            const btnClass = /** @type {HTMLElement} */ (btn).dataset.class;
            btn.classList.toggle('active', btnClass === equippedStore.state.currentClass);
        });

        this.drawWires();
    }
}

export const skillManager = new SkillManager();