/**
 * Renderer del tooltip globale.
 *
 * Il tooltip viene montato direttamente su `body` e posizionato in coordinate
 * viewport: così non viene tagliato dai contenitori con `overflow-y: auto`.
 */
export class TooltipRenderer {
    /**
     * @param {Object} options
     * @param {Document|HTMLElement} options.root
     * @param {HTMLElement|null} options.tooltip
     */
    constructor({ root, tooltip }) {
        this.root = root;
        this.tooltip = tooltip;
        /** @type {HTMLElement|null} */
        this.currentTarget = null;
    }

    /** Collega gli eventi. */
    mount() {
        if (!this.tooltip) return;

        this.root.addEventListener('pointerover', event => {
            const target = this.findTarget(event.target);
            if (!target) return;
            this.show(target);
        });

        this.root.addEventListener('pointerout', event => {
            const target = this.findTarget(event.target);
            if (!target) return;

            const related = /** @type {PointerEvent} */ (event).relatedTarget;
            if (related instanceof Node && target.contains(related)) return;
            this.hide();
        });

        this.root.addEventListener('focusin', event => {
            const target = this.findTarget(event.target);
            if (target) this.show(target);
        });

        this.root.addEventListener('focusout', () => this.hide());

        window.addEventListener('scroll', () => this.hide(), true);
        window.addEventListener('resize', () => this.hide());
    }

    /**
     * @param {EventTarget|null} node
     * @returns {HTMLElement|null}
     */
    findTarget(node) {
        if (!(node instanceof Element)) return null;
        const target = node.closest('[data-tooltip]');
        if (!(target instanceof HTMLElement)) return null;

        return target.dataset.tooltip ? target : null;
    }

    /**
     * @param {HTMLElement} target
     */
    show(target) {
        const tooltip = this.tooltip;
        if (!tooltip) return;

        const text = target.dataset.tooltip;
        if (!text) return;

        this.currentTarget = target;
        tooltip.textContent = text;
        tooltip.hidden = false;

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const margin = 8;

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        left = Math.max(margin, Math.min(window.innerWidth - tooltipRect.width - margin, left));

        let top = rect.top - tooltipRect.height - margin;
        if (top < margin) {
            top = rect.bottom + margin;
        }
        top = Math.max(margin, Math.min(window.innerHeight - tooltipRect.height - margin, top));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /** Nasconde il tooltip. */
    hide() {
        if (!this.tooltip) return;

        this.tooltip.hidden = true;
        this.tooltip.textContent = '';
        this.currentTarget = null;
    }
}
