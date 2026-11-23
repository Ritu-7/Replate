/**
 * Seed: 5 Event/Party surplus food listings + NGO purchase
 * Run: node server/scripts/seed_party_food.js
 *
 * - Reuses existing PARTY user: Rahul (r2@gmail.com)
 * - Creates 4 more Event/Party donors
 * - Creates 5 food listings (one per party)
 * - ngo@gmail.com (Noida Food Bank) purchases all 5
 * - ImpactLedger entries for completed orders
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User             = require("../models/User");
const BusinessProfile  = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");
const Food             = require("../models/Food");
const Reservation      = require("../models/Reservation");
const ImpactLedger     = require("../models/ImpactLedger");

const rndCode = () => `RPL-${Math.floor(100000 + Math.random() * 900000)}`;
const days    = (n) => new Date(Date.now() + n * 86_400_000);
const hrs     = (n) => new Date(Date.now() + n * 3_600_000);

/* ── Real event / wedding food images ───────────────────── */
const PARTY_FOOD_IMGS = [
  "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80", // wedding buffet spread
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80", // catering trays
  "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",   // dessert table
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&q=80", // event food display
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80", // party spread
];

const PARTY_HOST_IMGS = [
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80", // wedding decor
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80", // birthday party
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80", // corporate event
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80", // reception
];

