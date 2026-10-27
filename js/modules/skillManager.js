import { equippedStore } from '../store/equippedStore.js';
import {dataStore} from "../store/dataStore.js";

export class SkillManager {
    constructor() {
        this.layer = document.getElementById('nodes');
        this.svg = document.getElementById('wires');
        this.pointsEl = document.getElementById('points');
        this.classBtns = document.querySelectorAll('.class-btn');
        this.bindEvents();
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
    drawWires() {
        if (!this.svg) return;
        this.svg.innerHTML = '';
        const currentNodes = this.getActiveNodes();
        const currentLevels = this.getActiveLevels();

        this.getActiveEdges().forEach(([a, b]) => {
            const p = currentNodes[a], q = currentNodes[b];
            if (!p || !q) return;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const x1 = p.x * 10, y1 = p.y * 6.2, x2 = q.x * 10, y2 = q.y * 6.2;

            const d = Math.abs(p.x - q.x) > Math.abs(p.y - q.y)
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
            b.addEventListener('click', (e) => this.handleNodeClick(id, e));

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