import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../server/routers";

const COOKIE =
  process.env.CRM_SESSION ||
  "crm_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJyYW5kYWxsQGV4dGVyaW9yZXhwZXJ0cy5jbyIsImFwcElkIjoiZXh0ZXJpb3ItZXhwZXJ0cy1sb2NhbCIsIm5hbWUiOiJPd25lciIsImV4cCI6MTgwMzY3ODMwMX0.StX7xj7vxvbDn4Hdz57evrVqbDp5j2jxp2DMZK4CnSg";

const client = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: process.env.API_URL ?? "http://localhost:3000/api/trpc",
      headers() {
        return { cookie: COOKIE };
      },
    }),
  ],
});

type Tier = { minSize: number; maxSize: number | null; ratePerUnit: number };

async function upsert(
  key: string,
  displayName: string,
  pricingMode: string,
  tiers: Tier[],
  pricePerUnit: number | undefined,
  minimumCharge: number,
  multipliers: Record<string, unknown>,
  addOns: Record<string, number>
) {
  await client.serviceConfig.upsert.mutate({
    serviceKey: key,
    displayName,
    pricingMode,
    pricingConfig: {
      mode: pricingMode,
      tiers,
      pricePerUnit,
      minimumCharge,
    },
    multipliers,
    highlights: [],
    active: true,
  });
  console.log(`Seeded ${displayName}`);
}

async function main() {
  // House Wash
  await upsert(
    "house_wash",
    "House Wash",
    "hybrid",
    [
      { minSize: 0, maxSize: 1499, ratePerUnit: 249 },
      { minSize: 1500, maxSize: 2499, ratePerUnit: 299 },
      { minSize: 2500, maxSize: 3499, ratePerUnit: 349 },
      { minSize: 3500, maxSize: 4499, ratePerUnit: 429 },
      { minSize: 4500, maxSize: null, ratePerUnit: 529 },
    ],
    0.12,
    249,
    {
      stories: { one_story: 1.0, two_story: 1.12, three_story: 0 },
      siding: { vinyl: 1.0, brick: 1.05, stucco: 1.12, hardie: 1.1, mixed: 0 },
      addOns: { heavy_growth: 50, screened_porch: 65, detached_garage: 75 },
    },
    {}
  );

  // Driveway
  await upsert(
    "driveway",
    "Driveway Cleaning",
    "hybrid",
    [
      { minSize: 0, maxSize: 400, ratePerUnit: 129 },
      { minSize: 401, maxSize: 800, ratePerUnit: 179 },
      { minSize: 801, maxSize: 1200, ratePerUnit: 229 },
      { minSize: 1201, maxSize: 1800, ratePerUnit: 289 },
      { minSize: 1801, maxSize: null, ratePerUnit: 0 },
    ],
    0.2,
    129,
    {
      surface: { concrete: 1.0, pavers: 1.15, asphalt: 0 },
      addOns: { oil_stains: 35, rust_stains: 45 },
    },
    {}
  );

  // Roof
  await upsert(
    "roof_wash",
    "Roof Wash",
    "tier",
    [
      { minSize: 0, maxSize: 1500, ratePerUnit: 399 },
      { minSize: 1501, maxSize: 2500, ratePerUnit: 499 },
      { minSize: 2501, maxSize: 3500, ratePerUnit: 629 },
      { minSize: 3501, maxSize: 4500, ratePerUnit: 799 },
      { minSize: 4501, maxSize: null, ratePerUnit: 0 },
    ],
    undefined,
    399,
    {
      pitch: { walkable: 1.0, moderate: 1.1, steep: 0 },
      material: { asphalt: 1.0, metal: 1.05, tile: 0 },
      addOns: { heavy_streaking: 75 },
    },
    {}
  );

  // Windows
  await upsert(
    "windows",
    "Exterior Windows",
    "tier",
    [
      { minSize: 10, maxSize: 20, ratePerUnit: 179 },
      { minSize: 21, maxSize: 35, ratePerUnit: 249 },
      { minSize: 36, maxSize: 50, ratePerUnit: 329 },
      { minSize: 51, maxSize: 70, ratePerUnit: 449 },
      { minSize: 71, maxSize: null, ratePerUnit: 0 },
    ],
    undefined,
    179,
    {
      stories: { one_story: 1.0, two_story: 1.15, three_story: 0 },
      addOns: { screens: 40, tracks: 50, french_panes: 60, hard_water: 0 },
    },
    {}
  );

  // Gutters
  await upsert(
    "gutters",
    "Gutter Cleanout",
    "tier",
    [
      { minSize: 0, maxSize: 1499, ratePerUnit: 149 },
      { minSize: 1500, maxSize: 2499, ratePerUnit: 179 },
      { minSize: 2500, maxSize: 3499, ratePerUnit: 219 },
      { minSize: 3500, maxSize: 4499, ratePerUnit: 259 },
      { minSize: 4500, maxSize: null, ratePerUnit: 0 },
    ],
    undefined,
    149,
    {
      stories: { one_story: 1.0, two_story: 1.2, three_story: 0 },
      addOns: { guards: 30, clogged_downspouts: 25, heavy_debris: 30 },
    },
    {}
  );

  // Fence
  await upsert(
    "fence",
    "Fence Cleaning",
    "linear",
    [],
    1.25,
    199,
    {
      height: { four: 1.0, six: 1.1, eight: 1.2 },
      sides: { single: 1.0, both: 1.85 },
      material: { vinyl: 1.0, wood: 1.1, metal: 1.05 },
      addOns: { heavy_growth: 50 },
    },
    {}
  );

  // Patio
  await upsert(
    "patio",
    "Patio Cleaning",
    "hybrid",
    [
      { minSize: 0, maxSize: 200, ratePerUnit: 119 },
      { minSize: 201, maxSize: 400, ratePerUnit: 169 },
      { minSize: 401, maxSize: 700, ratePerUnit: 219 },
      { minSize: 701, maxSize: 1000, ratePerUnit: 269 },
      { minSize: 1001, maxSize: null, ratePerUnit: 0 },
    ],
    0.18,
    119,
    {
      surface: { concrete: 1.0, pavers: 1.12, stone: 1.08, other: 0 },
      addOns: { heavy_algae: 40, furniture: 35 },
    },
    {}
  );

  console.log("All services seeded. You can edit any value in Admin → Quote Tool → Service Config.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
