/**
 * Seed Script — RePlate Admin Demo Data
 * Run with: node server/scripts/seed_dummy_data.js
 *
 * Creates:
 *  • 1 Admin user   (rinkeshbhati567@gmail.com / 12345678)
 *  • 5 Businesses   (verified, with profile images)
 *  • 3 Recipients   (verified NGOs)
 *  • 10 Food listings (with real food images)
 *  • 8 Reservations (various statuses)
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User            = require("../models/User");
const BusinessProfile = require("../models/BusinessProfile");
const RecipientProfile= require("../models/RecipientProfile");
const Food            = require("../models/Food");
const Reservation     = require("../models/Reservation");

/* ─── helpers ───────────────────────────────────────────── */
const uid  = () => new mongoose.Types.ObjectId();
const days = (n) => new Date(Date.now() + n * 86_400_000);
const hrs  = (n) => new Date(Date.now() + n * 3_600_000);
const code = () => Math.random().toString(36).slice(2,8).toUpperCase();

/* ─── curated public image URLs ─────────────────────────── */
const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",  // salad
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", // pizza
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80", // pancakes
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",  // restaurant food
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", // grilled
  "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=800&q=80", // fruit bowl
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80", // veggies
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80", // curry bowl
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&q=80", // bread/bakery
  "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80",  // burger
];

const BIZ_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80", // restaurant interior
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",  // hotel kitchen
  "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80",  // cafe
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&q=80", // bakery
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", // fine dining
];

const NGO_IMAGES = [
  "https://images.unsplash.com/photo-1593113630400-ea4288922559?w=600&q=80", // food charity
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80", // community
  "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80", // shelter
];

