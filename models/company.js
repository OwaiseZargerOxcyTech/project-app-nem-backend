const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  company_name: { type: String, required: true },
  gst_number: String,
  phone: { type: String, required: true },
  email: { type: String, required: true },
  place_of_supply: String,
  address: { type: String, required: true },
  state: { type: String, required: true },
  selected_company: String,
});

module.exports = mongoose.model("Company", companySchema);
