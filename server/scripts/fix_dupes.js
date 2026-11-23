require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Food = require("../models/Food");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const dupes = await Food.find({ name: "Pav Bhaji Platter" }).lean();
  console.log("Found", dupes.length, "Pav Bhaji Platter listings:");
  dupes.forEach(f => console.log(`  _id: ${f._id} | price: ${f.price} | qty: ${f.quantity}`));

  if (dupes.length > 1) {
    // keep the one with price=0 (clean reseed), delete others
    const toKeep = dupes.find(f => f.price === 0);
    const toDelete = dupes.filter(f => f._id.toString() !== toKeep._id.toString());
    for (const d of toDelete) {
      await Food.deleteOne({ _id: d._id });
      console.log(`  Deleted duplicate: ${d._id} (price: ${d.price})`);
    }
  }

  console.log("Final food count:", await Food.countDocuments());
  await mongoose.disconnect();
})();
