-- Seed service_configs for Exterior Experts
-- Run: mysql -u crm_user -pcrm_password exterior_experts_crm < scripts/seed-services.sql
-- Safe to re-run: uses INSERT ... ON DUPLICATE KEY UPDATE

-- ─── Global Settings ──────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'global_settings',
  'Global Settings',
  'global',
  JSON_OBJECT(
    'jobMinimum', 250,
    'taxRate', 0,
    'travelRadius', 45,
    'baseAddress', '123 Main St, Your City, ST 00000',
    'baseLat', 0,
    'baseLng', 0,
    'bundleDiscounts', JSON_OBJECT('2', 0, '3', 5, '4', 7.5, '5', 10),
    'travelFeePerMile', 3,
    'freeRadius', 5
  ),
  JSON_OBJECT(),
  0,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── House Washing ────────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'house_washing',
  'House Washing',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.17,
    'minPrice', 125,
    'minDuration', 60,
    'targetRevenuePerHour', 250,
    'storyMultipliers', JSON_OBJECT('1', 1.0, '2', 1.2, '3', 1.55),
    'sliderMin', 500,
    'sliderMax', 6000,
    'sliderStep', 100,
    'sliderDefault', 2000,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  1,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Window Cleaning ─────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'window_cleaning',
  'Window Cleaning',
  'per_unit',
  JSON_OBJECT(
    'exteriorPerWindow', 4.25,
    'minPrice', 125,
    'minDuration', 60,
    'targetRevenuePerHour', 250,
    'windowPackageMultipliers', JSON_OBJECT('good', 1.0, 'better', 1.5, 'best', 2.5),
    'sliderMin', 5,
    'sliderMax', 100,
    'sliderStep', 1,
    'sliderDefault', 20,
    'sliderUnit', 'windows'
  ),
  JSON_OBJECT(),
  2,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Driveway / Concrete ──────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'driveway_cleaning',
  'Driveway / Concrete',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.10,
    'minPrice', 100,
    'minDuration', 30,
    'targetRevenuePerHour', 250,
    'sliderMin', 200,
    'sliderMax', 3000,
    'sliderStep', 50,
    'sliderDefault', 1000,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  3,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Roof Cleaning ────────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'roof_cleaning',
  'Roof Cleaning',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.30,
    'minPrice', 475,
    'minDuration', 90,
    'targetRevenuePerHour', 250,
    'pitchMultipliers', JSON_OBJECT('low', 1.0, 'medium', 1.4, 'steep', 1.8),
    'sliderMin', 500,
    'sliderMax', 5000,
    'sliderStep', 100,
    'sliderDefault', 1500,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  4,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Gutter Cleaning ──────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'gutter_cleaning',
  'Gutter Cleaning',
  'per_linear_ft',
  JSON_OBJECT(
    'ratePerLinearFt', 0.70,
    'minPrice', 100,
    'minDuration', 60,
    'targetRevenuePerHour', 250,
    'storyMultipliers', JSON_OBJECT('1', 1.0, '2', 1.4, '3', 1.8),
    'sliderMin', 50,
    'sliderMax', 500,
    'sliderStep', 10,
    'sliderDefault', 150,
    'sliderUnit', 'linear ft'
  ),
  JSON_OBJECT(),
  5,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Patio Cleaning ───────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'patio_cleaning',
  'Patio Cleaning',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.10,
    'minPrice', 50,
    'minDuration', 30,
    'targetRevenuePerHour', 250,
    'sliderMin', 100,
    'sliderMax', 2000,
    'sliderStep', 50,
    'sliderDefault', 400,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  6,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Walkway Cleaning ─────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'walkway_cleaning',
  'Walkway Cleaning',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.10,
    'minPrice', 25,
    'minDuration', 15,
    'targetRevenuePerHour', 250,
    'sliderMin', 50,
    'sliderMax', 1000,
    'sliderStep', 25,
    'sliderDefault', 300,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  7,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Deck Cleaning ────────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'deck_cleaning',
  'Deck Cleaning',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.15,
    'minPrice', 100,
    'minDuration', 60,
    'targetRevenuePerHour', 250,
    'sliderMin', 100,
    'sliderMax', 2000,
    'sliderStep', 50,
    'sliderDefault', 400,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  8,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Fence Cleaning ───────────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'fence_cleaning',
  'Fence Cleaning',
  'per_linear_ft',
  JSON_OBJECT(
    'ratePerLinearFt', 1.25,
    'minPrice', 50,
    'minDuration', 30,
    'targetRevenuePerHour', 250,
    'fenceSidesMultiplier', 1.85,
    'sliderMin', 20,
    'sliderMax', 500,
    'sliderStep', 10,
    'sliderDefault', 100,
    'sliderUnit', 'linear ft'
  ),
  JSON_OBJECT(),
  9,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Detached Structure ───────────────────────────────────────────────────────
INSERT INTO service_configs (serviceKey, displayName, pricingMode, pricingConfig, multipliers, sortOrder, active)
VALUES (
  'detached_structure',
  'Detached Structure',
  'per_sqft',
  JSON_OBJECT(
    'ratePerSqft', 0.17,
    'minPrice', 100,
    'minDuration', 30,
    'targetRevenuePerHour', 200,
    'sliderMin', 100,
    'sliderMax', 3000,
    'sliderStep', 50,
    'sliderDefault', 500,
    'sliderUnit', 'sq ft'
  ),
  JSON_OBJECT(),
  10,
  1
)
ON DUPLICATE KEY UPDATE
  pricingConfig = VALUES(pricingConfig),
  updatedAt = NOW();

-- ─── Activate Quote Tool for company 1 ───────────────────────────────────────
UPDATE quote_tool_settings SET isActive = 1 WHERE companyId = 1;

SELECT CONCAT('Seeded ', COUNT(*), ' service_config rows') AS result FROM service_configs;
