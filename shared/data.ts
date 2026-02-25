// ─── Service Definitions ─────────────────────────────────────────────
export interface ServiceDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string; // lucide icon name
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
}

export const SERVICES: ServiceDef[] = [
  {
    id: "house_washing",
    name: "House Washing",
    shortName: "House Wash",
    description: "Safe soft washing for your home's exterior. Remove algae, mold, mildew & dirt without damage to siding or paint.",
    icon: "Home",
    slug: "house-washing",
    metaTitle: "House Washing in Cookeville TN | Soft Wash Experts",
    metaDescription: "Safe soft washing for homes in Cookeville, TN. Remove algae, mold & dirt without damage. Licensed & insured exterior cleaning.",
    h1: "House Washing in Cookeville, TN",
  },
  {
    id: "pressure_washing",
    name: "Pressure Washing",
    shortName: "Pressure Wash",
    description: "Professional pressure washing for driveways, siding, patios & more. Safe, effective cleaning with guaranteed results.",
    icon: "Droplets",
    slug: "pressure-washing",
    metaTitle: "Pressure Washing in Cookeville TN | Exterior Experts",
    metaDescription: "Professional pressure washing in Cookeville, TN for driveways, siding & patios. Safe, effective cleaning with guaranteed results.",
    h1: "Pressure Washing in Cookeville, TN",
  },
  {
    id: "window_cleaning",
    name: "Window Cleaning",
    shortName: "Windows",
    description: "Professional interior & exterior window cleaning for spotless, streak-free results every time.",
    icon: "SquareStack",
    slug: "window-cleaning",
    metaTitle: "Window Cleaning in Cookeville TN | Streak-Free Shine",
    metaDescription: "Professional window cleaning in Cookeville & Upper Cumberland. Interior & exterior service. Spotless, streak-free results.",
    h1: "Window Cleaning in Cookeville, TN",
  },
  {
    id: "gutter_cleaning",
    name: "Gutter Cleaning",
    shortName: "Gutters",
    description: "Thorough gutter cleaning and debris removal to prevent water damage and protect your home's foundation.",
    icon: "Filter",
    slug: "gutter-cleaning",
    metaTitle: "Gutter Cleaning in Cookeville TN | Clog Removal",
    metaDescription: "Professional gutter cleaning in Cookeville, TN. Prevent water damage with safe & thorough debris removal.",
    h1: "Gutter Cleaning in Cookeville, TN",
  },
  {
    id: "driveway_cleaning",
    name: "Concrete Cleaning",
    shortName: "Concrete",
    description: "Restore stained driveways, sidewalks & patios. Professional concrete pressure washing with lasting results.",
    icon: "LayoutGrid",
    slug: "concrete-cleaning",
    metaTitle: "Concrete Cleaning in Cookeville TN | Driveway Washing",
    metaDescription: "Restore stained driveways, sidewalks & patios in Cookeville, TN. Professional concrete pressure washing with lasting results.",
    h1: "Concrete Cleaning in Cookeville, TN",
  },
  {
    id: "roof_cleaning",
    name: "Roof Cleaning",
    shortName: "Roof",
    description: "Safe soft wash roof cleaning to remove black streaks, algae & moss. Extend the life of your roof.",
    icon: "Triangle",
    slug: "roof-cleaning",
    metaTitle: "Roof Cleaning in Cookeville TN | Soft Wash Roof Cleaning",
    metaDescription: "Safe soft wash roof cleaning in Cookeville, TN. Remove black streaks, algae & moss without damaging your shingles.",
    h1: "Roof Cleaning in Cookeville, TN",
  },
  {
    id: "deck_cleaning",
    name: "Deck Cleaning",
    shortName: "Deck",
    description: "Restore your deck to like-new condition. Professional cleaning that removes grime, mold & weathering.",
    icon: "Fence",
    slug: "deck-cleaning",
    metaTitle: "Deck Cleaning in Cookeville TN | Deck Restoration",
    metaDescription: "Professional deck cleaning in Cookeville, TN. Restore your deck to like-new condition with expert pressure washing.",
    h1: "Deck Cleaning in Cookeville, TN",
  },
];

// ─── Location Definitions ────────────────────────────────────────────
export interface LocationDef {
  id: string;
  name: string;
  state: string;
  slug: string;
  lat: number;
  lng: number;
  description: string;
}

