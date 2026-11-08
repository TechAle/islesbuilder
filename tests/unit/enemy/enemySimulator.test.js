import { describe, expect, it } from 'vitest';
import { applyDefenseDamage, simulateEnemy } from '../../../js/modules/enemySimulator.js';

describe('enemy defense', () => {
    it('returns raw damage with zero defense', () => {
        expect(applyDefenseDamage(100, 0)).toBe(100);
    });

    it('returns zero for zero or negative damage', () => {
        expect(applyDefenseDamage(0, 100)).toBe(0);
        expect(applyDefenseDamage(-10, 100)).toBe(0);
    });

    it('reduces damage against defense', () => {
        const real = applyDefenseDamage(100, 100);
        expect(real).toBeGreaterThan(0);
        expect(real).toBeLessThan(100);
    });

    it('does not go negative with huge defense', () => {
        const real = applyDefenseDamage(100, 1_000_000);
        expect(real).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(real)).toBe(true);
    });
});

describe('simulateEnemy', () => {
    it('detects an exact oneshot', () => {
        const result = simulateEnemy({
            health: 100,
            defense: 0,
            firstHitDamage: 100,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100
        });

        expect(result.oneshot).toBe(true);
        expect(result.timeToKill).toBe(0);
        expect(result.realFirstHitDamage).toBe(100);
    });

    it('does not oneshot below the health threshold', () => {
        const result = simulateEnemy({
            health: 100,
            defense: 0,
            firstHitDamage: 99.99,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100
        });

        expect(result.oneshot).toBe(false);
        expect(result.timeToKill).toBeGreaterThan(0);
    });

    it('adds 0.6s only when First Strike is active', () => {
        const base = {
            health: 1000,
            defense: 0,
            firstHitDamage: 0,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100
        };

        expect(simulateEnemy(base).timeToKill).toBeCloseTo(10, 10);
        expect(simulateEnemy({ ...base, firstStrikePercent: 20 }).timeToKill).toBeCloseTo(10.6, 10);
        expect(simulateEnemy({ ...base, firstStrikePercent: 0 }).timeToKill).toBeCloseTo(10, 10);
    });

    it('applies Damage% before defense', () => {
        const base = simulateEnemy({
            health: 1000,
            defense: 0,
            firstHitDamage: 100,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100
        });
        const boosted = simulateEnemy({
            health: 1000,
            defense: 0,
            firstHitDamage: 100,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100,
            damagePercent: 50
        });

        expect(boosted.firstHitDamage).toBeCloseTo(150, 10);
        expect(boosted.dps).toBeCloseTo(150, 10);
        expect(boosted.timeToKill).toBeLessThan(base.timeToKill);
    });

    it('handles negative Damage%', () => {
        const result = simulateEnemy({
            health: 1000,
            defense: 0,
            firstHitDamage: 100,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100,
            damagePercent: -50
        });

        expect(result.firstHitDamage).toBeCloseTo(50, 10);
        expect(result.dps).toBeCloseTo(50, 10);
    });

    it('counts potions needed when energy is negative', () => {
        const result = simulateEnemy({
            health: 2000,
            defense: 0,
            firstHitDamage: 0,
            dps: 100,
            energyPerSecond: -10,
            maxEnergy: 100
        });

        expect(result.potionsNeeded).toBe(4);
        expect(result.potionCooldownEnough).toBe(true);
        expect(result.potionsNeeded).toBeLessThanOrEqual(
            Math.floor(result.timeToKill / 1.5) + 1
        );
    });

    it('returns infinite potions for an infinite fight with deficit', () => {
        const result = simulateEnemy({
            health: 1000,
            defense: 0,
            firstHitDamage: 0,
            dps: 0,
            energyPerSecond: -10,
            maxEnergy: 100
        });

        expect(result.timeToKill).toBe(Infinity);
        expect(result.potionsNeeded).toBe(Infinity);
    });

    it('computes ability casts from time to kill', () => {
        const result = simulateEnemy({
            health: 1000,
            defense: 0,
            firstHitDamage: 0,
            dps: 100,
            energyPerSecond: 0,
            maxEnergy: 100,
            abilities: [
                {
                    name: 'Test Ability',
                    ability: 'Test Ability',
                    enabled: true,
                    castsPerSecond: 0.5,
                    damagePercent: 100,
                    damageTakenIncreasePercent: 0,
                    extraHitsPerSecond: 0
                }
            ]
        });

        expect(result.timeToKill).toBeCloseTo(10, 10);
        expect(result.abilities).toEqual([{ name: 'Test Ability', casts: 5 }]);
    });
});