/* ═══════════════════════════════════════════════════════════ */
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ MongoDB connected\n");

  /* ── Load existing PARTY user (Rahul) ─────────────────── */
  const rahul = await User.findOne({ email: "r2@gmail.com", businessType: "PARTY" });
  const rahulProfile = rahul
    ? await BusinessProfile.findOne({ userId: rahul._id })
    : null;

  if (!rahul) {
    console.error("❌ Existing PARTY user r2@gmail.com not found. Check DB.");
    process.exit(1);
  }
  console.log(`Found existing party host: ${rahul.name} (${rahul.email})`);

  /* ── Create 4 more Event/Party donor users ─────────────── */
  const newPartyDonors = [
    {
      name: "Sharma Family Wedding",
      email: "sharma.wedding2024@gmail.com",
      phone: "+91 98100 11111",
      aadhaar: "2345 6789 0123",
      address: "Hotel Royal Park, Sector 61, Noida",
      city: "Noida", pincode: "201301",
      lat: 28.6185, lng: 77.3651,
      desc: "Post-wedding reception surplus. Full vegetarian menu cooked for 500 guests.",
      imgIdx: 0,
      eventCardImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80",
    },
    {
      name: "TechCorp Annual Day 2024",
      email: "events@techcorp-noida.com",
      phone: "+91 98100 22222",
      aadhaar: "ABCDE1234F",           // PAN format
      address: "Sector 135, Noida (IT Park)",
      city: "Noida", pincode: "201304",
      lat: 28.5405, lng: 77.3310,
      desc: "Corporate annual day banquet surplus — high-quality catered food.",
      imgIdx: 1,
      eventCardImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80",
    },
    {
      name: "Gupta Birthday Celebration",
      email: "gupta.birthday@gmail.com",
      phone: "+91 98100 33333",
      aadhaar: "5678 9012 3456",
      address: "Lotus Banquet Hall, Sector 32, Noida",
      city: "Noida", pincode: "201301",
      lat: 28.5700, lng: 77.3250,
      desc: "50th birthday party surplus — desserts, snacks, and main course.",
      imgIdx: 2,
      eventCardImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&q=80",
    },
    {
      name: "Verma Family Reception",
      email: "verma.reception@gmail.com",
      phone: "+91 98100 44444",
      aadhaar: "8901 2345 6789",
      address: "Garden Villa Resort, Sector 44, Noida",
      city: "Noida", pincode: "201301",
      lat: 28.6090, lng: 77.3425,
      desc: "Wedding reception leftover food — both veg and non-veg dishes available.",
      imgIdx: 3,
      eventCardImage: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80",
    },
  ];

  const partyUsers   = [rahul];
  const partyProfiles = [rahulProfile];

  for (let i = 0; i < newPartyDonors.length; i++) {
    const pd = newPartyDonors[i];
    const fakeUid = `party_seed_${i + 2}_${Date.now()}`;

    let u = await User.findOne({ email: pd.email });
    if (u) {
      console.log(`⚠️  Party host already exists: ${pd.email}, reusing.`);
    } else {
      u = await User.create({
        firebaseUid: fakeUid,
        name: pd.name,
        email: pd.email,
        role: "BUSINESS",
        businessType: "PARTY",
        phone: pd.phone,
        profileImage: PARTY_HOST_IMGS[pd.imgIdx] || PARTY_HOST_IMGS[0],
        isVerified: true,
        impactCredits: 50 + i * 20,
        trustScore: 95,
        totalCompletedOrders: 0,
        totalFoodRescuedKg: 0,
        rewardLevel: "NEW",
        location: {
          address: pd.address,
          city: pd.city,
          state: "Uttar Pradesh",
          pincode: pd.pincode,
          coordinates: { lat: pd.lat, lng: pd.lng },
        },
      });
    }
    partyUsers.push(u);

    let bp = await BusinessProfile.findOne({ userId: u._id });
    if (!bp) {
      bp = await BusinessProfile.create({
        userId: u._id,
        businessName: pd.name,
        businessType: "PARTY",
        description: pd.desc,
        phone: pd.phone,
        address: pd.address,
        city: pd.city,
        state: "Uttar Pradesh",
        pincode: pd.pincode,
        latitude: pd.lat,
        longitude: pd.lng,
        profileImage: PARTY_HOST_IMGS[pd.imgIdx] || PARTY_HOST_IMGS[0],
        registrationNumber: pd.aadhaar,
        eventCardImage: pd.eventCardImage,
        isVerified: true,
      });
    }
    partyProfiles.push(bp);
    console.log(`✅ Party Host ${i + 2}/5: ${pd.name} (${pd.email})`);
  }

  /* ── 5 Food listings — one per party host ──────────────── */
  const foodDefs = [
    {
      // Rahul's existing event
      name: "Post-Wedding Dal Makhani & Naan",
      desc: "Leftover from Rahul's wedding reception — rich dal makhani, 4 types of naan, and mixed veg curry. Cooked fresh today morning, packed hygienically.",
      cat: "Catering Surplus",
      qty: 80, unit: "plates",
      price: 0, orig: 350,
      partyIdx: 0,
      expiryHrs: 5,
    },
    {
      name: "Sharma Wedding Veg Buffet Surplus",
      desc: "Post-wedding vegetarian buffet — paneer dishes, dal, biryani, raita, salads, and assorted sweets. Cooked for 500 guests, significant surplus remains.",
      cat: "Catering Surplus",
      qty: 120, unit: "plates",
      price: 0, orig: 400,
      partyIdx: 1,
      expiryHrs: 4,
    },
    {
      name: "TechCorp Annual Day Snack Boxes",
      desc: "Corporate event catering surplus — premium snack boxes with sandwiches, samosas, spring rolls, and dessert cups.",
      cat: "Catering Surplus",
      qty: 60, unit: "boxes",
      price: 0, orig: 500,
      partyIdx: 2,
      expiryHrs: 6,
    },
    {
      name: "Gupta Birthday Dessert Platter",
      desc: "50th birthday party dessert surplus — pastries, gulab jamun, chocolate mousse cups, and fresh fruit tarts.",
      cat: "Bakery & Pastries",
      qty: 70, unit: "items",
      price: 0, orig: 180,
      partyIdx: 3,
      expiryHrs: 7,
    },
    {
      name: "Verma Reception Mixed Non-Veg Platter",
      desc: "Wedding reception surplus — chicken handi, mutton curry, mixed veg, dal fry, and rice. Packed in food-grade containers.",
      cat: "Catering Surplus",
      qty: 100, unit: "plates",
      price: 0, orig: 450,
      partyIdx: 4,
      expiryHrs: 4,
    },
  ];

  const foodDocs = [];
  for (let i = 0; i < foodDefs.length; i++) {
    const fd = foodDefs[i];
    const partyUser    = partyUsers[fd.partyIdx];
    const partyProfile = partyProfiles[fd.partyIdx];

    const food = await Food.create({
      businessId: partyUser._id,
      name: fd.name,
      description: fd.desc,
      category: fd.cat,
      quantity: fd.qty,
      quantityUnit: fd.unit,
      preparationTime: days(-0.5),          // prepared half a day ago
      expiryTime: hrs(fd.expiryHrs),
      price: fd.price,
      originalPrice: fd.orig,
      image: PARTY_FOOD_IMGS[i],
      status: "AVAILABLE",
      pickupLocation: {
        address: partyProfile?.address || partyUser.location?.address || "Noida",
        city:    partyProfile?.city    || "Noida",
        state: "Uttar Pradesh",
        coordinates: {
          lat: partyProfile?.latitude  || partyUser.location?.coordinates?.lat || 28.5355,
          lng: partyProfile?.longitude || partyUser.location?.coordinates?.lng || 77.3910,
        },
      },
    });
    foodDocs.push(food);
    console.log(`✅ Food ${i + 1}/5: "${fd.name}" (qty: ${fd.qty} ${fd.unit})`);
  }

  /* ── NGO purchase: ngo@gmail.com buys all 5 ───────────── */
  const ngoUser = await User.findOne({ email: "ngo@gmail.com" });
  if (!ngoUser) {
    console.error("❌ ngo@gmail.com not found. Run seed_ngo_purchases.js first.");
    process.exit(1);
  }
  console.log(`\nNGO purchasing all 5 listings: ${ngoUser.name} (${ngoUser.email})\n`);

  // Status spread: 3 COMPLETED (past), 1 CONFIRMED (today), 1 PENDING (just now)
  const resStatuses = ["COMPLETED", "COMPLETED", "COMPLETED", "CONFIRMED", "PENDING"];
  const resDaysAgo  = [5, 3, 1, 0, 0];

  let totalCreditsEarned = 0;
  let totalKgRescued = 0;
  let completedCount = 0;

  for (let i = 0; i < foodDocs.length; i++) {
    const food       = foodDocs[i];
    const partyUser  = partyUsers[foodDefs[i].partyIdx];
    const status     = resStatuses[i];
    const daysAgo    = resDaysAgo[i];

    const reservedAt  = days(-daysAgo);
    const completedAt = status === "COMPLETED" ? days(-daysAgo + 0.5) : undefined;

    const reservation = await Reservation.create({
      foodId:      food._id,
      recipientId: ngoUser._id,
      businessId:  partyUser._id,
      quantity:    food.quantity,  // NGO takes the entire listing
      totalPrice:  0,              // NGO benefit — always free
      claimCode:   rndCode(),
      status,
      reservedAt,
      pickupTime: "Today before 8:00 PM",
      ...(completedAt && { completedAt }),
    });

    // ImpactLedger for COMPLETED orders
    if (status === "COMPLETED") {
      const kgRescued     = Math.round(food.quantity * 0.4 * 10) / 10; // ~400g per plate/item
      const creditsEarned = Math.round(kgRescued * 10);

      // NGO credit
      try {
        await ImpactLedger.create({
          userId:        ngoUser._id,
          reservationId: reservation._id,
          type:          "EARNED",
          amount:        creditsEarned,
          reason:        `Event surplus rescued: ${food.quantity} ${food.quantityUnit} of "${food.name}" from ${partyUser.name}`,
          metadata:      { foodName: food.name, kgRescued, qty: food.quantity, donorType: "PARTY" },
        });
      } catch (e) { console.warn("  Ledger skip (dup):", e.message); }

      // Party host donor credit
      try {
        await ImpactLedger.create({
          userId:        partyUser._id,
          reservationId: reservation._id,
          type:          "EARNED",
          amount:        Math.round(creditsEarned * 0.6),
          reason:        `Event food donated: "${food.name}" to ${ngoUser.name}`,
          metadata:      { foodName: food.name, kgRescued, recipientName: ngoUser.name },
        });
      } catch (e) { /* skip */ }

      // Update party host stats
      await User.findByIdAndUpdate(partyUser._id, {
        $inc: {
          impactCredits:        Math.round(creditsEarned * 0.6),
          totalFoodRescuedKg:   kgRescued,
          totalCompletedOrders: 1,
        },
        $set: { rewardLevel: creditsEarned > 500 ? "GOLD" : "SILVER" },
      });

      totalCreditsEarned += creditsEarned;
      totalKgRescued     += kgRescued;
      completedCount++;
    }

    const statusIcon = status === "COMPLETED" ? "✅" : status === "CONFIRMED" ? "🟡" : "🔵";
    console.log(`${statusIcon} Reservation ${i + 1}/5: [${status.padEnd(16)}] "${food.name.substring(0, 40)}" — ${food.quantity} ${food.quantityUnit}`);
  }

  // Update NGO (ngo@gmail.com) cumulative stats
  if (completedCount > 0) {
    const rewardLevel = (ngoUser.impactCredits + totalCreditsEarned) >= 1000
      ? "REPLATE_CHAMPION" : "GOLD";
    await User.findByIdAndUpdate(ngoUser._id, {
      $inc: {
        impactCredits:        totalCreditsEarned,
        totalFoodRescuedKg:   totalKgRescued,
        totalCompletedOrders: completedCount,
      },
      $set: { rewardLevel },
    });
  }

  /* ── Summary ─────────────────────────────────────────── */
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Event/Party seed complete!\n");
  console.log("Party Hosts (5):");
  partyUsers.forEach((u, i) => console.log(`  ${i + 1}. ${u.name} (${u.email})`));
  console.log("\nFood Listings added: 5 (all PARTY / catering surplus)");
  console.log("Reservations added : 5 (ngo@gmail.com bought all)");
  console.log(`  ✅ ${completedCount} COMPLETED  → +${totalCreditsEarned} credits, +${totalKgRescued} kg rescued`);
  console.log(`  🟡 1 CONFIRMED`);
  console.log(`  🔵 1 PENDING`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Party seed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