/* ─── seed data definitions ──────────────────────────────── */

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ MongoDB connected");

  /* ── 1. ADMIN USER ─────────────────────────────────────── */
  const adminFirebaseUid = "admin_seed_rinkesh_bhati_567";

  let adminUser = await User.findOne({ email: "rinkeshbhati567@gmail.com" });
  if (adminUser) {
    console.log("⚠️  Admin user already exists, updating to ADMIN role...");
    adminUser.role = "ADMIN";
    adminUser.isVerified = true;
    adminUser.name = "Rinkesh Bhati";
    await adminUser.save();
  } else {
    adminUser = await User.create({
      firebaseUid: adminFirebaseUid,
      name: "Rinkesh Bhati",
      email: "rinkeshbhati567@gmail.com",
      role: "ADMIN",
      phone: "+91 98765 43210",
      isVerified: true,
      impactCredits: 5000,
      trustScore: 100,
      totalCompletedOrders: 120,
      totalFoodRescuedKg: 850,
      rewardLevel: "REPLATE_CHAMPION",
      location: {
        address: "Plot 45, Sector 62, Noida",
        city: "Noida",
        state: "Uttar Pradesh",
        pincode: "201309",
        coordinates: { lat: 28.6273, lng: 77.3761 },
      },
    });
    console.log("✅ Admin user created:", adminUser.email);
  }

  /* ── 2. BUSINESS USERS ─────────────────────────────────── */
  const businesses = [
    {
      name: "Radisson Blu Noida",
      email: "partner@radissonnoida.com",
      phone: "+91 98001 12345",
      businessType: "HOTEL",
      address: "Sector 55, Noida",
      city: "Noida",
      pincode: "201301",
      description: "5-star hotel with multi-cuisine banquet facilities in Sector 55.",
      registrationNumber: "FSSAI1234567890123",
      lat: 28.6128, lng: 77.3521,
    },
    {
      name: "Haldiram's Noida",
      email: "franchise@haldirams-noida.com",
      phone: "+91 98001 23456",
      businessType: "RESTAURANT",
      address: "Sector 18, Noida",
      city: "Noida",
      pincode: "201301",
      description: "Iconic Indian sweets and snacks chain with daily catering surplus.",
      registrationNumber: "FSSAI9876543210987",
      lat: 28.5706, lng: 77.3220,
    },
    {
      name: "The Brew House Café",
      email: "hello@brewhousenoida.com",
      phone: "+91 98001 34567",
      businessType: "CAFE",
      address: "Sector 50, Noida",
      city: "Noida",
      pincode: "201301",
      description: "Artisan coffee shop with fresh pastries and sandwiches.",
      registrationNumber: "FSSAI5678901234567",
      lat: 28.6207, lng: 77.3639,
    },
    {
      name: "Sweet Crumbs Bakery",
      email: "orders@sweetcrumbs.in",
      phone: "+91 98001 45678",
      businessType: "BAKERY",
      address: "Sector 76, Noida",
      city: "Noida",
      pincode: "201304",
      description: "Premium bakery specialising in cakes, breads, and pastries.",
      registrationNumber: "FSSAI3456789012345",
      lat: 28.5862, lng: 77.3680,
    },
    {
      name: "Spice Route Cloud Kitchen",
      email: "ops@spiceroute.cloud",
      phone: "+91 98001 56789",
      businessType: "CLOUD_KITCHEN",
      address: "Sector 63, Noida",
      city: "Noida",
      pincode: "201301",
      description: "Multi-brand cloud kitchen delivering North Indian and Chinese cuisine.",
      registrationNumber: "FSSAI7890123456789",
      lat: 28.6273, lng: 77.3797,
    },
  ];

  const bizUsers = [];
  const bizProfiles = [];

  for (let i = 0; i < businesses.length; i++) {
    const biz = businesses[i];
    const fakeUid = `biz_seed_uid_${i + 1}_${Date.now()}`;

    let u = await User.findOne({ email: biz.email });
    if (!u) {
      u = await User.create({
        firebaseUid: fakeUid,
        name: biz.name,
        email: biz.email,
        role: "BUSINESS",
        phone: biz.phone,
        profileImage: BIZ_IMAGES[i],
        isVerified: true,
        impactCredits: 200 + i * 150,
        trustScore: 95 - i,
        totalCompletedOrders: 30 + i * 10,
        totalFoodRescuedKg: 80 + i * 25,
        rewardLevel: i < 2 ? "REPLATE_CHAMPION" : "GOLD",
        location: {
          address: biz.address,
          city: biz.city,
          state: "Uttar Pradesh",
          pincode: biz.pincode,
          coordinates: { lat: biz.lat, lng: biz.lng },
        },
      });
    }
    bizUsers.push(u);

    let bp = await BusinessProfile.findOne({ userId: u._id });
    if (!bp) {
      bp = await BusinessProfile.create({
        userId: u._id,
        businessName: biz.name,
        businessType: biz.businessType,
        description: biz.description,
        phone: biz.phone,
        address: biz.address,
        city: biz.city,
        state: "Uttar Pradesh",
        pincode: biz.pincode,
        latitude: biz.lat,
        longitude: biz.lng,
        profileImage: BIZ_IMAGES[i],
        registrationNumber: biz.registrationNumber,
        isVerified: true,
      });
    }
    bizProfiles.push(bp);
    console.log(`✅ Business ${i + 1}/5: ${biz.name}`);
  }

  /* ── 3. RECIPIENT / NGO USERS ──────────────────────────── */
  const recipients = [
    {
      name: "Goonj Foundation Noida",
      email: "noida@goonj.org",
      phone: "+91 98002 11111",
      orgName: "Goonj Foundation",
      address: "Sector 15A, Noida",
      city: "Noida",
      pincode: "201301",
      regNumber: "NGO-MH-2003-0001234",
      description: "National NGO rescuing food and clothing for underserved communities.",
      lat: 28.5852, lng: 77.3139,
    },
    {
      name: "Rotary Club Noida",
      email: "secretary@rotarynoida.org",
      phone: "+91 98002 22222",
      orgName: "Rotary Club of Noida",
      address: "Sector 25, Noida",
      city: "Noida",
      pincode: "201301",
      regNumber: "NGO-UP-1998-0005678",
      description: "Community service club running daily mid-day meal programmes.",
      lat: 28.5921, lng: 77.3310,
    },
    {
      name: "Akshaya Patra NCR",
      email: "ncr@akshayapatra.org",
      phone: "+91 98002 33333",
      orgName: "Akshaya Patra Foundation",
      address: "Sector 62, Noida",
      city: "Noida",
      pincode: "201309",
      regNumber: "NGO-KA-2000-0009012",
      description: "India's largest mid-day meal NGO serving millions of school children.",
      lat: 28.6273, lng: 77.3761,
    },
  ];

  const recUsers = [];

  for (let i = 0; i < recipients.length; i++) {
    const rec = recipients[i];
    const fakeUid = `rec_seed_uid_${i + 1}_${Date.now()}`;

    let u = await User.findOne({ email: rec.email });
    if (!u) {
      u = await User.create({
        firebaseUid: fakeUid,
        name: rec.name,
        email: rec.email,
        role: "RECIPIENT",
        recipientType: "NGO",
        phone: rec.phone,
        profileImage: NGO_IMAGES[i],
        organizationName: rec.orgName,
        isVerified: true,
        impactCredits: 500 + i * 200,
        trustScore: 100,
        totalCompletedOrders: 50 + i * 20,
        totalFoodRescuedKg: 300 + i * 100,
        rewardLevel: "REPLATE_CHAMPION",
        location: {
          address: rec.address,
          city: rec.city,
          state: "Uttar Pradesh",
          pincode: rec.pincode,
          coordinates: { lat: rec.lat, lng: rec.lng },
        },
      });
    }
    recUsers.push(u);

    let rp = await RecipientProfile.findOne({ userId: u._id });
    if (!rp) {
      await RecipientProfile.create({
        userId: u._id,
        organizationName: rec.orgName,
        recipientType: "NGO",
        description: rec.description,
        phone: rec.phone,
        address: rec.address,
        city: rec.city,
        state: "Uttar Pradesh",
        pincode: rec.pincode,
        profileImage: NGO_IMAGES[i],
        registrationNumber: rec.regNumber,
        isVerified: true,
      });
    }
    console.log(`✅ Recipient ${i + 1}/3: ${rec.orgName}`);
  }

  /* ── 4. FOOD LISTINGS ──────────────────────────────────── */
  const foodItems = [
    {
      bizIdx: 0, name: "Dal Makhani & Naan Platter",
      desc: "Creamy dal makhani with 4 fresh naans. Event surplus from last evening's banquet.",
      category: "Prepared Meals", qty: 50, unit: "plates",
      price: 0, originalPrice: 350, status: "AVAILABLE",
    },
    {
      bizIdx: 0, name: "Paneer Butter Masala Combo",
      desc: "Rich paneer gravy with steamed basmati rice and salad.",
      category: "Prepared Meals", qty: 30, unit: "boxes",
      price: 50, originalPrice: 450, status: "AVAILABLE",
    },
    {
      bizIdx: 1, name: "Assorted Indian Sweets Box",
      desc: "Mixed sweets — gulab jamun, ladoo, barfi. Fresh batch from today's production.",
      category: "Bakery & Pastries", qty: 80, unit: "boxes",
      price: 30, originalPrice: 250, status: "EXPIRING_SOON",
    },
    {
      bizIdx: 1, name: "Chaat Platter — Papdi & Samosa",
      desc: "Evening surplus of crispy papdi chaat and samosas with chutneys.",
      category: "Catering Surplus", qty: 60, unit: "plates",
      price: 20, originalPrice: 150, status: "AVAILABLE",
    },
    {
      bizIdx: 2, name: "Artisan Sourdough Loaves",
      desc: "Freshly baked sourdough — mixed grain and sesame varieties.",
      category: "Bakery & Pastries", qty: 25, unit: "items",
      price: 40, originalPrice: 180, status: "AVAILABLE",
    },
    {
      bizIdx: 2, name: "Café Sandwich Assortment",
      desc: "Club sandwiches, wraps, and panini — end-of-day surplus.",
      category: "Prepared Meals", qty: 40, unit: "items",
      price: 25, originalPrice: 160, status: "EXPIRING_SOON",
    },
    {
      bizIdx: 3, name: "Celebration Cake Slices",
      desc: "Mixed flavour cake slices — chocolate fudge, vanilla, red velvet.",
      category: "Bakery & Pastries", qty: 60, unit: "items",
      price: 20, originalPrice: 120, status: "AVAILABLE",
    },
    {
      bizIdx: 3, name: "Dinner Rolls & Croissants",
      desc: "Buttery dinner rolls and flaky croissants from the morning bake.",
      category: "Bakery & Pastries", qty: 100, unit: "items",
      price: 10, originalPrice: 60, status: "AVAILABLE",
    },
    {
      bizIdx: 4, name: "Butter Chicken Rice Box",
      desc: "Cloud kitchen special — tender butter chicken with steamed basmati.",
      category: "Prepared Meals", qty: 45, unit: "boxes",
      price: 60, originalPrice: 300, status: "AVAILABLE",
    },
    {
      bizIdx: 4, name: "Veg Fried Rice & Manchurian",
      desc: "Indo-Chinese combo — veg fried rice with gobi manchurian gravy.",
      category: "Prepared Meals", qty: 35, unit: "boxes",
      price: 40, originalPrice: 220, status: "EXPIRING_SOON",
    },
  ];

  const foodDocs = [];
  for (let i = 0; i < foodItems.length; i++) {
    const fi = foodItems[i];
    const bizUser = bizUsers[fi.bizIdx];
    const bizProfile = bizProfiles[fi.bizIdx];

    const food = await Food.create({
      businessId: bizUser._id,
      name: fi.name,
      description: fi.desc,
      category: fi.category,
      quantity: fi.qty,
      quantityUnit: fi.unit,
      preparationTime: days(-1),
      expiryTime: hrs(4 + i),         // stagger expiry
      price: fi.price,
      originalPrice: fi.originalPrice,
      image: FOOD_IMAGES[i],
      status: fi.status,
      pickupLocation: {
        address: bizProfile.address,
        city: bizProfile.city,
        state: "Uttar Pradesh",
        coordinates: { lat: bizProfile.latitude, lng: bizProfile.longitude },
      },
    });
    foodDocs.push(food);
    console.log(`✅ Food ${i + 1}/10: ${fi.name}`);
  }

  /* ── 5. RESERVATIONS ───────────────────────────────────── */
  const reservationDefs = [
    { foodIdx: 0, recIdx: 0, qty: 20, status: "COMPLETED" },
    { foodIdx: 1, recIdx: 1, qty: 15, status: "CONFIRMED" },
    { foodIdx: 2, recIdx: 2, qty: 30, status: "READY_FOR_PICKUP" },
    { foodIdx: 3, recIdx: 0, qty: 25, status: "PENDING" },
    { foodIdx: 4, recIdx: 1, qty: 10, status: "COMPLETED" },
    { foodIdx: 5, recIdx: 2, qty: 20, status: "CONFIRMED" },
    { foodIdx: 6, recIdx: 0, qty: 40, status: "COMPLETED" },
    { foodIdx: 8, recIdx: 1, qty: 12, status: "PENDING" },
  ];

  for (let i = 0; i < reservationDefs.length; i++) {
    const rd  = reservationDefs[i];
    const food = foodDocs[rd.foodIdx];
    const rec  = recUsers[rd.recIdx];
    const biz  = bizUsers[food ? foodDocs[rd.foodIdx].businessId : 0];

    // find bizUser from foodDoc.businessId
    const bizUser = bizUsers.find(u => u._id.equals(food.businessId)) || bizUsers[0];

    await Reservation.create({
      foodId:       food._id,
      recipientId:  rec._id,
      businessId:   bizUser._id,
      quantity:     rd.qty,
      totalPrice:   food.price * rd.qty,
      claimCode:    code(),
      status:       rd.status,
      reservedAt:   days(-(i + 1)),
      pickupTime:   "Today before 8:30 PM",
      ...(rd.status === "COMPLETED" && { completedAt: days(-i) }),
    });
    console.log(`✅ Reservation ${i + 1}/8: ${rd.status} — ${food.name}`);
  }

  /* ── Summary ─────────────────────────────────────────────── */
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 Seed complete! Summary:");
  console.log(`  Admin   : rinkeshbhati567@gmail.com (role: ADMIN)`);
  console.log(`  Password: 12345678  ← set this in Firebase Auth manually`);
  console.log(`  Businesses : ${bizUsers.length}`);
  console.log(`  Recipients : ${recUsers.length}`);
  console.log(`  Food Items : ${foodDocs.length}`);
  console.log(`  Reservations: ${reservationDefs.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("⚠️  IMPORTANT: The admin user is seeded in MongoDB.");
  console.log("   You must also create rinkeshbhati567@gmail.com in");
  console.log("   Firebase Authentication (console.firebase.google.com)");
  console.log("   with password: 12345678 so login works end-to-end.\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
