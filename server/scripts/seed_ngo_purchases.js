/**
 * Seed Script — NGO Users + Purchase History
 * Run: node server/scripts/seed_ngo_purchases.js
 *
 * Creates:
 *  • 5 NGO users  (ngo@gmail.com + 4 more)
 *  • 5 RecipientProfiles (verified)
 *  • 15 more Food listings linked to existing businesses
 *  • 20 Reservations (mix of COMPLETED / CONFIRMED / PENDING / CANCELLED)
 *  • ImpactLedger entries for every COMPLETED order
 *  • Updates User.impactCredits / totalFoodRescuedKg / totalCompletedOrders
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User             = require("../models/User");
const BusinessProfile  = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");
const Food             = require("../models/Food");
const Reservation      = require("../models/Reservation");
const ImpactLedger     = require("../models/ImpactLedger");

/* ── helpers ───────────────────────────────────────────────── */
const days = (n) => new Date(Date.now() + n * 86_400_000);
const hrs  = (n) => new Date(Date.now() + n * 3_600_000);
const rndCode = () => `RPL-${Math.floor(100000 + Math.random() * 900000)}`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ── images ─────────────────────────────────────────────────── */
const FOOD_IMGS = [
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  "https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?w=800&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&q=80",
  "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80",
  "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80",
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80",
  "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&q=80",
  "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80",
];

const NGO_PROFILE_IMGS = [
  "https://images.unsplash.com/photo-1593113630400-ea4288922559?w=600&q=80",
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80",
  "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80",
  "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&q=80",
];

