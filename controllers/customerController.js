const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const Customer = require("../models/customer");
require("dotenv").config();

exports.getCustomers = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const company = await Company.findOne({
      user: userId,
      selected_company: "Y",
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const customers = await Customer.find({ company: company._id });

    res.status(200).json(customers);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: err.message });
  }
};

exports.addCustomer = async (req, res) => {
  const { token, name, email, phone, customer_company, gstin, state, address } =
    req.body;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const company = await Company.findOne({
      user: userId,
      selected_company: "Y",
    });

    const existingCustomer = await Customer.findOne({
      email,
      company: company._id,
    });

    if (existingCustomer) {
      return res.status(409).json({ message: "Customer already exists!" });
    }

    const newCustomer = new Customer({
      name,
      email,
      phone,
      customer_company,
      gstin,
      state,
      address,
      company: company._id,
    });

    await newCustomer.save();

    res.status(201).json(newCustomer);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  const { id, name, email, phone, customer_company, gstin, state, address } =
    req.body;
  try {
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: id },
      { name, email, phone, customer_company, gstin, state, address },
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(updatedCustomer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeCustomer = async (req, res) => {
  const { id } = req.query;
  try {
    await Customer.findByIdAndDelete(id);

    res.status(200).json({ message: "Customer removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
