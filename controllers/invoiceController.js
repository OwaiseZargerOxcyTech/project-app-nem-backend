const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const Customer = require("../models/customer");
const Invoice = require("../models/invoice");
require("dotenv").config();

exports.createInvoice = async (req, res) => {
  const { token, inputs } = req.body;
  try {
    const invoices = [];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const company = await Company.findOne({
      user: userId,
      selected_company: "Y",
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const existingInvoice = await Invoice.findOne({
      invoice_number: inputs[0].invoice_number,
      company: company._id,
    });

    if (existingInvoice) {
      return res.status(409).json({ message: "Invoice already exists!" });
    }

    for (const input of inputs) {
      const {
        amount,
        customer_id,
        discount,
        due_date,
        gst,
        invoice_number,
        item_id,
        qty,
        total_amount,
      } = input;

      const invoice = new Invoice({
        invoice_number,
        invoice_date: new Date(),
        due_date: new Date(due_date).toISOString(),
        discount,
        qty,
        gst,
        amount,
        total_amount,
        company: company._id,
        customer: customer_id,
        item: item_id,
      });

      await invoice.save();
      invoices.push(invoice);
    }

    res.status(200).json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getInvoiceByCompany = async (req, res) => {
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

    let invoices = await Invoice.find({ company: company._id });

    invoices = await Promise.all(
      invoices.map(async (invoice) => {
        const customer = await Customer.findOne({ _id: invoice.customer });
        return { ...invoice._doc, customer_name: customer.name };
      })
    );

    res.status(200).json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeInvoice = async (req, res) => {
  try {
    const { token, invoice_number } = req.query;

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const company = await Company.findOne({
      user: userId,
      selected_company: "Y",
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    await Invoice.deleteMany({ invoice_number, company: company._id });
    res.status(200).json({ message: "Invoices removed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getInvoice = async (req, res) => {
  const { token, invoice_number } = req.query;
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

    const invoice = await Invoice.find({
      invoice_number,
      company: company._id,
    })
      .populate("company")
      .populate("customer")
      .populate("item");

    if (!invoice) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
