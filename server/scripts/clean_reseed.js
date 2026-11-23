/**
 * CLEAN + RESEED — removes all seeded/fake data, keeps real user accounts,
 * then inserts clean, realistic data with accurate impact numbers.
 *
 * Run: node server/scripts/clean_reseed.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User             = require("../models/User");
const BusinessProfile  = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");
const Food             = require("../models/Food");
const Reservation      = require("../models/Reservation");
const ImpactLedger     = require("../models/ImpactLedger");

/* ─── helpers ─────────────────────────────────────────────── */
const days  = (n) => new Date(Date.now() + n * 86_400_000);
const hrs   = (n) => new Date(Date.now() + n * 3_600_000);
const code  = () => `RPL-${Math.floor(100000 + Math.random() * 900000)}`;

/* ─── REAL emails to PRESERVE (created by actual users) ───── */
const KEEP_EMAILS = new Set([
  "rinkeshbhatiset0@gmail.com", // existing super-admin
  "amrik@gmail.com",
  "amrik123@gmail.com",
  "ngo@gmail.com",
  "taj@gmail.com",
  "mannat@gmail.com",
  "raw@gmail.com",
  "roshankumarslce@gmail.com",
  "jag@gmail.com",
  "r2@gmail.com",
  "rinkeshbhati567@gmail.com",  // seeded admin — keep it
]);

/* ─── Realistic food images (Unsplash, stable) ────────────── */
const IMG = {
  thali:    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  biryani:  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80",
  sweets:   "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
  bread:    "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&q=80",
  salad:    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  curry:    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
  snacks:   "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
  cake:     "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
  event:    "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80",
  catering: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
  ngo1:     "https://images.unsplash.com/photo-1593113630400-ea4288922559?w=600&q=80",
  ngo2:     "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80",
  ngo3:     "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80",
  biz1:     "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
  biz2:     "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
  party1:   "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
  party2:   "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80",
};

