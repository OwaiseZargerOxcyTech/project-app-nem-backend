const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const Customer = require("../models/customer");
const Invoice = require("../models/invoice");
const Item = require("../models/item");
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

exports.getInvoicesReport = async (req, res) => {
  let { token, companyId, customerId, itemId } = req.query;
  try {
    let companies;
    if (companyId === undefined) {
      companyId = "";
    }
    if (customerId === undefined) {
      customerId = "";
    }
    if (itemId === undefined) {
      itemId = "";
    }
    if (companyId === "") {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      const userId = decoded.id;

      companies = await Company.find({ user: userId });
    } else {
      companies = await Company.find({ _id: companyId });
    }

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: "Companies not found" });
    }

    let invoicePromises;

    if (itemId === "" && customerId === "") {
      invoicePromises = companies.map((company) =>
        Invoice.find({ company: company._id })
          .populate("company", "name")
          .populate("customer", "name")
          .populate("item")
      );
    } else if (itemId === "") {
      invoicePromises = companies.map((company) =>
        Invoice.find({ company: company._id, customer: customerId })
          .populate("company", "name")
          .populate("customer", "name")
          .populate("item")
      );
    } else if (customerId === "") {
      invoicePromises = companies.map((company) =>
        Invoice.find({ company: company._id, item: itemId })
          .populate("company", "name")
          .populate("customer", "name")
          .populate("item")
      );
    } else {
      invoicePromises = companies.map((company) =>
        Invoice.find({
          company: company._id,
          customer: customerId,
          item: itemId,
        })
          .populate("company", "name")
          .populate("customer", "name")
          .populate("item")
      );
    }

    const invoices = await Promise.all(invoicePromises);

    const flattenedInvoices = invoices.flat();

    const invoicesWithRelations = flattenedInvoices.map((invoice) => ({
      ...invoice._doc,
      rate: invoice.item.rate,
      companyName: invoice.company.name,
      itemName: invoice.item.item_name,
      customerName: invoice.customer.name,
      __typename: "InvoicesWithRelations",
    }));

    res.status(200).json(invoicesWithRelations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getInvoicesExport = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    companies = await Company.find({ user: userId });

    if (!companies || companies.length === 0) {
      return res.status(200).json({ message: "Companies not found" });
    }

    let invoicePromises;

    invoicePromises = companies.map((company) =>
      Invoice.find({ company: company._id })
        .populate("company", "name")
        .populate("customer", "name")
        .populate("item")
    );

    const invoices = await Promise.all(invoicePromises);

    const flattenedInvoices = invoices.flat();

    const invoicesWithRelations = flattenedInvoices.map((invoice) => ({
      ...invoice._doc,
      rate: invoice.item.rate,
      companyName: invoice.company.name,
      itemName: invoice.item.item_name,
      customerName: invoice.customer.name,
      __typename: "InvoicesWithRelations",
    }));

    res.status(200).json(invoicesWithRelations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.importInvoice = async (req, res) => {
  const { token, input } = req.body;
  const {
    amount,
    companyName,
    customerName,
    discount,
    due_date,
    gst,
    invoice_number,
    invoice_date,
    itemName,
    qty,
    total_amount,
  } = input;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const userId = decoded.id;

    const company = await Company.findOne({ name: companyName, user: userId });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const item = await Item.findOne({
      item_name: itemName,
      company: company._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const existingInvoice = await Invoice.findOne({
      invoice_number,
      item: item._id,
    });

    if (existingInvoice) {
      return res.status(200).json({ message: "Invoice already exists!" });
    }

    const customer = await Customer.findOne({
      name: customerName,
      company: company._id,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const newInvoice = new Invoice({
      invoice_number,
      invoice_date: new Date(invoice_date).toISOString(),
      due_date: new Date(due_date).toISOString(),
      discount,
      qty,
      gst,
      amount,
      total_amount,
      company: company._id,
      customer: customer._id,
      item: item._id,
    });

    await newInvoice.save();

    res.status(201).json(newInvoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
