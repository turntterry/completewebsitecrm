/**
 * One-time import of products & services from Jobber CSV export.
 * Run: node scripts/import-products.mjs
 */
import { createConnection } from "mysql2/promise";

const COMPANY_ID = 1;

// Cleaned-up product/service data from the Jobber CSV export
const products = [
  // ── Window Cleaning ──────────────────────────────────────────────────────
  { name: "Window Cleaning (Expert Essential)", description: "✅ Exterior Glass Cleaning\n✅ Screen Removal & Replacement\n❌ Interior Glass\n❌ Frames & Sills\n❌ Deep Track & Screen Scrub", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Window Cleaning (Signature Sparkle) — Most Popular!", description: "✅ Exterior Glass Cleaning\n✅ Interior Glass Cleaning\n✅ Frames Wiped Down\n✅ Interior Ledges Wiped\n❌ Sills\n❌ Deep Track Cleaning or Screen Scrub", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Window Cleaning (Platinum Perfection)", description: "✅ Exterior & Interior Glass\n✅ Frames, Sills & Ledges\n✅ Deep Screen Washing (Soap & Scrub)\n✅ Deep Track Detailing (Clean & Rinse)", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Exterior Window Cleaning", description: "- Frames\n- Sills\n- Cobwebs\n- Screen Removal & Replace\n- Glass\n\nNo drips, drops, streaks, or smears", category: "Service", unitPrice: 14.0, taxable: true },
  { name: "Interior Window Cleaning", description: "- Frames\n- Sills\n- Glass\n- Cobwebs\n\nNo drips, drops, smears, or streaks", category: "Service", unitPrice: 13.0, taxable: false },
  { name: "Window Rinsing", description: "- Will soap up and rinse off\n- May not dry spot free", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Interior Screen Removal & Replace", description: "- Remove, Wipe down if needed, & replace", category: "Service", unitPrice: 55.0, taxable: true },
  { name: "Sky Light Cleaning", description: "", category: "Service", unitPrice: 0.0, taxable: false },

  // ── House / Soft Wash ────────────────────────────────────────────────────
  { name: "House Washing", description: "✅ Soft wash cleaning for siding, trim, soffits & gutters\n✅ Removes mold, mildew, algae & organic buildup\n✅ Safe for vinyl, brick, stucco & painted surfaces\n❌ Auxiliary fungus spores, oxidation, vine marks, etc. are not included\n❌ No high-pressure damage", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "House Soft-Wash", description: "- All organic stains such as algae, mold, and mildew will be eliminated.\n- We recommend window cleaning afterward as we cannot guarantee spot-free drying of windows.", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Vinyl Siding Only", description: "- All vinyl siding will be cleaned\n- Organic growth such as mold, algae, mildew, etc. will be removed", category: "Service", unitPrice: 179.0, taxable: true },
  { name: "Vinyl Siding Oxidation Removal", description: "- Driveway side of home only\n- Oxidation will be removed and pressure washing marks will not be visible", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Shutter Oxidation Removal", description: "- Will remove the chalky discolored layer", category: "Service", unitPrice: 35.0, taxable: false },
  { name: "Efflorescence Removal", description: "- Will remove calcium run off from siding", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Dormer Cleaning", description: "- We will effectively remove all mold, mildew, algae, and other contaminants from dormers.", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Soffit and Gutter Front Cleaning", description: "", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Detached Garage", description: "All organic stains such as algae, mold, and mildew will be eliminated.\n- Gutter fronts, soffits, dormers, down to foundation will be cleaned", category: "Service", unitPrice: 100.0, taxable: true },

  // ── Roof Cleaning ────────────────────────────────────────────────────────
  { name: "Soft Wash Roof Cleaning", description: "✅ Low-pressure, roof-safe cleaning process\n✅ Eliminates black streaks, algae & moss\n✅ Helps extend the life of your roof\n❌ No high-pressure washing", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Roof Cleaning", description: "Soft wash cleaning method using low-pressure steam with chemical solutions to kill organic growth on the roof.", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Painted Metal Roof Restoration", description: "- Removes the dull chalky layer that discolors a metal roof.\n- Roof will need to be brushed with a soft bristle brush\n- Low pressure\n- Outside temperature must be above 60°F for the chemical to work effectively.", category: "Service", unitPrice: 1485.0, taxable: true },
  { name: "Moss Treatment", description: "Application of chemical treatment to visible patches of moss on roofs, turning moss from green to brown and preventing regrowth.", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Roof Leaf Removal", description: "", category: "Service", unitPrice: 0.0, taxable: true },

  // ── Gutters ──────────────────────────────────────────────────────────────
  { name: "Gutter Cleaning", description: "✅ Complete removal of leaves, debris & buildup\n✅ Downspouts flushed for proper drainage\n✅ Helps prevent overflow & water damage\n❌ No mess left behind", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Gutter Cleanout", description: "- Debris is bagged for removal and hauled away\n- Flushed with water to guarantee proper drainage.", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Gutter Screens", description: "", category: "Service", unitPrice: 150.0, taxable: false },
  { name: "Gutter Whitening / Tiger Stripe Removal", description: "✅ Removes black streaks & oxidation from gutter faces\n✅ Restores gutters to a bright, clean appearance\n❌ Not included with standard gutter cleaning", category: "Service", unitPrice: 0.0, taxable: false },

  // ── Concrete / Driveways / Sidewalks ────────────────────────────────────
  { name: "Concrete Surface Cleaning", description: "✅ Driveways, sidewalks, patios, etc.\n✅ Removes mold, mildew, algae & other surface grime\n✅ Pre-treated & post-treated with professional detergents\n❌ Rust, red clay & oil stains not included unless specified", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Driveway Cleaning", description: "Pressure washing of driveway using hot water and detergents to remove dirt, grime, and organic growth. May include treatment for oil stains.", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Sidewalk Cleaning", description: "Pressure washing of sidewalks to remove dirt, grime, and organic growth, enhancing curb appeal.", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Patio Cleaning", description: "Pressure washing of patio area to remove dirt and organic growth. May include chemical treatments for tougher stains.", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Restaurant Sidewalk Cleaning", description: "", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Commercial Sidewalk Power Wash", description: "- Gum removal services are not currently offered.\n- Sidewalks will undergo degreasing and surface cleaning.\n- Any grass clumps between pavement and sidewalk will be cleared.\n- A fee of $2 per shopping cart will be applied for removal and placement back in the front corral.\n- Rust stain removal is an additional service provided.\n- Please note that we are unable to relocate benches, propane tank cages, ice machines, coke machines, etc.", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Pressure Washing", description: "High-pressure washing of surfaces such as patios, sidewalks, and decks to remove dirt, algae, and stains.", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Concrete Sealing & Supplies", description: "Sq Ft:\nAmount Needed:\nFinish:", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Paver Stones Cleaning", description: "- Will clean paver sidewalk with an acid based cleaner", category: "Service", unitPrice: 225.0, taxable: true },
  { name: "Paver Stones Cleaning & Sealing", description: "Size:\nAcid/Chlorine Cleaner:\nNew Sand:\nApplication Method:", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Paver Sidewalk Sealing", description: "- Will use a wet look sealer\n- 3 gallons", category: "Service", unitPrice: 459.0, taxable: true },
  { name: "Paver Sanding", description: "Sand Type: Polymeric\nColor: N/A\nBrand: Dominator", category: "Service", unitPrice: 350.0, taxable: false },
  { name: "Pavers Soft-Wash", description: "- Our services include the removal of organic growth such as mold, mildew, and algae.\n- We utilize commercial-grade detergents for pre-treating and post-treating concrete surfaces.\n- Please note that addressing rust, red clay, or oil stains are not included", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Travertine Soft-Wash", description: "", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Pool Deck Cleaning", description: "Surface Type: Travertine\nWhat Is Being Cleaned: Pool deck, all walls and tops of walls, and fireplace\nPressure or Soft-Wash: Soft Wash", category: "Service", unitPrice: 419.0, taxable: false },
  { name: "Neighborhood Brick Entryway", description: "- Brick entryway into neighborhood will be softwashed and cleaned of mold, mildew, algae, etc.\n- If water source isn't nearby, I will fill my tank at your home and haul water back to entrance", category: "Service", unitPrice: 175.0, taxable: true },
  { name: "Specialty Stain Removal", description: "Type of Staining:", category: "Service", unitPrice: 0.0, taxable: false },

  // ── Decks & Fences ───────────────────────────────────────────────────────
  { name: "Deck Cleaning & Brightening", description: "✅ Removes mold, mildew & algae from wood surfaces\n✅ Pre-treated & post-treated with professional cleaners\n✅ Restores natural wood appearance\n❌ No harsh pressure that damages wood", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Composite Deck Cleaning", description: "- Low pressure and composite deck cleaners only", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Trex Deck Cleaning", description: "", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Deck Cleaning & Staining", description: "CLEANING\n- All organic matter such as mold, mildew, and algae will be removed\n- Wood will be cleaned with low pressure\n- Commercial grade cleaners\n\nSTAINING\n- Will prep home to ensure no stain gets on house\n- Will brush on floors and roll on spindles and rails", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Deck Staining", description: "Brand: Stain & Seal Experts\nType Of Stain:\nGallons Needed:\nApplication Method:\nSq Ft:\nSpindles:\nTarps/Wrapping House Needed:\nLadders Needed:", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Deck Staining & Supplies (Valspar)", description: "Brand: Valspar\nOil Or Water Based: N/A\nGallons Needed:\nApplication Method:\nSq Ft:\nSpindles:\nTarps/Wrapping House Needed:\nLadders Needed:", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Wood Fence Cleaning", description: "- All organic matter such as mold, mildew, and algae will be effectively eliminated.\n- The wood will be pre-treated and post-treated with high-quality commercial-grade detergents.\n- Please note that it may take up to 24 hours for all green residues to completely disappear.", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Vinyl Fence Cleaning", description: "", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Fence Staining", description: "Fence Type:\nLength:\nHeight:\nApplication Method:", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Retaining Wall", description: "", category: "Service", unitPrice: 0.0, taxable: false },

  // ── Screens & Enclosures ─────────────────────────────────────────────────
  { name: "Screen Enclosure Cleaning", description: "Soft wash cleaning of screen enclosures to remove dirt, algae, and organic material without damaging the screens.", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Gazebo Cleaning", description: "", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Shed", description: "", category: "Service", unitPrice: 0.0, taxable: false },

  // ── Leaf / Misc Outdoor ──────────────────────────────────────────────────
  { name: "Leaf Removal", description: "- Will bag all leaves and dispose of them\n- Grate will be pulled up and cleaned", category: "Service", unitPrice: 75.0, taxable: false },
  { name: "Mailbox Cleaning", description: "- Low pressure\n- All organic growth will be removed", category: "Service", unitPrice: 0.0, taxable: false },

  // ── Lighting ─────────────────────────────────────────────────────────────
  { name: "Permanent Outdoor Lighting", description: "", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Custom Christmas Lighting (Gutter & Roof Line)", description: "Linear Ft:\nColors:\nTimers:\nSpacing:", category: "Service", unitPrice: 0.0, taxable: true },
  { name: "Custom Christmas Lighting (Columns)", description: "Type:\nSize:\nColor:\nBulb Type:", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Custom Christmas Lighting (Ground Stakes)", description: "Length: 75ft\nHeight: 5\"\nColor: Warm White", category: "Service", unitPrice: 6.0, taxable: true },
  { name: "Custom Christmas Lighting (Tree)", description: "Type: Japanese Maple\nSize: Medium Tree\nColor: Red & Pure White\nPrice includes: Install, Maintenance, Removal, & Storage", category: "Service", unitPrice: 675.0, taxable: false },
  { name: "Custom Halloween Lighting (Gutter & Roof Line)", description: "Linear Ft:\nColors:\nTimers:\nSpacing:", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Add-On Christmas Lights 2025", description: "Where:\nType:\nLength:\nColor:", category: "Service", unitPrice: 8.5, taxable: true },
  { name: "Christmas Lights Removal", description: "", category: "Service", unitPrice: 0.0, taxable: false },

  // ── Stain & Seal Products ────────────────────────────────────────────────
  { name: "Expert Stain & Seal (5 Gallon)", description: "5 gallons", category: "Product", unitPrice: 239.99, taxable: true },
  { name: "Stain & Supplies", description: "Amount:\nColor:\nFinish:\nBrand: Stain & Seal Experts", category: "Service", unitPrice: 0.0, taxable: false },
  { name: "Oxidation Remover", description: "Price includes tax and shipping", category: "Product", unitPrice: 300.0, taxable: true },

  // ── Wreaths & Holiday Products ───────────────────────────────────────────
  { name: "48\" Pre-Lit Wreath (Sun Warm White)", description: "48\" Pre-lit wreath that is sure to bring a sparkle to your home!\nBundle discount when purchasing 3 or more!\nMinleon", category: "Product", unitPrice: 215.0, taxable: true },
  { name: "60\" Pre-Lit Wreath (Sun Warm White)", description: "60\" Pre-lit wreath that is sure to bring a sparkle to your home!\nBundle discount when purchasing 3 or more!", category: "Product", unitPrice: 395.0, taxable: true },
  { name: "36\" Pre-Decorated Wreath (Warm White)", description: "3 Styles to choose from:\n- Polar\n- Traditional\n- Timeless\n\nConstructed with the finest materials, pre-wrapped with high quality warm white outdoor 5mm LED mini lights. Built to last outdoors with pre-installed ornamental designer touches.", category: "Product", unitPrice: 285.0, taxable: true },
  { name: "48\" Pre-Decorated Wreath (Warm White)", description: "3 Styles to choose from:\n- Polar\n- Traditional\n- Timeless\n\nConstructed with the finest materials, pre-wrapped with high quality warm white outdoor 5mm LED mini lights. Built to last outdoors with pre-installed ornamental designer touches.", category: "Product", unitPrice: 419.0, taxable: true },
  { name: "Custom Christmas Lighting (Wreath)", description: "Type:\nSize:\nColor:", category: "Product", unitPrice: 0.0, taxable: false },
  { name: "Trident Hurricane Cat 5", description: "", category: "Product", unitPrice: 569.0, taxable: true },

  // ── Misc Services ────────────────────────────────────────────────────────
  { name: "TV Removal", description: "", category: "Service", unitPrice: 0.0, taxable: false },
];

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);

  // Clear existing catalog items for this company (fresh import)
  await conn.query("DELETE FROM product_catalog WHERE companyId = ?", [COMPANY_ID]);

  let sortOrder = 0;
  for (const p of products) {
    await conn.query(
      `INSERT INTO product_catalog (companyId, name, description, category, unitPrice, taxable, active, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, true, ?)`,
      [COMPANY_ID, p.name, p.description || null, p.category, p.unitPrice, p.taxable ? 1 : 0, sortOrder++]
    );
  }

  const [rows] = await conn.query("SELECT COUNT(*) as cnt FROM product_catalog WHERE companyId = ?", [COMPANY_ID]);
  console.log(`Imported ${rows[0].cnt} products/services.`);
  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
