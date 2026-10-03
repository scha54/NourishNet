/**
 * Centralised social impact constants for the NourishNet platform.
 *
 * All derived impact metrics MUST use these constants — never hardcode the
 * values inline. Update `docs/impact-model.md` whenever a constant changes.
 *
 * Sources:
 *   WRAP UK — "Quantification of food surplus, waste and related measures
 *   across the food supply chain" (2019).
 *   https://wrap.org.uk/resources/report/quantification-food-surplus-waste
 *
 *   IPCC AR6 — "Climate Change 2022: Mitigation of Climate Change",
 *   Chapter 12 (Agriculture, Forestry and Other Land Use).
 */

/**
 * Estimated number of meals that can be prepared from 1 kg of redistributed food.
 *
 * Formula: meals = weightKg × MEALS_PER_KG
 *
 * Source: WRAP UK food waste guidance (2.5 meals per kilogram).
 */
export const MEALS_PER_KG = 2.5 as const;

/**
 * Estimated CO₂-equivalent emissions (in kg) avoided per kilogram of food
 * redistributed instead of sent to landfill.
 *
 * Formula: carbonSavedKgCo2e = weightKg × CARBON_PER_KG_FOOD_WASTE
 *
 * Source: WRAP UK / IPCC estimates (2.5 kg CO₂e per kilogram of food waste).
 */
export const CARBON_PER_KG_FOOD_WASTE = 2.5 as const;
