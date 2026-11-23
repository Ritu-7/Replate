require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const BusinessProfile = require("../models/BusinessProfile");

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const parties = await User.find({ role: "BUSINESS", businessType: "PARTY" }).select("_id name email businessType");
  const bizParty = await BusinessProfile.find({ businessType: "PARTY" }).select("_id userId businessName");
  const ngos = await User.find({ role: "RECIPIENT", recipientType: "NGO", isVerified: true }).select("_id name email");
  console.log("PARTY users:", JSON.stringify(parties));
  console.log("PARTY profiles:", JSON.stringify(bizParty));
  console.log("NGO users:", JSON.stringify(ngos));
  await mongoose.disconnect();
  process.exit(0);
});
