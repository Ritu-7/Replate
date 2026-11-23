require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User             = require("../models/User");
const BusinessProfile  = require("../models/BusinessProfile");
const RecipientProfile = require("../models/RecipientProfile");
const Food             = require("../models/Food");
const Reservation      = require("../models/Reservation");
const ImpactLedger     = require("../models/ImpactLedger");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const users     = await User.find({}).lean();
  const bizProfs  = await BusinessProfile.find({}).lean();
  const recProfs  = await RecipientProfile.find({}).lean();
  const foods     = await Food.find({}).lean();
  const reservs   = await Reservation.find({}).lean();
  const ledger    = await ImpactLedger.find({}).lean();

  console.log("=== USERS ===");
  users.forEach(u => console.log(`  [${u.role}] ${u.email} | ${u.name} | verified:${u.isVerified} | credits:${u.impactCredits} | kg:${u.totalFoodRescuedKg}`));

  console.log("\n=== BUSINESS PROFILES ===");
  bizProfs.forEach(b => console.log(`  ${b.businessName} | type:${b.businessType} | verified:${b.isVerified} | reg:${b.registrationNumber}`));

  console.log("\n=== RECIPIENT PROFILES ===");
  recProfs.forEach(r => console.log(`  ${r.organizationName} | type:${r.recipientType} | verified:${r.isVerified}`));

  console.log("\n=== FOOD LISTINGS ===");
  foods.forEach(f => console.log(`  "${f.name}" | qty:${f.quantity} ${f.quantityUnit} | status:${f.status} | price:${f.price} | bizId:${f.businessId}`));

  console.log("\n=== RESERVATIONS ===");
  reservs.forEach(r => console.log(`  ${r.status} | qty:${r.quantity} | code:${r.claimCode} | recId:${r.recipientId} | bizId:${r.businessId}`));

  console.log("\n=== IMPACT LEDGER ===");
  ledger.forEach(l => console.log(`  [${l.type}] +${l.amount} | ${l.reason.substring(0,60)}`));

  console.log("\n=== COUNTS ===");
  console.log(`  Users: ${users.length} | BizProfiles: ${bizProfs.length} | RecProfiles: ${recProfs.length}`);
  console.log(`  Foods: ${foods.length} | Reservations: ${reservs.length} | Ledger: ${ledger.length}`);

  await mongoose.disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
