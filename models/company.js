const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  gst_number: String,
  phone: { type: String, required: true },
  email: { type: String, required: true },
  place_of_supply: String,
  address: { type: String, required: true },
  state: { type: String, required: true },
  selected_company: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", field: "userId" },
});

module.exports = mongoose.model("Company", companySchema);
