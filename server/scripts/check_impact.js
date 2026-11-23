require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Food = require("../models/Food");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const completed = await Reservation.find({ status: "COMPLETED" }).populate("foodId", "quantity originalPrice quantityUnit");

  let totalPlates = 0, totalValue = 0;
  completed.forEach(r => {
    const qty = r.quantity || 1;
    totalPlates += qty;
    totalValue += (r.foodId?.originalPrice || 0) * qty;
  });

  const foodDivertedKg = totalPlates * 0.4;
  const uniqueDonors = await Food.distinct("businessId");

  console.log("=== REAL IMPACT NUMBERS ===");
  console.log(`Meals Rescued (plates):   ${totalPlates}+`);
  console.log(`Food Diverted:            ${foodDivertedKg} kg = ${(foodDivertedKg/1000).toFixed(2)} Tons`);
  console.log(`Value Recovered:          ₹${totalValue.toLocaleString("en-IN")} → formatted: ₹${totalValue >= 100000 ? (totalValue/100000).toFixed(1)+"L" : totalValue >= 1000 ? (totalValue/1000).toFixed(1)+"k" : totalValue}`);
  console.log(`Food Partners (donors):   ${uniqueDonors.length}`);
  console.log("\n--- Per completed reservation ---");
  completed.forEach(r => {
    const name = r.foodId?.name || "?";
    console.log(`  ${r.quantity} units × ₹${r.foodId?.originalPrice || 0} = ₹${(r.quantity * (r.foodId?.originalPrice||0)).toLocaleString()}`);
  });

  await mongoose.disconnect();
})();
