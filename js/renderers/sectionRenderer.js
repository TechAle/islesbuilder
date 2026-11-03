/**
 * @typedef {Object} SectionRendererOptions
 * @property {HTMLElement|Document} root
 */

/**
 * Gestisce la compressione/espansione delle sezioni.
 * Ogni elemento con `data-collapse="<id>"` apre/chiude il contenitore con quell'id.
 *
 * Usa un listener delegato sul root, così funziona anche per le sezioni
 * create dinamicamente dopo il mount (es. gli step di danno).
 */
export class SectionRenderer {
    /** @param {SectionRendererOptions} options */
    constructor({ root }) {
        this.root = root;
    }

    /** Collega gli eventi di tutte le sezioni comprimibili. */
    mount() {
        // Stato iniziale delle sezioni già presenti nell'HTML.
        this.root.querySelectorAll('[data-collapse]').forEach(toggle => {
            if (!(toggle instanceof HTMLElement)) return;

            const content = this.getContent(toggle);
            if (!content) return;

            this.setExpanded(toggle, content, !content.classList.contains('is-collapsed'));
        });

        this.root.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const toggle = target.closest('[data-collapse]');
            if (!(toggle instanceof HTMLElement)) return;

            const content = this.getContent(toggle);
            if (!content) return;

            this.setExpanded(toggle, content, toggle.getAttribute('aria-expanded') !== 'true');
        });
    }

    /**
     * @param {HTMLElement} toggle
     * @returns {HTMLElement|null}
     */
    getContent(toggle) {
        const targetId = toggle.dataset.collapse;
        if (!targetId) return null;

        const content = document.getElementById(targetId);
        return content instanceof HTMLElement ? content : null;
    }

    /**
     * @param {HTMLElement} toggle
     * @param {HTMLElement} content
     * @param {boolean} expanded
     */
    setExpanded(toggle, content, expanded) {
        toggle.setAttribute('aria-expanded', String(expanded));
        content.classList.toggle('is-collapsed', !expanded);
    }
}