/* ══════════════════════════════════════════════════════════ */
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("✅ MongoDB connected\n");

  /* ═══════════ PHASE 1: WIPE SEEDED DATA ═══════════════════ */
  console.log("━━━━ PHASE 1: Removing seeded/fake data ━━━━━━━━━━━━━━\n");

  // Find all users NOT in KEEP set
  const allUsers = await User.find({}).lean();
  const toDeleteUserIds = allUsers
    .filter(u => !KEEP_EMAILS.has(u.email))
    .map(u => u._id);

  if (toDeleteUserIds.length > 0) {
    await User.deleteMany({ _id: { $in: toDeleteUserIds } });
    await BusinessProfile.deleteMany({ userId: { $in: toDeleteUserIds } });
    await RecipientProfile.deleteMany({ userId: { $in: toDeleteUserIds } });
    await Food.deleteMany({ businessId: { $in: toDeleteUserIds } });
    await Reservation.deleteMany({
      $or: [
        { recipientId: { $in: toDeleteUserIds } },
        { businessId:  { $in: toDeleteUserIds } },
      ],
    });
    console.log(`🗑️  Removed ${toDeleteUserIds.length} seeded users and all linked data.`);
  }

  // Wipe ALL food listings + reservations + ledger that are now orphaned
  // (food with no matching business user)
  const validBizIds = (await User.find({ role: "BUSINESS" }).select("_id").lean()).map(u => u._id);
  const orphanFoods = await Food.find({ businessId: { $nin: validBizIds } }).select("_id").lean();
  if (orphanFoods.length > 0) {
    await Food.deleteMany({ _id: { $in: orphanFoods.map(f => f._id) } });
    console.log(`🗑️  Removed ${orphanFoods.length} orphaned food listings.`);
  }

  // Wipe all existing reservations + ledger (clean slate for consistent data)
  const rCount = await Reservation.countDocuments();
  const lCount = await ImpactLedger.countDocuments();
  await Reservation.deleteMany({});
  await ImpactLedger.deleteMany({});
  console.log(`🗑️  Cleared ${rCount} reservations and ${lCount} ledger entries.`);

  // Fix real users: reset inflated/stale impact numbers
  await User.updateMany(
    { email: { $in: [...KEEP_EMAILS] } },
    { $set: { impactCredits: 0, totalFoodRescuedKg: 0, totalCompletedOrders: 0, rewardLevel: "NEW" } }
  );
  // Keep admin credits meaningful
  await User.updateOne({ email: "rinkeshbhati567@gmail.com" }, {
    $set: { impactCredits: 0, totalFoodRescuedKg: 0, totalCompletedOrders: 0, rewardLevel: "NEW" }
  });
  console.log("🔄  Reset impact stats on all kept users.\n");

  /* ═══════════ PHASE 2: CLEAN UP REAL USER PROFILES ════════ */
  console.log("━━━━ PHASE 2: Tidying real user profiles ━━━━━━━━━━━━━\n");

  // Fix real businesses: ensure isVerified=true for established ones
  const realBizesToVerify = ["amrik123@gmail.com","taj@gmail.com","roshankumarslce@gmail.com","jag@gmail.com","r2@gmail.com"];
  await User.updateMany({ email: { $in: realBizesToVerify } }, { $set: { isVerified: true } });
  await BusinessProfile.updateMany(
    { userId: { $in: (await User.find({ email: { $in: realBizesToVerify } }).select("_id").lean()).map(u=>u._id) } },
    { $set: { isVerified: true } }
  );

  // Fix NGO profile name
  await User.updateOne({ email: "ngo@gmail.com" }, { $set: { name: "Priya Sharma", organizationName: "Noida Food Bank" } });
  await RecipientProfile.updateOne(
    { userId: (await User.findOne({ email: "ngo@gmail.com" }).select("_id").lean())?._id },
    { $set: { organizationName: "Noida Food Bank", description: "City-level food bank redistributing surplus meals to daily-wage workers and migrant families in Noida." } }
  );

  // Fix r2@gmail.com party profile
  const r2User = await User.findOne({ email: "r2@gmail.com" });
  if (r2User) {
    await User.updateOne({ _id: r2User._id }, { $set: { name: "Rahul Sharma", businessType: "PARTY" } });
    await BusinessProfile.updateOne({ userId: r2User._id }, {
      $set: {
        businessName: "Rahul Sharma (Post-Wedding Event)",
        businessType: "PARTY",
        description: "Individual event donor — post-wedding reception with significant food surplus.",
        isVerified: true,
        address: "Sector 44, Noida, Uttar Pradesh",
        city: "Noida",
        registrationNumber: "9012 3456 7890",
      }
    });
  }

  console.log("✅ Real user profiles cleaned up.\n");

  /* ═══════════ PHASE 3: ADD 3 CLEAN NGO USERS ══════════════ */
  console.log("━━━━ PHASE 3: Creating 3 verified NGO users ━━━━━━━━━━\n");

  const ngoSeeds = [
    {
      name: "Anjali Verma",
      email: "anjali@annadata.ngo",
      orgName: "Annadata Foundation",
      phone: "+91 97000 33333",
      address: "Sector 71, Noida, UP 201309",
      city: "Noida", pincode: "201309",
      reg: "NGO-UP-2018-0003003",
      desc: "Grassroots NGO running community kitchens and nutrition programmes for urban poor in Noida.",
      img: IMG.ngo2,
      lat: 28.5750, lng: 77.3680,
    },
    {
      name: "Mohammed Irfan",
      email: "irfan@khanagharna.org",
      orgName: "Khana Ghar Foundation",
      phone: "+91 97000 44444",
      address: "Sector 51, Noida, UP 201301",
      city: "Noida", pincode: "201301",
      reg: "NGO-UP-2012-0004004",
      desc: "Delivers hot meals daily to construction workers and homeless shelters across Noida.",
      img: IMG.ngo3,
      lat: 28.6210, lng: 77.3650,
    },
    {
      name: "Goonj Foundation",
      email: "noida@goonj.org",
      orgName: "Goonj Foundation Noida",
      phone: "+91 97000 55555",
      address: "Sector 15A, Noida, UP 201301",
      city: "Noida", pincode: "201301",
      reg: "NGO-MH-2003-0001234",
      desc: "National NGO rescuing food and essentials for underserved communities. Noida chapter.",
      img: IMG.ngo1,
      lat: 28.5852, lng: 77.3139,
    },
  ];

  const ngoUsers = [];
  for (const nd of ngoSeeds) {
    let u = await User.findOne({ email: nd.email });
    if (!u) {
      u = await User.create({
        firebaseUid: `ngo_clean_${nd.email.split("@")[0]}_${Date.now()}`,
        name: nd.name, email: nd.email, role: "RECIPIENT", recipientType: "NGO",
        phone: nd.phone, profileImage: nd.img, organizationName: nd.orgName,
        isVerified: true, impactCredits: 0, trustScore: 100,
        totalCompletedOrders: 0, totalFoodRescuedKg: 0, rewardLevel: "NEW",
        location: { address: nd.address, city: nd.city, state: "Uttar Pradesh", pincode: nd.pincode, coordinates: { lat: nd.lat, lng: nd.lng } },
      });
    } else {
      await User.updateOne({ _id: u._id }, { $set: { isVerified: true, role: "RECIPIENT", recipientType: "NGO", impactCredits: 0, totalFoodRescuedKg: 0, totalCompletedOrders: 0, rewardLevel: "NEW" } });
    }
    ngoUsers.push(u);

    let rp = await RecipientProfile.findOne({ userId: u._id });
    if (!rp) {
      await RecipientProfile.create({
        userId: u._id, organizationName: nd.orgName, recipientType: "NGO",
        description: nd.desc, phone: nd.phone, address: nd.address,
        city: nd.city, state: "Uttar Pradesh", pincode: nd.pincode,
        profileImage: nd.img, registrationNumber: nd.reg, isVerified: true,
      });
    } else {
      await RecipientProfile.updateOne({ _id: rp._id }, { $set: { organizationName: nd.orgName, isVerified: true } });
    }
    console.log(`  ✅ NGO: ${nd.orgName} (${nd.email})`);
  }

  // Also load existing ngo@gmail.com
  const ngoMain = await User.findOne({ email: "ngo@gmail.com" });
  const allNGOs = [ngoMain, ...ngoUsers].filter(Boolean);

  /* ═══════════ PHASE 4: FOOD LISTINGS ══════════════════════ */
  console.log("\n━━━━ PHASE 4: Creating realistic food listings ━━━━━━━\n");

  // Load real businesses
  const bizAmrik   = await User.findOne({ email: "amrik123@gmail.com" });
  const bizTaj     = await User.findOne({ email: "taj@gmail.com" });
  const bizMannat  = await User.findOne({ email: "mannat@gmail.com" });
  const bizRoshan  = await User.findOne({ email: "roshankumarslce@gmail.com" });
  const bizJag     = await User.findOne({ email: "jag@gmail.com" });
  const bizRahul   = await User.findOne({ email: "r2@gmail.com" });

  // Also get profiles for addresses
  const profileOf = async (user) => user ? await BusinessProfile.findOne({ userId: user._id }).lean() : null;
  const pAmrik  = await profileOf(bizAmrik);
  const pTaj    = await profileOf(bizTaj);
  const pMannat = await profileOf(bizMannat);
  const pRoshan = await profileOf(bizRoshan);
  const pJag    = await profileOf(bizJag);
  const pRahul  = await profileOf(bizRahul);

  const loc = (profile, user) => ({
    address: profile?.address || user?.location?.address || "Noida, UP",
    city:    profile?.city    || "Noida",
    state:   "Uttar Pradesh",
    coordinates: {
      lat: profile?.latitude  || user?.location?.coordinates?.lat || 28.5355,
      lng: profile?.longitude || user?.location?.coordinates?.lng || 77.3910,
    },
  });

  /**
   * We create food ONLY for businesses that actually exist.
   * Quantities are realistic: a restaurant produces 20–80 servings of surplus.
   * Prices are real Delhi-NCR market rates (NGOs get it free, businesses at ~15–20% of original).
   */
  const foodDefs = [
    // ── Amrik Sukhdev (restaurant) ─────────────────────────
    {
      biz: bizAmrik, prof: pAmrik,
      name: "Amritsari Dal Makhani & Naan",
      desc: "Slow-cooked overnight dal makhani with 2 butter naans. Daily kitchen surplus from lunch service.",
      cat: "Prepared Meals", qty: 35, unit: "plates", price: 0, orig: 280,
      img: IMG.curry, expiryHrs: 5, status: "AVAILABLE",
    },
    {
      biz: bizAmrik, prof: pAmrik,
      name: "Paneer Tikka & Roti Platter",
      desc: "Tandoor-grilled paneer tikka with 3 rotis and mint chutney. Evening surplus.",
      cat: "Prepared Meals", qty: 20, unit: "plates", price: 0, orig: 320,
      img: IMG.snacks, expiryHrs: 4, status: "AVAILABLE",
    },
    // ── TAJ Restaurant ─────────────────────────────────────
    {
      biz: bizTaj, prof: pTaj,
      name: "Veg Biryani with Raita",
      desc: "Fragrant basmati veg biryani with saffron, dry fruits, and boondi raita.",
      cat: "Prepared Meals", qty: 40, unit: "boxes", price: 0, orig: 250,
      img: IMG.biryani, expiryHrs: 6, status: "AVAILABLE",
    },
    {
      biz: bizTaj, prof: pTaj,
      name: "Gulab Jamun & Kheer Pack",
      desc: "Classic Indian dessert combo — 3 gulab jamuns and 200ml kheer. Post-service surplus.",
      cat: "Bakery & Pastries", qty: 50, unit: "boxes", price: 0, orig: 120,
      img: IMG.sweets, expiryHrs: 8, status: "AVAILABLE",
    },
    // ── Mannat Haveli ──────────────────────────────────────
    {
      biz: bizMannat, prof: pMannat,
      name: "Haveli Special Thali",
      desc: "Complete thali — dal, 2 sabzis, rice, 2 rotis, pickle and papad. Weekend lunch surplus.",
      cat: "Prepared Meals", qty: 30, unit: "plates", price: 0, orig: 350,
      img: IMG.thali, expiryHrs: 5, status: "AVAILABLE",
    },
    {
      biz: bizMannat, prof: pMannat,
      name: "Lassi & Bread Pakora Bundle",
      desc: "Fresh sweet lassi (300ml) paired with 2 crispy bread pakoras.",
      cat: "Beverages", qty: 40, unit: "items", price: 0, orig: 90,
      img: IMG.snacks, expiryHrs: 3, status: "EXPIRING_SOON",
    },
    // ── Roshankumarslce ────────────────────────────────────
    {
      biz: bizRoshan, prof: pRoshan,
      name: "Chana Masala & Puri",
      desc: "Spiced chana masala with 3 fluffy puris. Morning breakfast surplus.",
      cat: "Prepared Meals", qty: 25, unit: "plates", price: 0, orig: 140,
      img: IMG.curry, expiryHrs: 4, status: "AVAILABLE",
    },
    {
      biz: bizRoshan, prof: pRoshan,
      name: "Assorted Mithai Box",
      desc: "Mixed Indian sweets — barfi, ladoo, peda (500g box). Festive season surplus.",
      cat: "Bakery & Pastries", qty: 30, unit: "boxes", price: 0, orig: 300,
      img: IMG.sweets, expiryHrs: 24, status: "AVAILABLE",
    },
    // ── Jagdambe ───────────────────────────────────────────
    {
      biz: bizJag, prof: pJag,
      name: "Rajma Chawal Box",
      desc: "Home-style kidney bean curry with steamed basmati rice and pickle.",
      cat: "Prepared Meals", qty: 45, unit: "boxes", price: 0, orig: 180,
      img: IMG.curry, expiryHrs: 5, status: "AVAILABLE",
    },
    {
      biz: bizJag, prof: pJag,
      name: "Pav Bhaji Platter",
      desc: "Mumbai-style pav bhaji — 4 pav with extra butter and masala bhaji.",
      cat: "Catering Surplus", qty: 35, unit: "plates", price: 0, orig: 160,
      img: IMG.snacks, expiryHrs: 4, status: "AVAILABLE",
    },
    // ── Rahul Sharma (PARTY / event) ───────────────────────
    {
      biz: bizRahul, prof: pRahul,
      name: "Post-Wedding Veg Buffet Surplus",
      desc: "Leftover from Rahul Sharma's wedding reception held today. Full vegetarian menu — paneer makhani, dal, biryani, raita, 3 desserts. Cooked for 300 guests at a registered venue. Packed hygienically within 2 hours of event end.",
      cat: "Catering Surplus", qty: 80, unit: "plates", price: 0, orig: 400,
      img: IMG.event, expiryHrs: 5, status: "AVAILABLE",
    },
    {
      biz: bizRahul, prof: pRahul,
      name: "Wedding Dessert Table — Sweets & Pastries",
      desc: "Assorted wedding desserts — gulab jamun, barfi, chocolate mousse cups, fruit tarts. Wrapped in food-grade packaging. Surplus from 300-guest event.",
      cat: "Bakery & Pastries", qty: 60, unit: "items", price: 0, orig: 180,
      img: IMG.cake, expiryHrs: 7, status: "AVAILABLE",
    },
    // ── Party donors (Sharma, TechCorp, Gupta, Verma) ─────
    // These will be created as new party users since we deleted them —
    // recreate 3 clean ones (not 4 to keep it lean)
    // created below after this array
  ];

  // Filter out nulls (business might be null if not in DB)
  const validFoodDefs = foodDefs.filter(f => f.biz !== null && f.biz !== undefined);

  const foodDocs = [];
  for (let i = 0; i < validFoodDefs.length; i++) {
    const fd = validFoodDefs[i];
    const f = await Food.create({
      businessId: fd.biz._id,
      name: fd.name, description: fd.desc, category: fd.cat,
      quantity: fd.qty, quantityUnit: fd.unit,
      preparationTime: days(-0.3),
      expiryTime: hrs(fd.expiryHrs),
      price: fd.price, originalPrice: fd.orig,
      image: fd.img, status: fd.status,
      pickupLocation: loc(fd.prof, fd.biz),
    });
    foodDocs.push({ food: f, biz: fd.biz });
    console.log(`  ✅ Food ${i + 1}/${validFoodDefs.length}: "${fd.name}" (${fd.qty} ${fd.unit})`);
  }

  /* ═══════════ PHASE 5: PARTY FOOD (3 clean event donors) ═ */
  console.log("\n━━━━ PHASE 5: 3 Event/Party surplus listings ━━━━━━━━━\n");

  const partyDonors = [
    {
      name: "Kapoor Family Wedding",
      email: "kapoor.wedding@gmail.com",
      phone: "+91 98200 11111",
      aadhaar: "3456 7890 1234",
      address: "Leela Palace Banquet, Sector 44, Noida",
      city: "Noida", pincode: "201301",
      lat: 28.6090, lng: 77.3425,
      eventCard: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80",
      food: {
        name: "Kapoor Wedding — Non-Veg Dinner Surplus",
        desc: "Post-wedding dinner surplus from 400-guest ceremony at Leela Palace. Chicken handi, mutton rogan josh, fish curry, mixed veg, dal fry, rice, 4 rotis per pack. All packed within 2 hours in food-grade containers by the catering team.",
        cat: "Catering Surplus", qty: 100, unit: "plates",
        price: 0, orig: 450, img: IMG.catering, expiryHrs: 4,
      },
    },
    {
      name: "InnovateTech Annual Dinner",
      email: "hr@innovatetech-noida.com",
      phone: "+91 98200 22222",
      aadhaar: "FGHIJ5678K",
      address: "Sector 135, Noida (IT Hub)",
      city: "Noida", pincode: "201304",
      lat: 28.5405, lng: 77.3310,
      eventCard: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80",
      food: {
        name: "Corporate Annual Dinner — Premium Snack Boxes",
        desc: "Annual dinner surplus from InnovateTech's 250-person company event. Premium snack boxes with mini sandwiches, spring rolls, paneer tikka, dessert cup, and fresh juice. Catered by Taj Caterers.",
        cat: "Catering Surplus", qty: 50, unit: "boxes",
        price: 0, orig: 500, img: IMG.party1, expiryHrs: 5,
      },
    },
    {
      name: "Sharma Family 25th Anniversary",
      email: "sharma.anni25@gmail.com",
      phone: "+91 98200 33333",
      aadhaar: "6789 0123 4567",
      address: "Grand Ballroom, Sector 32, Noida",
      city: "Noida", pincode: "201301",
      lat: 28.5700, lng: 77.3250,
      eventCard: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&q=80",
      food: {
        name: "Anniversary Celebration Dessert Platter",
        desc: "25th anniversary celebration surplus desserts — 3-tier cake slices (chocolate, vanilla, strawberry), gulab jamun, rasgulla, dry fruit barfi, and macarons. Cooked fresh by Sugarcraft Bakery.",
        cat: "Bakery & Pastries", qty: 70, unit: "items",
        price: 0, orig: 200, img: IMG.cake, expiryHrs: 8,
      },
    },
  ];

  const partyFoodDocs = [];
  for (const pd of partyDonors) {
    let u = await User.findOne({ email: pd.email });
    if (!u) {
      u = await User.create({
        firebaseUid: `party_clean_${pd.email.split("@")[0]}_${Date.now()}`,
        name: pd.name, email: pd.email, role: "BUSINESS", businessType: "PARTY",
        phone: pd.phone, profileImage: pd.eventCard,
        isVerified: true, impactCredits: 0, trustScore: 95,
        totalCompletedOrders: 0, totalFoodRescuedKg: 0, rewardLevel: "NEW",
        location: { address: pd.address, city: pd.city, state: "Uttar Pradesh", pincode: pd.pincode, coordinates: { lat: pd.lat, lng: pd.lng } },
      });
    }
    let bp = await BusinessProfile.findOne({ userId: u._id });
    if (!bp) {
      bp = await BusinessProfile.create({
        userId: u._id, businessName: pd.name, businessType: "PARTY",
        description: pd.food.desc.substring(0, 150),
        phone: pd.phone, address: pd.address, city: pd.city,
        state: "Uttar Pradesh", pincode: pd.pincode,
        latitude: pd.lat, longitude: pd.lng,
        profileImage: pd.eventCard,
        registrationNumber: pd.aadhaar,
        eventCardImage: pd.eventCard,
        isVerified: true,
      });
    }
    const f = await Food.create({
      businessId: u._id,
      name: pd.food.name, description: pd.food.desc,
      category: pd.food.cat, quantity: pd.food.qty,
      quantityUnit: pd.food.unit, preparationTime: days(-0.2),
      expiryTime: hrs(pd.food.expiryHrs),
      price: pd.food.price, originalPrice: pd.food.orig,
      image: pd.food.img, status: "AVAILABLE",
      pickupLocation: { address: pd.address, city: pd.city, state: "Uttar Pradesh", coordinates: { lat: pd.lat, lng: pd.lng } },
    });
    partyFoodDocs.push({ food: f, biz: u });
    console.log(`  ✅ Party food: "${pd.food.name}" (${pd.food.qty} ${pd.food.unit})`);
  }

  const allFood = [...foodDocs, ...partyFoodDocs];

  /* ═══════════ PHASE 6: REALISTIC RESERVATIONS ═════════════ */
  console.log("\n━━━━ PHASE 6: Creating realistic purchase history ━━━━━\n");

  /**
   * Impact maths (realistic):
   *  - 1 plate/box of food ≈ 350–450g
   *  - We use 400g = 0.4 kg per unit as standard
   *  - 10 impact credits per kg rescued
   *  - Business donor earns 50% of recipient credits
   */
  const KG_PER_UNIT   = 0.4;
  const CREDITS_PER_KG = 10;

  // Helper: create a reservation + ledger + update stats
  async function makeReservation({ food, biz, ngo, qty, status, daysAgo }) {
    const reservedAt  = days(-daysAgo);
    const completedAt = status === "COMPLETED" ? days(-daysAgo + 0.5) : undefined;
    const cancelledAt = status === "CANCELLED" ? days(-daysAgo + 0.3) : undefined;

    const res = await Reservation.create({
      foodId: food._id, recipientId: ngo._id, businessId: biz._id,
      quantity: qty, totalPrice: 0, claimCode: code(),
      status, reservedAt, pickupTime: "Today before 8:30 PM",
      ...(completedAt && { completedAt }),
      ...(cancelledAt && { cancelledAt }),
    });

    if (status === "COMPLETED") {
      const kgRescued     = Math.round(qty * KG_PER_UNIT * 10) / 10;
      const ngoCredits    = Math.round(kgRescued * CREDITS_PER_KG);
      const donorCredits  = Math.round(ngoCredits * 0.5);

      // ImpactLedger — NGO
      try {
        await ImpactLedger.create({
          userId: ngo._id, reservationId: res._id, type: "EARNED",
          amount: ngoCredits,
          reason: `Food rescued: ${qty} ${food.quantityUnit} of "${food.name}" (${kgRescued} kg)`,
          metadata: { foodName: food.name, kgRescued, qty, donorType: food.category === "Catering Surplus" ? "EVENT" : "RESTAURANT" },
        });
      } catch (_) {}

      // ImpactLedger — Business donor
      try {
        await ImpactLedger.create({
          userId: biz._id, reservationId: res._id, type: "EARNED",
          amount: donorCredits,
          reason: `Surplus donated: "${food.name}" to ${ngo.name || ngo.organizationName}`,
          metadata: { foodName: food.name, kgRescued, recipientName: ngo.name },
        });
      } catch (_) {}

      // Update stats
      await User.findByIdAndUpdate(ngo._id, { $inc: { impactCredits: ngoCredits, totalFoodRescuedKg: kgRescued, totalCompletedOrders: 1 } });
      await User.findByIdAndUpdate(biz._id, { $inc: { impactCredits: donorCredits, totalFoodRescuedKg: kgRescued, totalCompletedOrders: 1 } });

      return { kgRescued, ngoCredits, donorCredits };
    }
    return { kgRescued: 0, ngoCredits: 0, donorCredits: 0 };
  }

  // Map food by name for easy lookup
  const foodByName = {};
  allFood.forEach(({ food, biz }) => { foodByName[food.name] = { food, biz }; });

  // ngo@gmail.com = Noida Food Bank (most active)
  const ngoMain2 = await User.findOne({ email: "ngo@gmail.com" });
  const ngoAnjali = allNGOs.find(u => u.email === "anjali@annadata.ngo") || await User.findOne({ email: "anjali@annadata.ngo" });
  const ngoIrfan  = allNGOs.find(u => u.email === "irfan@khanagharna.org") || await User.findOne({ email: "irfan@khanagharna.org" });
  const ngoGoonj  = allNGOs.find(u => u.email === "noida@goonj.org") || await User.findOne({ email: "noida@goonj.org" });

  // Build reservation plan — realistic quantities and history
  const resPlan = [
    // Noida Food Bank (ngo@gmail.com) — most active
    ...(allFood[0]  ? [{ ...allFood[0],  ngo: ngoMain2, qty: 25, status: "COMPLETED",        daysAgo: 7  }] : []),
    ...(allFood[1]  ? [{ ...allFood[1],  ngo: ngoMain2, qty: 15, status: "COMPLETED",        daysAgo: 5  }] : []),
    ...(allFood[2]  ? [{ ...allFood[2],  ngo: ngoMain2, qty: 30, status: "COMPLETED",        daysAgo: 3  }] : []),
    ...(allFood[3]  ? [{ ...allFood[3],  ngo: ngoMain2, qty: 40, status: "COMPLETED",        daysAgo: 2  }] : []),
    ...(allFood[8]  ? [{ ...allFood[8],  ngo: ngoMain2, qty: 35, status: "CONFIRMED",        daysAgo: 0  }] : []),
    ...(allFood[9]  ? [{ ...allFood[9],  ngo: ngoMain2, qty: 25, status: "PENDING",          daysAgo: 0  }] : []),
    // Party food — Noida Food Bank buys all party surplus
    ...(partyFoodDocs[0] ? [{ ...partyFoodDocs[0], ngo: ngoMain2, qty: 80,  status: "COMPLETED",  daysAgo: 4 }] : []),
    ...(partyFoodDocs[1] ? [{ ...partyFoodDocs[1], ngo: ngoMain2, qty: 50,  status: "COMPLETED",  daysAgo: 2 }] : []),
    ...(partyFoodDocs[2] ? [{ ...partyFoodDocs[2], ngo: ngoMain2, qty: 60,  status: "CONFIRMED",  daysAgo: 0 }] : []),

    // Annadata Foundation (anjali)
    ...(allFood[4]  ? [{ ...allFood[4],  ngo: ngoAnjali, qty: 20, status: "COMPLETED",       daysAgo: 6  }] : []),
    ...(allFood[5]  ? [{ ...allFood[5],  ngo: ngoAnjali, qty: 30, status: "COMPLETED",       daysAgo: 3  }] : []),
    ...(allFood[6]  ? [{ ...allFood[6],  ngo: ngoAnjali, qty: 20, status: "PENDING",         daysAgo: 0  }] : []),
    // Rahul's wedding event food — Anjali also takes desserts
    ...(allFood[11] ? [{ ...allFood[11], ngo: ngoAnjali, qty: 40, status: "COMPLETED",       daysAgo: 2  }] : []),

    // Khana Ghar Foundation (irfan)
    ...(allFood[7]  ? [{ ...allFood[7],  ngo: ngoIrfan,  qty: 20, status: "COMPLETED",       daysAgo: 5  }] : []),
    ...(allFood[10] ? [{ ...allFood[10], ngo: ngoIrfan,  qty: 60, status: "COMPLETED",       daysAgo: 4  }] : []),
    ...(allFood[11] ? [{ ...allFood[11], ngo: ngoIrfan,  qty: 20, status: "CONFIRMED",       daysAgo: 1  }] : []),

    // Goonj Foundation
    ...(allFood[0]  ? [{ ...allFood[0],  ngo: ngoGoonj,  qty: 10, status: "COMPLETED",       daysAgo: 10 }] : []),
    ...(allFood[2]  ? [{ ...allFood[2],  ngo: ngoGoonj,  qty: 10, status: "COMPLETED",       daysAgo: 8  }] : []),
  ];

  let grandKg = 0, grandCredits = 0, totalRes = 0;
  for (const r of resPlan) {
    if (!r.food || !r.ngo || !r.biz) continue;
    const result = await makeReservation(r);
    grandKg      += result.kgRescued;
    grandCredits += result.ngoCredits;
    totalRes++;
    const icon = r.status === "COMPLETED" ? "✅" : r.status === "CONFIRMED" ? "🟡" : "🔵";
    console.log(`  ${icon} [${r.status.padEnd(16)}] ${(r.ngo.name||"NGO").split(" ")[0].padEnd(10)} ← "${r.food.name.substring(0,35)}"`);
  }

  /* ═══════════ PHASE 7: REWARDLEVEL UPDATE ══════════════════ */
  const updateReward = async (userId) => {
    const u = await User.findById(userId).lean();
    if (!u) return;
    const lvl = u.impactCredits >= 1000 ? "REPLATE_CHAMPION"
              : u.impactCredits >= 500  ? "GOLD"
              : u.impactCredits >= 200  ? "SILVER"
              : u.impactCredits >= 50   ? "BRONZE" : "NEW";
    await User.findByIdAndUpdate(userId, { $set: { rewardLevel: lvl } });
  };
  const allUpdatableIds = [...allNGOs, bizAmrik, bizTaj, bizMannat, bizRoshan, bizJag, bizRahul, ...partyDonors.map(() => null)]
    .filter(Boolean).map(u => u._id);
  for (const id of allUpdatableIds) await updateReward(id);

  /* ═══════════ FINAL SUMMARY ════════════════════════════════ */
  const finalUsers  = await User.countDocuments();
  const finalFoods  = await Food.countDocuments();
  const finalRes    = await Reservation.countDocuments();
  const finalLedger = await ImpactLedger.countDocuments();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Clean + Reseed COMPLETE\n");
  console.log(`  Users         : ${finalUsers}  (real accounts only)`);
  console.log(`  Foods         : ${finalFoods}  (all with valid business links)`);
  console.log(`  Reservations  : ${finalRes}`);
  console.log(`  Impact Ledger : ${finalLedger} entries`);
  console.log(`  Food rescued  : ${Math.round(grandKg * 10) / 10} kg  (across completed orders)`);
  console.log(`  Credits issued: ${grandCredits}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("❌ clean_reseed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
