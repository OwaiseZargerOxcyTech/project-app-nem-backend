const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const Item = require("../models/item");
require("dotenv").config();

exports.getItems = async (req, res) => {
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

    const items = await Item.find({ company: company._id });

    res.status(200).json(items);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAllItems = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const companies = await Company.find({
      user: userId,
    });

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: "Companies not found" });
    }

    const itemPromises = companies.map((company) =>
      Item.find({ company: company._id })
    );

    const items = await Promise.all(itemPromises);

    const flattenedItems = items.flat();

    res.status(200).json(flattenedItems);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: err.message });
  }
};

exports.addItem = async (req, res) => {
  const { token, item_name, item_code, item_details, hsn_sac, qty, rate } =
    req.body;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const company = await Company.findOne({
      user: userId,
      selected_company: "Y",
    });

    const existingItem = await Item.findOne({
      item_name,
      company: company._id,
    });

    if (existingItem) {
      return res.status(409).json({ message: "Item already exists!" });
    }

    const newItem = new Item({
      item_name,
      item_code,
      item_details,
      hsn_sac,
      qty,
      rate,
      company: company._id,
    });

    await newItem.save();

    res.status(201).json(newItem);
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ message: err.message });
  }
};

exports.updateItem = async (req, res) => {
  const { id, item_name, item_code, item_details, hsn_sac, qty, rate } =
    req.body;
  try {
    const updatedItem = await Item.findOneAndUpdate(
      { _id: id },
      { item_name, item_code, item_details, hsn_sac, qty, rate },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(updatedItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeItem = async (req, res) => {
  const { id } = req.query;
  try {
    await Item.findByIdAndDelete(id);

    res.status(200).json({ message: "Item removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
