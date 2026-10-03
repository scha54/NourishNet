/**
 * Property-based tests for the NourishNet impact constants.
 *
 * Validates: Requirements 23.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  MEALS_PER_KG,
  CARBON_PER_KG_FOOD_WASTE,
} from '../../backend/src/domain/impact-constants';

/**
 * Arbitrary: valid food weight in kg (non-negative, bounded).
 */
const weightKgArbitrary = fc.float({ min: 0, max: 10_000, noNaN: true, noDefaultInfinity: true });

describe('Impact constants — non-negativity and determinism properties', () => {
  /**
   * Property 2: Non-negativity
   *
   * For all valid weight values (0 to 10,000 kg), multiplying by either
   * impact constant must never produce a negative result.
   */
  it('meals derived from any non-negative weight are always non-negative', () => {
    fc.assert(
      fc.property(weightKgArbitrary, (weightKg) => {
        const meals = weightKg * MEALS_PER_KG;
        expect(meals).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('carbon saved derived from any non-negative weight is always non-negative', () => {
    fc.assert(
      fc.property(weightKgArbitrary, (weightKg) => {
        const carbonSaved = weightKg * CARBON_PER_KG_FOOD_WASTE;
        expect(carbonSaved).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  /**
   * Property 4: Determinism
   *
   * Constants are referentially transparent: for the same weightKg, the
   * computation always yields an identical result regardless of how many
   * times it is evaluated.
   */
  it('MEALS_PER_KG multiplication is deterministic — same input always yields same output', () => {
    fc.assert(
      fc.property(weightKgArbitrary, (weightKg) => {
        const first = weightKg * MEALS_PER_KG;
        const second = weightKg * MEALS_PER_KG;
        expect(first).toBe(second);
      }),
    );
  });

  it('CARBON_PER_KG_FOOD_WASTE multiplication is deterministic — same input always yields same output', () => {
    fc.assert(
      fc.property(weightKgArbitrary, (weightKg) => {
        const first = weightKg * CARBON_PER_KG_FOOD_WASTE;
        const second = weightKg * CARBON_PER_KG_FOOD_WASTE;
        expect(first).toBe(second);
      }),
    );
  });
});
