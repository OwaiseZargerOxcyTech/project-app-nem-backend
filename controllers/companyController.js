const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Company = require("../models/company");
require("dotenv").config();

exports.getCompanyExistingFlag = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ company_existing: user.company_existing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  const { token, name, gst_number, phone, address, email, state } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const user = await User.findById(userId);
    console.log("userId", userId);
    const existingCompany = await Company.findOne({ name, user: userId });

    if (existingCompany) {
      return res.status(409).json({ message: "Company already exists!" });
    }
    await Company.updateMany({ user: userId }, { selected_company: "N" });
    user.company_existing = "Y";
    await user.save();
    const newCompany = new Company({
      name,
      gst_number,
      phone,
      email,
      state,
      address,
      user: userId,
      selected_company: "Y",
    });

    await newCompany.save();

    res.status(201).json(newCompany);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCompanies = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const comapnies = await Company.find({ user: userId });

    res.status(200).json(comapnies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSelectedCompany = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const selectedcompany = await Company.findOne({
      user: userId,
      selected_company: "Y",
    });

    res.status(200).json(selectedcompany);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSelectedCompany = async (req, res) => {
  const { token, company_name } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    await Company.updateMany({ user: userId }, { selected_company: "N" });

    await Company.updateOne(
      { user: userId, name: company_name },
      { selected_company: "Y" }
    );

    selectedcompany = await Company.findOne({
      user: userId,
      name: company_name,
    });

    res.status(200).json(selectedcompany);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  const { id, name, gst_number, phone, state, email, address } = req.body;
  try {
    const updatedCompany = await Company.findOneAndUpdate(
      { _id: id },
      { name, gst_number, phone, state, email, address },
      { new: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json(updatedCompany);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeCompany = async (req, res) => {
  const { id } = req.query;
  try {
    const companyToDelete = await Company.findById(id).populate("user");
    if (!companyToDelete) {
      return res.status(404).json({ message: "Company not found" });
    }
    if (companyToDelete.selected_company === "Y") {
      const otherCompany = await Company.findOne({
        user: companyToDelete.user._id,
        _id: { $ne: id },
      });
      if (otherCompany) {
        otherCompany.selected_company = "Y";
        await otherCompany.save();
      } else {
        const user = await User.findById(companyToDelete.user._id);

        user.company_existing = "N";

        await user.save();
      }
    }

    await Company.findByIdAndDelete(id);

    res.status(200).json({ message: "Company removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