/* ═══════════════════════════════════════════════════════════ */
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ MongoDB connected\n");

  /* ── Load existing businesses to link food items ──────── */
  const bizUsers = await User.find({ role: "BUSINESS", isVerified: true }).limit(5);
  const bizProfiles = await BusinessProfile.find({
    userId: { $in: bizUsers.map(u => u._id) }
  });

  if (bizUsers.length === 0) {
    console.error("❌ No verified businesses found. Run seed_dummy_data.js first.");
    process.exit(1);
  }
  console.log(`Found ${bizUsers.length} existing businesses to link food to.\n`);

  /* ── 1. NGO USERS ─────────────────────────────────────── */
  const ngoData = [
    {
      name: "Priya Sharma (NGO Admin)",
      email: "ngo@gmail.com",
      password: "123456",           // Note: set in Firebase manually
      phone: "+91 97000 11111",
      orgName: "Noida Food Bank",
      address: "Sector 44, Noida",
      city: "Noida", pincode: "201301",
      regNumber: "NGO-UP-2015-0001001",
      desc: "City-level food bank redistributing surplus meals to daily-wage workers and migrant families.",
      lat: 28.6090, lng: 77.3425,
      imgIdx: 0,
    },
    {
      name: "Sanjay Mehta",
      email: "sanjay.ngo@helpfeed.org",
      phone: "+91 97000 22222",
      orgName: "HelpFeed India",
      address: "Sector 27, Noida",
      city: "Noida", pincode: "201301",
      regNumber: "NGO-DL-2010-0002002",
      desc: "Pan-India food rescue network with 12 collection hubs across Delhi NCR.",
      lat: 28.5940, lng: 77.3250,
      imgIdx: 1,
    },
    {
      name: "Anjali Verma",
      email: "anjali@annadata.ngo",
      phone: "+91 97000 33333",
      orgName: "Annadata Foundation",
      address: "Sector 71, Noida",
      city: "Noida", pincode: "201309",
      regNumber: "NGO-UP-2018-0003003",
      desc: "Grassroots NGO running community kitchens and nutrition programmes for urban poor.",
      lat: 28.5750, lng: 77.3680,
      imgIdx: 2,
    },
    {
      name: "Mohammed Irfan",
      email: "irfan@khanagharna.org",
      phone: "+91 97000 44444",
      orgName: "Khana Ghar Foundation",
      address: "Sector 51, Noida",
      city: "Noida", pincode: "201301",
      regNumber: "NGO-UP-2012-0004004",
      desc: "Delivers hot meals to construction site workers and homeless shelters daily.",
      lat: 28.6210, lng: 77.3650,
      imgIdx: 3,
    },
    {
      name: "Dr. Ritu Sinha",
      email: "ritu@bhojanshala.org",
      phone: "+91 97000 55555",
      orgName: "Bhojan Shala Trust",
      address: "Sector 82, Noida",
      city: "Noida", pincode: "201304",
      regNumber: "NGO-UP-2020-0005005",
      desc: "School-kitchen programme supplementing mid-day meals for 2000+ students.",
      lat: 28.5820, lng: 77.3740,
      imgIdx: 4,
    },
  ];

  const ngoUsers = [];

  for (let i = 0; i < ngoData.length; i++) {
    const nd = ngoData[i];
    const fakeUid = `ngo_seed_uid_${i + 1}_${Date.now()}`;

    let u = await User.findOne({ email: nd.email });
    if (u) {
      console.log(`⚠️  NGO already exists: ${nd.email}, reusing.`);
    } else {
      u = await User.create({
        firebaseUid: fakeUid,
        name: nd.name,
        email: nd.email,
        role: "RECIPIENT",
        recipientType: "NGO",
        phone: nd.phone,
        profileImage: NGO_PROFILE_IMGS[nd.imgIdx],
        organizationName: nd.orgName,
        isVerified: true,
        impactCredits: 0,          // will be updated after reservations
        trustScore: 100,
        totalCompletedOrders: 0,
        totalFoodRescuedKg: 0,
        rewardLevel: "NEW",
        location: {
          address: nd.address,
          city: nd.city,
          state: "Uttar Pradesh",
          pincode: nd.pincode,
          coordinates: { lat: nd.lat, lng: nd.lng },
        },
      });
    }
    ngoUsers.push(u);

    let rp = await RecipientProfile.findOne({ userId: u._id });
    if (!rp) {
      await RecipientProfile.create({
        userId: u._id,
        organizationName: nd.orgName,
        recipientType: "NGO",
        description: nd.desc,
        phone: nd.phone,
        address: nd.address,
        city: nd.city,
        state: "Uttar Pradesh",
        pincode: nd.pincode,
        profileImage: NGO_PROFILE_IMGS[nd.imgIdx],
        registrationNumber: nd.regNumber,
        isVerified: true,
      });
    }
    console.log(`✅ NGO ${i + 1}/5: ${nd.orgName} (${nd.email})`);
  }

  /* ── 2. EXTRA FOOD LISTINGS (15 more) ─────────────────── */
  const foodDefs = [
    { name: "Veg Biryani Box",         desc: "Fragrant veg biryani with raita and pickle.", cat: "Prepared Meals",    qty: 60, unit: "boxes",    price: 0,  orig: 280, bizIdx: 0 },
    { name: "Tandoori Roti Bundle",     desc: "Fresh tandoori rotis straight from the clay oven.", cat: "Bakery & Pastries", qty: 120, unit: "items", price: 5,  orig: 20,  bizIdx: 0 },
    { name: "Mixed Veg Thali",          desc: "Full thali with dal, sabzi, rice, roti, and dessert.", cat: "Prepared Meals",  qty: 40, unit: "plates",  price: 0,  orig: 320, bizIdx: 1 },
    { name: "Jalebi & Rabri",           desc: "Freshly fried jalebis with cold creamy rabri.", cat: "Bakery & Pastries", qty: 50, unit: "boxes",    price: 20, orig: 150, bizIdx: 1 },
    { name: "Cold Coffee Batch",        desc: "Chilled cold coffee — 500ml bottles, end-of-day surplus.", cat: "Beverages",        qty: 30, unit: "items",   price: 20, orig: 120, bizIdx: 2 },
    { name: "Club Sandwich Platter",    desc: "Grilled club sandwiches with coleslaw.", cat: "Prepared Meals",  qty: 25, unit: "plates",  price: 30, orig: 200, bizIdx: 2 },
    { name: "Chocolate Truffle Cake",   desc: "Rich chocolate truffle slices from today's orders.", cat: "Bakery & Pastries", qty: 40, unit: "items",   price: 25, orig: 130, bizIdx: 3 },
    { name: "Whole Wheat Loaves",       desc: "Nutritious whole wheat bread loaves.", cat: "Bakery & Pastries", qty: 30, unit: "items",   price: 30, orig: 90,  bizIdx: 3 },
    { name: "Rajma Chawal Box",         desc: "Classic home-style rajma with steamed rice.", cat: "Prepared Meals",  qty: 55, unit: "boxes",    price: 0,  orig: 200, bizIdx: 4 },
    { name: "Chicken Biryani Box",      desc: "Aromatic Lucknowi chicken biryani with mirchi salan.", cat: "Catering Surplus",qty: 35, unit: "boxes",    price: 60, orig: 350, bizIdx: 4 },
    { name: "Idli Sambhar Pack",        desc: "South Indian breakfast surplus — 4 idlis with sambhar and chutney.", cat: "Prepared Meals",  qty: 80, unit: "plates",  price: 0,  orig: 120, bizIdx: 0 },
    { name: "Chole Bhature",            desc: "Spicy chole with two fluffy bhaturas.", cat: "Prepared Meals",  qty: 45, unit: "plates",  price: 0,  orig: 160, bizIdx: 1 },
    { name: "Mango Lassi Cartons",      desc: "Fresh mango lassi — 300ml cartons.", cat: "Beverages",        qty: 50, unit: "items",   price: 15, orig: 80,  bizIdx: 2 },
    { name: "Pav Bhaji Platter",        desc: "Mumbai-style pav bhaji with extra butter and papad.", cat: "Catering Surplus",qty: 70, unit: "plates",  price: 20, orig: 160, bizIdx: 3 },
    { name: "Egg Fried Rice Box",       desc: "Wok-tossed egg fried rice.", cat: "Prepared Meals",  qty: 40, unit: "boxes",    price: 30, orig: 180, bizIdx: 4 },
  ];

  const newFoodDocs = [];
  for (let i = 0; i < foodDefs.length; i++) {
    const fd = foodDefs[i];
    const bizUser    = bizUsers[fd.bizIdx % bizUsers.length];
    const bizProfile = bizProfiles.find(bp => bp.userId.equals(bizUser._id)) || bizProfiles[0];

    const food = await Food.create({
      businessId: bizUser._id,
      name: fd.name,
      description: fd.desc,
      category: fd.cat,
      quantity: fd.qty,
      quantityUnit: fd.unit,
      preparationTime: days(-2),
      expiryTime: hrs(3 + (i % 8)),
      price: fd.price,
      originalPrice: fd.orig,
      image: FOOD_IMGS[i % FOOD_IMGS.length],
      status: "AVAILABLE",
      pickupLocation: {
        address: bizProfile?.address || "Sector 18, Noida",
        city:    bizProfile?.city    || "Noida",
        state: "Uttar Pradesh",
        coordinates: {
          lat: bizProfile?.latitude  || 28.5706,
          lng: bizProfile?.longitude || 77.3220,
        },
      },
    });
    newFoodDocs.push(food);
    console.log(`✅ Food ${i + 1}/15: ${fd.name}`);
  }

  /* ── 3. RESERVATIONS with purchase history ─────────────── */
  //  statusDaysAgo: how many days ago the reservation was made (for realism)
  const resDefs = [
    // ── ngo@gmail.com (ngoUsers[0]) — most active, 7 orders
    { ngoIdx: 0, foodIdx: 0,  qty: 20, status: "COMPLETED",        daysAgo: 7  },
    { ngoIdx: 0, foodIdx: 2,  qty: 15, status: "COMPLETED",        daysAgo: 5  },
    { ngoIdx: 0, foodIdx: 4,  qty: 25, status: "COMPLETED",        daysAgo: 4  },
    { ngoIdx: 0, foodIdx: 6,  qty: 30, status: "COMPLETED",        daysAgo: 3  },
    { ngoIdx: 0, foodIdx: 8,  qty: 20, status: "CONFIRMED",        daysAgo: 1  },
    { ngoIdx: 0, foodIdx: 10, qty: 40, status: "READY_FOR_PICKUP", daysAgo: 0  },
    { ngoIdx: 0, foodIdx: 12, qty: 10, status: "PENDING",          daysAgo: 0  },

    // ── HelpFeed India (ngoUsers[1]) — 4 orders
    { ngoIdx: 1, foodIdx: 1,  qty: 30, status: "COMPLETED",        daysAgo: 6  },
    { ngoIdx: 1, foodIdx: 3,  qty: 20, status: "COMPLETED",        daysAgo: 4  },
    { ngoIdx: 1, foodIdx: 5,  qty: 15, status: "CONFIRMED",        daysAgo: 2  },
    { ngoIdx: 1, foodIdx: 11, qty: 25, status: "PENDING",          daysAgo: 0  },

    // ── Annadata Foundation (ngoUsers[2]) — 3 orders
    { ngoIdx: 2, foodIdx: 7,  qty: 15, status: "COMPLETED",        daysAgo: 5  },
    { ngoIdx: 2, foodIdx: 9,  qty: 10, status: "COMPLETED",        daysAgo: 3  },
    { ngoIdx: 2, foodIdx: 13, qty: 35, status: "CANCELLED",        daysAgo: 2  },

    // ── Khana Ghar (ngoUsers[3]) — 3 orders
    { ngoIdx: 3, foodIdx: 0,  qty: 10, status: "COMPLETED",        daysAgo: 7  },
    { ngoIdx: 3, foodIdx: 4,  qty: 12, status: "CONFIRMED",        daysAgo: 2  },
    { ngoIdx: 3, foodIdx: 14, qty: 20, status: "PENDING",          daysAgo: 0  },

    // ── Bhojan Shala (ngoUsers[4]) — 3 orders
    { ngoIdx: 4, foodIdx: 2,  qty: 18, status: "COMPLETED",        daysAgo: 6  },
    { ngoIdx: 4, foodIdx: 6,  qty: 20, status: "COMPLETED",        daysAgo: 3  },
    { ngoIdx: 4, foodIdx: 10, qty: 15, status: "PENDING",          daysAgo: 0  },
  ];

  // Track stats per NGO for final update
  const ngoStats = ngoUsers.map(() => ({ credits: 0, kgRescued: 0, completedOrders: 0 }));

  const createdReservations = [];

  for (let i = 0; i < resDefs.length; i++) {
    const rd = resDefs[i];
    const ngoUser = ngoUsers[rd.ngoIdx];
    const food    = newFoodDocs[rd.foodIdx];
    const bizUser = bizUsers.find(u => u._id.equals(food.businessId)) || bizUsers[0];

    const reservedAt  = days(-rd.daysAgo);
    const completedAt = rd.status === "COMPLETED" ? days(-rd.daysAgo + 1) : undefined;
    const cancelledAt = rd.status === "CANCELLED" ? days(-rd.daysAgo + 1) : undefined;

    // NGOs always pay ₹0 for price=0 items; for priced items they also get free
    const totalPrice = 0;  // NGO benefit

    const reservation = await Reservation.create({
      foodId:      food._id,
      recipientId: ngoUser._id,
      businessId:  bizUser._id,
      quantity:    rd.qty,
      totalPrice,
      claimCode:   rndCode(),
      status:      rd.status,
      reservedAt,
      pickupTime:  "Today before 8:30 PM",
      ...(completedAt && { completedAt }),
      ...(cancelledAt && { cancelledAt }),
    });
    createdReservations.push({ reservation, rd, food, ngoUser, bizUser });

    // ── ImpactLedger entries for COMPLETED orders ──────────
    if (rd.status === "COMPLETED") {
      const kgRescued = Math.round(rd.qty * 0.35 * 10) / 10; // ~350g per serving
      const creditsEarned = Math.round(kgRescued * 10);       // 10 credits per kg

      // Credit to NGO (RECIPIENT)
      try {
        await ImpactLedger.create({
          userId:        ngoUser._id,
          reservationId: reservation._id,
          type:          "EARNED",
          amount:        creditsEarned,
          reason:        `Food rescued: ${rd.qty} ${food.quantityUnit} of "${food.name}" (${kgRescued} kg)`,
          metadata:      { foodName: food.name, kgRescued, qty: rd.qty },
        });
      } catch (e) { /* skip duplicate */ }

      // Credit to Business (DONOR)
      try {
        await ImpactLedger.create({
          userId:        bizUser._id,
          reservationId: reservation._id,
          type:          "EARNED",
          amount:        Math.round(creditsEarned * 0.5),
          reason:        `Surplus donated: "${food.name}" to ${ngoUser.name}`,
          metadata:      { foodName: food.name, kgRescued, recipientName: ngoUser.name },
        });
      } catch (e) { /* skip duplicate */ }

      // Accumulate NGO stats
      ngoStats[rd.ngoIdx].credits        += creditsEarned;
      ngoStats[rd.ngoIdx].kgRescued      += kgRescued;
      ngoStats[rd.ngoIdx].completedOrders += 1;
    }

    console.log(`✅ Reservation ${i + 1}/20: [${rd.status.padEnd(16)}] ${ngoUser.name.split(' ')[0]} → ${food.name.substring(0, 30)}`);
  }

  /* ── 4. Update NGO User stats ─────────────────────────── */
  console.log("\nUpdating NGO impact stats...");
  for (let i = 0; i < ngoUsers.length; i++) {
    const stats = ngoStats[i];
    if (stats.completedOrders > 0) {
      const rewardLevel = stats.credits >= 1000 ? "REPLATE_CHAMPION"
                        : stats.credits >= 500  ? "GOLD"
                        : stats.credits >= 200  ? "SILVER"
                        : "BRONZE";
      await User.findByIdAndUpdate(ngoUsers[i]._id, {
        $inc: {
          impactCredits:        stats.credits,
          totalFoodRescuedKg:   stats.kgRescued,
          totalCompletedOrders: stats.completedOrders,
        },
        $set: { rewardLevel },
      });
      console.log(`  ✅ ${ngoData[i].orgName}: +${stats.credits} credits, +${stats.kgRescued}kg, ${stats.completedOrders} orders`);
    }
  }

  /* ── Summary ─────────────────────────────────────────────── */
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 NGO Seed complete!");
  console.log("\nNGO Accounts (all verified, role: RECIPIENT/NGO):");
  ngoData.forEach((nd, i) => {
    console.log(`  ${i + 1}. ${nd.email.padEnd(32)} | ${nd.orgName}`);
  });
  console.log("\nPasswords must be set in Firebase Auth manually:");
  console.log("  ngo@gmail.com          → 123456");
  console.log("  (others: set any password in Firebase)");
  console.log("\nFood listings added : 15");
  console.log("Reservations added  : 20");
  console.log("Impact ledger entries: for all COMPLETED orders");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ NGO seed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
