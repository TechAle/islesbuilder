import { describe, expect, it } from 'vitest';
import { CLASS_SKILL_TREES } from '../../../js/data/skillTrees.js';
import { applyItemOverride } from '../../../js/modules/itemOverrides.js';

describe('skill tree data', () => {
    for (const [classKey, tree] of Object.entries(CLASS_SKILL_TREES)) {
        it(`${classKey}: every node is reachable from the center`, () => {
            const nodes = tree.nodes;
            const center = Object.keys(nodes).find(id => nodes[id].center);
            expect(center).toBeTruthy();

            const childrenByParent = new Map();
            for (const [parent, child] of tree.edges) {
                const children = childrenByParent.get(parent) ?? [];
                children.push(child);
                childrenByParent.set(parent, children);
            }

            const seen = new Set([center]);
            const queue = [center];

            while (queue.length > 0) {
                const current = queue.shift();
                for (const child of childrenByParent.get(current) ?? []) {
                    if (seen.has(child)) continue;
                    seen.add(child);
                    queue.push(child);
                }
            }

            expect([...seen].sort()).toEqual(Object.keys(nodes).sort());
        });

        it(`${classKey}: every node has valid metadata`, () => {
            for (const [id, node] of Object.entries(tree.nodes)) {
                expect(id, id).toBeTruthy();
                expect(node.name, id).toBeTruthy();
                expect(node.max, id).toBeGreaterThan(0);
                expect(node.costBase, id).toBeGreaterThan(0);
                expect(Number.isFinite(node.x), id).toBe(true);
                expect(Number.isFinite(node.y), id).toBe(true);
            }
        });

        it(`${classKey}: every edge references existing nodes`, () => {
            for (const [parent, child] of tree.edges) {
                expect(tree.nodes[parent], `${parent} -> ${child}`).toBeTruthy();
                expect(tree.nodes[child], `${parent} -> ${child}`).toBeTruthy();
            }
        });
    }
});

describe('item overrides', () => {
    it('overrides only the configured keys on dummy data', () => {
        const stats = {
            'Default Attack': 100,
            'Arcane Damage': 10,
            element: 'nature'
        };
        const overrides = {
            'Dummy Weapon': {
                'Arcane Damage': 99,
                element: 'void'
            }
        };

        expect(applyItemOverride('Dummy Weapon', stats, overrides)).toEqual({
            'Default Attack': 100,
            'Arcane Damage': 99,
            element: 'void'
        });
    });

    it('leaves dummy data untouched when no override exists', () => {
        const stats = { 'Default Attack': 100 };
        expect(applyItemOverride('Unknown Weapon', stats, {})).toBe(stats);
    });

    it('matches override names case-insensitively', () => {
        const stats = { element: 'nature' };
        expect(applyItemOverride('dummy weapon', stats, {
            'Dummy Weapon': { element: 'thunder' }
        })).toEqual({ element: 'thunder' });
    });
});
