import { equippedStore } from '../store/equippedStore.js';
import { dataStore } from "../store/dataStore.js";

export class SkillManager {
    constructor() {
        this.layer = document.getElementById('nodes');
        this.svg = document.getElementById('wires');
        this.pointsEl = document.getElementById('points');
        this.classBtns = document.querySelectorAll('.class-btn');

        // Creazione del tooltip per l'hover se non esiste già nel DOM
        this.tooltip = document.getElementById('skill-tooltip') || this.createTooltip();

        this.bindEvents();
    }

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

    bindEvents() {
        this.classBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                const selectedClass = /** @type {'warrior'|'archer'|'mage'} */ (target.dataset.class);

                this.classBtns.forEach(b => b.classList.remove('active'));
                target.classList.add('active');

                equippedStore.state.currentClass = selectedClass;
                equippedStore.notify();
            });
        });
    }

    getActiveNodes() { return dataStore.data.skillTrees[equippedStore.state.currentClass].nodes; }
    getActiveEdges() { return dataStore.data.skillTrees[equippedStore.state.currentClass].edges; }
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
     * Gestisce l'incremento/decremento di livello di un nodo
     * @param {string} id
     * @param {MouseEvent} event
     */
    handleNodeClick(id, event) {
        const node = this.getActiveNodes()[id];
        const currentLevels = this.getActiveLevels();
        const curLvl = currentLevels.get(id) || 0;

        if (event.shiftKey) {
            if (curLvl === 0) return;
            equippedStore.state.sharedPoints += curLvl * node.costBase;
            currentLevels.set(id, curLvl - 1);
            equippedStore.notify();
            return;
        }

        if (!this.isAvailable(id) || curLvl >= node.max) return;
        const cost = (curLvl + 1) * node.costBase;
        if (equippedStore.state.sharedPoints < cost) return;

        equippedStore.state.sharedPoints -= cost;
        currentLevels.set(id, curLvl + 1);
        equippedStore.notify();
    }

    /** Disegna i collegamenti SVG dinamici tra i vari nodi abilità */
    /** Disegna i collegamenti SVG dinamici tra i vari nodi abilità */
    drawWires() {
        if (!this.svg || !this.layer) return;
        this.svg.innerHTML = '';

        // Otteniamo le dimensioni reali in pixel del contenitore dei nodi
        const rect = this.layer.getBoundingClientRect();
        const width = rect.width || this.layer.clientWidth || 500;
        const height = rect.height || this.layer.clientHeight || 500;

        // Impostiamo viewBox ed dimensioni esplicite sul tag SVG per allinearlo perfettamente al layer dei nodi
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.pointerEvents = 'none';

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

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            const d = Math.abs(x1 - x2) > Math.abs(y1 - y2)
                ? `M${x1} ${y1} H${(x1 + x2) / 2} V${y2} H${x2}`
                : `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`;

            const isWireActive = (currentLevels.get(a) || 0) > 0 && (currentLevels.get(b) || 0) > 0;
            line.setAttribute('d', d);
            line.setAttribute('class', 'wire' + (isWireActive ? ' active' : ''));
            this.svg.appendChild(line);
        });
    }

    /** Renderizza nuovamente i pulsanti dei nodi e i punti SP */
    render() {
        if (!this.layer) return;
        this.layer.innerHTML = '';

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
            b.addEventListener('mouseenter', (e) => {
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
                        desc = desc.replace(new RegExp(`\\{${key}\\}`, 'g'), calculatedVal.toFixed(1));
                    });
                }

                this.tooltip.innerHTML = `<strong>${n.name}</strong> (${curLvl}/${n.max})<br>${desc}<br><small>Costo prossimo livello: ${n.costBase} SP</small>`;
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

            this.layer.appendChild(b);
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