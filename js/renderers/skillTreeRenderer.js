import { SVG_NAMESPACE } from '../data/constants.js';

/** @typedef {import('../data/types.js').ClassKey} ClassKey */
/** @typedef {import('../data/types.js').NodeInfo} NodeInfo */
/** @typedef {import('../data/types.js').SkillNode} SkillNode */
/** @typedef {import('../data/types.js').SkillTreeView} SkillTreeView */

/**
 * @typedef {Object} SkillTreeRendererOptions
 * @property {HTMLElement|null} root
 * @property {SVGSVGElement|null} svg
 * @property {HTMLElement|null} pointsEl
 * @property {NodeListOf<HTMLElement>} classButtons
 * @property {(id: string, event: MouseEvent) => void} onNodeClick
 * @property {(className: ClassKey) => void} onClassChange
 * @property {(id: string) => NodeInfo} getNodeInfo
 */

/**
 * Renderer dell'albero skill: nodi, collegamenti SVG, tooltip e punti SP.
 */
export class SkillTreeRenderer {
    /** @param {SkillTreeRendererOptions} options */
    constructor({ root, svg, pointsEl, classButtons, onNodeClick, onClassChange, getNodeInfo }) {
        this.root = root;
        this.svg = svg;
        this.pointsEl = pointsEl;
        this.classButtons = classButtons;
        this.onNodeClick = onNodeClick;
        this.onClassChange = onClassChange;
        this.getNodeInfo = getNodeInfo;
        this.tooltip = this.createTooltip();
    }

    /**
     * Crea il tooltip flottante usato al passaggio del mouse sui nodi.
     * @returns {HTMLElement}
     */
    createTooltip() {
        const existing = document.getElementById('skill-tooltip');
        if (existing) return existing;

        const tooltip = document.createElement('div');
        tooltip.id = 'skill-tooltip';
        tooltip.className = 'skill-tooltip';
        tooltip.style.display = 'none';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    /** Collega gli eventi di selezione della classe. */
    mount() {
        this.classButtons.forEach(button => {
            button.addEventListener('click', event => {
                const target = /** @type {HTMLElement} */ (event.currentTarget);
                const className = /** @type {ClassKey|undefined} */ (target.dataset.class);
                if (!className) return;

                this.classButtons.forEach(btn => btn.classList.remove('active'));
                target.classList.add('active');
                this.onClassChange(className);
            });
        });
    }

    /** @param {SkillTreeView} view */
    render(view) {
        if (!this.root) return;
        const root = this.root;
        root.innerHTML = '';

        view.nodes.forEach(({ id, node, level, available }) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'node'
                + (node.center ? ' center' : '')
                + (level > 0 ? ' unlocked' : available ? ' available' : ' locked');
            button.style.left = `${node.x}%`;
            button.style.top = `${node.y}%`;
            button.disabled = !available && level === 0;
            button.innerHTML = level > 0
                ? `${level}<span class="lvl-badge">${level}/${node.max}</span>`
                : '';

            button.addEventListener('click', event => this.onNodeClick(id, event));

            button.addEventListener('mouseenter', () => {
                const info = this.getNodeInfo(id);
                const costLabel = info.isMax ? 'MAX' : `${info.nextCost} SP`;
                this.tooltip.innerHTML = `<strong>${info.name}</strong> (${info.level}/${info.max})<br>${info.description}<br><small>Next level cost: ${costLabel}</small>`;
                this.tooltip.style.display = 'block';
            });

            button.addEventListener('mousemove', event => {
                this.tooltip.style.left = `${event.pageX + 15}px`;
                this.tooltip.style.top = `${event.pageY + 15}px`;
            });

            button.addEventListener('mouseleave', () => {
                this.tooltip.style.display = 'none';
            });

            root.appendChild(button);
        });

        if (this.pointsEl) {
            if (this.pointsEl instanceof HTMLInputElement) {
                this.pointsEl.value = String(view.sharedPoints);
            } else {
                this.pointsEl.textContent = String(view.sharedPoints);
            }
        }

        this.classButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.class === view.currentClass);
        });

        this.drawWires(view);
    }

    /** @param {SkillTreeView} view */
    drawWires(view) {
        if (!this.svg || !this.root) return;
        const svg = this.svg;
        const root = this.root;
        svg.innerHTML = '';

        // Dimensioni reali in pixel del contenitore dei nodi
        const rect = root.getBoundingClientRect();
        const width = rect.width || root.clientWidth || 500;
        const height = rect.height || root.clientHeight || 500;

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.pointerEvents = 'none';

        /** @type {Map<string, SkillNode>} */
        const nodesById = new Map();
        view.nodes.forEach(({ id, node }) => nodesById.set(id, node));

        view.edges.forEach(({ parent, child, active }) => {
            const parentNode = nodesById.get(parent);
            const childNode = nodesById.get(child);
            if (!parentNode || !childNode) return;

            const x1 = (parentNode.x / 100) * width;
            const y1 = (parentNode.y / 100) * height;
            const x2 = (childNode.x / 100) * width;
            const y2 = (childNode.y / 100) * height;

            const line = document.createElementNS(SVG_NAMESPACE, 'path');
            const path = Math.abs(x1 - x2) > Math.abs(y1 - y2)
                ? `M${x1} ${y1} H${(x1 + x2) / 2} V${y2} H${x2}`
                : `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`;

            line.setAttribute('d', path);
            line.setAttribute('class', 'wire' + (active ? ' active' : ''));
            svg.appendChild(line);
        });
    }
}
