/**
 * Remove leftover food listings from previous seed scripts.
 * Keeps only the 15 foods created by clean_reseed.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Food = require("../models/Food");

const KEEP_FOOD_NAMES = new Set([
  "Amritsari Dal Makhani & Naan",
  "Paneer Tikka & Roti Platter",
  "Veg Biryani with Raita",
  "Gulab Jamun & Kheer Pack",
  "Haveli Special Thali",
  "Lassi & Bread Pakora Bundle",
  "Chana Masala & Puri",
  "Assorted Mithai Box",
  "Rajma Chawal Box",
  "Pav Bhaji Platter",
  "Post-Wedding Veg Buffet Surplus",
  "Wedding Dessert Table — Sweets & Pastries",
  "Kapoor Wedding — Non-Veg Dinner Surplus",
  "Corporate Annual Dinner — Premium Snack Boxes",
  "Anniversary Celebration Dessert Platter",
]);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected\n");

  const allFoods = await Food.find({}).lean();
  const toDelete = allFoods.filter(f => !KEEP_FOOD_NAMES.has(f.name));

  if (toDelete.length > 0) {
    const ids = toDelete.map(f => f._id);
    await Food.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${toDelete.length} old food listings:`);
    toDelete.forEach(f => console.log(`  - "${f.name}"`));
  } else {
    console.log("No old foods to delete.");
  }

  const remaining = await Food.countDocuments();
  console.log(`\nRemaining foods: ${remaining}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