export const LOCATIONS: LocationDef[] = [
  { id: "cookeville", name: "Cookeville", state: "TN", slug: "cookeville-tn", lat: 36.1628, lng: -85.5016, description: "Serving Cookeville and the surrounding Upper Cumberland region." },
  { id: "baxter", name: "Baxter", state: "TN", slug: "baxter-tn", lat: 36.1534, lng: -85.6417, description: "Professional exterior cleaning services in Baxter, TN." },
  { id: "algood", name: "Algood", state: "TN", slug: "algood-tn", lat: 36.1959, lng: -85.4487, description: "Trusted pressure washing and window cleaning in Algood, TN." },
  { id: "sparta", name: "Sparta", state: "TN", slug: "sparta-tn", lat: 35.9259, lng: -85.4641, description: "Professional exterior cleaning services in Sparta, TN." },
  { id: "livingston", name: "Livingston", state: "TN", slug: "livingston-tn", lat: 36.3834, lng: -85.3232, description: "Expert pressure washing and house washing in Livingston, TN." },
];

export const UPPER_CUMBERLAND_DESCRIPTION = "Serving the entire Upper Cumberland region including Cookeville, Baxter, Algood, Sparta, Livingston, and surrounding areas.";

// ─── Business Info ───────────────────────────────────────────────────
export const BUSINESS = {
  name: "Exterior Experts",
  tagline: "Power Washing & Window Cleaning",
  phone: "(931) 284-2291",
  phoneRaw: "9312842291",
  email: "randall@exteriorexperts.co",
  address: "177 Webb Ave",
  city: "Cookeville",
  state: "TN",
  zip: "38506",
  fullAddress: "177 Webb Ave, Cookeville, TN 38506",
  googleMapsUrl: "https://maps.app.goo.gl/bhgMD4bu7bJFEjeCA",
  owner: "Randall",
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/UhbzMEKcfoUJjkMx.png",
  logoLargeUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/RQDxVrUmljsTHUtc.png",
  baseLat: 36.1628,
  baseLng: -85.5016,
  facebook: "https://www.facebook.com/exteriorexpertspw",
  instagram: "https://www.instagram.com/exteriorexpertspw",
};

// ─── Gallery seed data ───────────────────────────────────────────────
export const SEED_GALLERY = [
  // House Washing
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/KNbVbHKyQTjzkwVW.jpg", title: "Brick Wall Moss Removal", service: "house_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/ttyMIsnAebkwcjQE.jpg", title: "Modern Home Exterior Wash", service: "house_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/TYnVCzAVyeJAzDmw.jpg", title: "Vinyl Siding House Wash", service: "house_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/shpwawcMzesvgnEI.jpg", title: "Full House Exterior Cleaning", service: "house_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/HMDWRvSiHIyKTghE.jpg", title: "House Siding Restoration", service: "house_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/ljdzHCHpLRBSUREj.jpg", title: "Exterior Home Cleaning", service: "house_washing" },
  // Concrete / Driveway / Walkway
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/sGcPQdQIXNYcMhZO.jpg", title: "Patio Concrete Cleaning", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/JZsxiwXiIIWIZOfA.jpg", title: "Driveway & Walkway Restoration", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/gTvImMCKZsyVxLCo.jpg", title: "Walkway Moss Removal", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/GqmnRXOVjONHWbNX.jpg", title: "Brick Steps Deep Clean", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/iCDwumDEubtifHsh.jpg", title: "Concrete Walkway Restoration", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/vwRzOqQjtQFdxEnG.jpg", title: "Patio Area Pressure Wash", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/RnhCCFHMxRgBSUTP.jpg", title: "Brick Entryway Cleaning", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/XVXTDUyUkoyEUEtr.jpg", title: "Walkway & Patio Restoration", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/MpTtrmICmIlTqDMH.jpg", title: "Driveway & Garage Cleaning", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/XmBhgXyrQzeOHhoz.jpg", title: "Concrete Surface Cleaning", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/rMAlqEDPmVTBAxDU.jpg", title: "Driveway Pressure Washing", service: "driveway_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/xxCCGPtrcnriOrbE.jpg", title: "Concrete Patio Cleaning", service: "driveway_cleaning" },
  // Gutter Cleaning
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/PGsMAfBvnjUlyHwf.jpg", title: "Gutter Cleanout Before & After", service: "gutter_cleaning" },
  // Deck Cleaning
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/qUeHkMXJfYavUqOr.jpg", title: "Deck Cleaning & Staining", service: "deck_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/gmTYDtIFrQPankQT.jpg", title: "Deck Restoration", service: "deck_cleaning" },
  // Roof Cleaning
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/TNrOMBVJkbjrHFZf.jpg", title: "Metal Roof Cleaning", service: "roof_cleaning" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/eYjDvpyONEXXdvJP.jpg", title: "Roof Wash & Restoration", service: "roof_cleaning" },
  // Additional work photos
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/cJvQzOpxuGPChxir.jpg", title: "Exterior Cleaning Results", service: "pressure_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/yGPawfYlHDpKqjaT.jpg", title: "Professional Cleaning Results", service: "pressure_washing" },
  { url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663366996886/KhhVzDXUggENKlHL.jpg", title: "Before & After Transformation", service: "pressure_washing" },
];
