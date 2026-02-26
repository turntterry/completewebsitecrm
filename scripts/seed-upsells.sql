-- Seed upsell catalog for Exterior Experts
-- Based on industry research: adjacent service stacking, gutter add-on patterns,
-- maintenance/prevention upsells, and social-proof-backed recommendations.
-- Run: mysql -u crm_user -pcrm_password exterior_experts_crm < scripts/seed-upsells.sql

UPDATE quote_tool_settings
SET upsellCatalog = JSON_ARRAY(

  -- ── House Washing upsells ──────────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'gutter-brightening',
    'title',       'Gutter Brightening',
    'description', 'Removes tiger-striping and oxidation from the outside of your gutters. Most customers add this — the difference is dramatic.',
    'price',       89,
    'appliesTo',   JSON_ARRAY('house_washing', 'roof_cleaning'),
    'badge',       'Most Popular',
    'active',      TRUE,
    'sortOrder',   1
  ),

  JSON_OBJECT(
    'id',          'window-wipedown',
    'title',       'Window Exterior Wipe-Down',
    'description', 'Hand-wipe all accessible windows after the house wash so they finish spotless, not streaky.',
    'price',       55,
    'appliesTo',   JSON_ARRAY('house_washing'),
    'badge',       '',
    'active',      TRUE,
    'sortOrder',   2
  ),

  JSON_OBJECT(
    'id',          'dryer-vent-exterior',
    'title',       'Dryer Vent Exterior Flush',
    'description', 'Clear lint buildup from the exterior dryer vent hood while we\'re already on-site. Fire hazard prevention.',
    'price',       35,
    'appliesTo',   JSON_ARRAY('house_washing'),
    'badge',       'Safety Add-on',
    'active',      TRUE,
    'sortOrder',   3
  ),

  -- ── Window Cleaning upsells ────────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'interior-windows',
    'title',       'Interior Windows',
    'description', 'Add interior glass cleaning to your order. We clean both sides while we\'re already set up — saves scheduling a second visit.',
    'price',       79,
    'appliesTo',   JSON_ARRAY('window_cleaning'),
    'badge',       'Customers Love This',
    'active',      TRUE,
    'sortOrder',   4
  ),

  JSON_OBJECT(
    'id',          'screen-track-cleaning',
    'title',       'Screen & Track Cleaning',
    'description', 'Remove, scrub, and reinstall all window screens. Tracks wiped clean of built-up grime.',
    'price',       45,
    'appliesTo',   JSON_ARRAY('window_cleaning'),
    'badge',       '',
    'active',      TRUE,
    'sortOrder',   5
  ),

  JSON_OBJECT(
    'id',          'hard-water-treatment',
    'title',       'Hard Water Stain Removal',
    'description', 'Mineral deposit buildup on glass gets worse every season. We treat it now before it becomes permanent etching.',
    'price',       65,
    'appliesTo',   JSON_ARRAY('window_cleaning'),
    'badge',       'Before It Gets Worse',
    'active',      TRUE,
    'sortOrder',   6
  ),

  -- ── Gutter Cleaning upsells ────────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'gutter-exterior-whitening',
    'title',       'Gutter Exterior Whitening',
    'description', 'Pressure wash the outside of your gutters to remove tiger-striping and black streaks. Same visit, big visual difference.',
    'price',       89,
    'appliesTo',   JSON_ARRAY('gutter_cleaning'),
    'badge',       'Popular Add-on',
    'active',      TRUE,
    'sortOrder',   7
  ),

  JSON_OBJECT(
    'id',          'downspout-flush',
    'title',       'Downspout Flush & Clear',
    'description', 'High-pressure flush all downspouts to break up clogs before they cause overflow damage.',
    'price',       45,
    'appliesTo',   JSON_ARRAY('gutter_cleaning'),
    'badge',       '',
    'active',      TRUE,
    'sortOrder',   8
  ),

  -- ── Roof Cleaning upsells ──────────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'moss-algae-prevention',
    'title',       'Moss & Algae Prevention Treatment',
    'description', 'Post-clean biocide spray keeps black streaks and moss from coming back for 12–18 months. Extends your results significantly.',
    'price',       95,
    'appliesTo',   JSON_ARRAY('roof_cleaning'),
    'badge',       'Extends Results',
    'active',      TRUE,
    'sortOrder',   9
  ),

  JSON_OBJECT(
    'id',          'roof-gutter-flush',
    'title',       'Gutter Flush After Roof Wash',
    'description', 'Roof wash pushes debris into your gutters. Add a gutter flush to clear it all out in the same visit.',
    'price',       65,
    'appliesTo',   JSON_ARRAY('roof_cleaning'),
    'badge',       'Makes Sense Together',
    'active',      TRUE,
    'sortOrder',   10
  ),

  -- ── Driveway / Concrete upsells ────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'oil-stain-pretreatment',
    'title',       'Oil Stain Pre-Treatment',
    'description', 'Degrease and pre-treat oil/fluid stains before the pressure wash. Standard cleaning alone won\'t lift embedded oil.',
    'price',       55,
    'appliesTo',   JSON_ARRAY('driveway_cleaning'),
    'badge',       'Worth It',
    'active',      TRUE,
    'sortOrder',   11
  ),

  JSON_OBJECT(
    'id',          'concrete-sealer',
    'title',       'Concrete Sealer Application',
    'description', 'Penetrating sealer applied after cleaning protects against future staining, cracking, and weed growth. Lasts 2–3 years.',
    'price',       149,
    'appliesTo',   JSON_ARRAY('driveway_cleaning', 'patio_cleaning', 'walkway_cleaning'),
    'badge',       'Protects Your Investment',
    'active',      TRUE,
    'sortOrder',   12
  ),

  -- ── Deck / Patio upsells ───────────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'furniture-move-reset',
    'title',       'Patio Furniture Move & Reset',
    'description', 'We move all patio furniture before cleaning and reset it after. No heavy lifting on your end.',
    'price',       35,
    'appliesTo',   JSON_ARRAY('patio_cleaning', 'deck_cleaning'),
    'badge',       '',
    'active',      TRUE,
    'sortOrder',   13
  ),

  -- ── Fence Cleaning upsells ─────────────────────────────────────────────────
  JSON_OBJECT(
    'id',          'gate-post-detail',
    'title',       'Gate & Post Detail Clean',
    'description', 'Extra attention to fence gates, posts, and hardware where dirt and mildew concentrate.',
    'price',       35,
    'appliesTo',   JSON_ARRAY('fence_cleaning'),
    'badge',       '',
    'active',      TRUE,
    'sortOrder',   14
  ),

  -- ── Window Cleaning — recurring program (QuoteIQ explicitly recommends) ────
  JSON_OBJECT(
    'id',          'window-monthly-program',
    'title',       'Monthly Maintenance Program',
    'description', 'Lock in a recurring monthly window clean at a reduced rate. Skip the scheduling hassle every time — we just show up.',
    'price',       49,
    'appliesTo',   JSON_ARRAY('window_cleaning'),
    'badge',       'Save Every Visit',
    'active',      TRUE,
    'sortOrder',   15
  ),

  -- ── Gutter Cleaning — guard pathway (QuoteIQ recommends as upsell tier) ────
  JSON_OBJECT(
    'id',          'gutter-guard-quote',
    'title',       'Gutter Guard Installation Quote',
    'description', 'Stop cleaning gutters every season. Add this and we\'ll include a free gutter guard quote with your service visit — no obligation.',
    'price',       0,
    'appliesTo',   JSON_ARRAY('gutter_cleaning'),
    'badge',       'Free Add-on',
    'active',      TRUE,
    'sortOrder',   16
  )

)
WHERE companyId = 1;

-- Enable bundle discounts so the savings banner shows on multi-service quotes
UPDATE quote_tool_settings SET bundleDiscountEnabled = 1 WHERE companyId = 1;

SELECT CONCAT('Upsell catalog seeded: ', JSON_LENGTH(upsellCatalog), ' items') AS result
FROM quote_tool_settings WHERE companyId = 1;
