const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const Customer = require("../models/customer");
const Invoice = require("../models/invoice");
const Item = require("../models/item");

const {
  createInvoice,
  getInvoiceByCompany,
  removeInvoice,
  getInvoice,
} = require("../controllers/invoiceController");

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../models/company", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/invoice", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock("../models/customer", () => ({
  findOne: jest.fn(),
}));

describe("createInvoice", () => {
  let req, res;
  const fixedDate = new Date("2024-05-20T17:01:20.531Z");

  beforeEach(() => {
    req = {
      body: {
        token: "test-token",
        inputs: [
          {
            amount: 100,
            customer_id: "customer-id",
            discount: 10,
            due_date: "2023-06-01",
            gst: 5,
            invoice_number: "INV-123",
            item_id: "item-id",
            qty: 2,
            total_amount: 190,
          },
        ],
      },
    };
    res = {
      status: jest.fn(),
      json: jest.fn(),
    };

    jest.useFakeTimers("modern");
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create new invoices if they do not already exist", async () => {
    const decodedToken = { id: "user-id" };
    const company = {
      _id: "company-id",
      user: "user-id",
      selected_company: "Y",
    };
    const newInvoice = {
      _id: "invoice-id",
      ...req.body.inputs[0],
      company: company._id,
      invoice_date: fixedDate,
      due_date: new Date(req.body.inputs[0].due_date).toISOString(),
    };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(company);
    Invoice.findOne.mockResolvedValue(null);
    Invoice.create.mockResolvedValue(newInvoice);

    await createInvoice(req, res);

    console.log("res.status calls:", res.status.mock.calls); // Log res.status calls
    console.log("res.json calls:", res.json.mock.calls);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(Invoice.findOne).toHaveBeenCalledWith({
      invoice_number: "INV-123",
      company: company._id,
    });
    expect(Invoice.create).toHaveBeenCalledWith({
      amount: 100,
      customer: "customer-id",
      discount: 10,
      gst: 5,
      invoice_number: "INV-123",
      item: "item-id",
      qty: 2,
      total_amount: 190,
      company: company._id,
      invoice_date: fixedDate,
      due_date: new Date(req.body.inputs[0].due_date).toISOString(),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([newInvoice]);
  });

  it("should return 404 if the company is not found", async () => {
    const decodedToken = { id: "user-id" };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(null);

    await createInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Company not found" });
  });

  it("should return 409 if the invoice already exists", async () => {
    const decodedToken = { id: "user-id" };
    const company = {
      _id: "company-id",
      user: "user-id",
      selected_company: "Y",
    };
    const existingInvoice = { _id: "invoice-id" };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(company);
    Invoice.findOne.mockResolvedValue(existingInvoice);

    await createInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(Invoice.findOne).toHaveBeenCalledWith({
      invoice_number: "INV-123",
      company: company._id,
    });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invoice already exists!",
    });
  });

  it("should return 500 if there is an error", async () => {
    const error = new Error("Test error");

    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await createInvoice(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });
});

describe("getInvoiceByCompany", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        token: "test-token",
      },
    };
    res = {
      status: jest.fn(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return invoices with customer names if company is found", async () => {
    const decodedToken = { id: "user-id" };
    const company = {
      _id: "company-id",
      user: "user-id",
      selected_company: "Y",
    };
    const invoices = [
      {
        _id: "invoice-id-1",
        customer: "customer-id-1",
        _doc: {
          _id: "invoice-id-1",
        },
      },
      {
        _id: "invoice-id-2",
        customer: "customer-id-2",
        _doc: {
          _id: "invoice-id-2",
        },
      },
    ];
    const customers = [
      { _id: "customer-id-1", name: "Customer 1" },
      { _id: "customer-id-2", name: "Customer 2" },
    ];

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(company);
    Invoice.find.mockResolvedValue(invoices);
    Customer.findOne
      .mockResolvedValueOnce(customers[0])
      .mockResolvedValueOnce(customers[1]);

    await getInvoiceByCompany(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(Invoice.find).toHaveBeenCalledWith({ company: "company-id" });
    expect(Customer.findOne).toHaveBeenCalledWith({ _id: "customer-id-1" });
    expect(Customer.findOne).toHaveBeenCalledWith({ _id: "customer-id-2" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { ...invoices[0]._doc, customer_name: "Customer 1" },
      { ...invoices[1]._doc, customer_name: "Customer 2" },
    ]);
  });

  it("should return 404 if the company is not found", async () => {
    const decodedToken = { id: "user-id" };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(null);

    await getInvoiceByCompany(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Company not found" });
  });

  it("should return 500 if there is an error", async () => {
    const error = new Error("Test error");

    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await getInvoiceByCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });
});

describe("removeInvoice", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        token: "test-token",
        invoice_number: "12345",
      },
    };
    res = {
      status: jest.fn(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should remove invoices successfully", async () => {
    const decodedToken = { id: "user-id" };
    const company = {
      _id: "company-id",
      user: "user-id",
      selected_company: "Y",
    };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(company);
    Invoice.deleteMany.mockResolvedValue({ deletedCount: 1 });

    await removeInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(Invoice.deleteMany).toHaveBeenCalledWith({
      invoice_number: "12345",
      company: "company-id",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invoices removed successfully",
    });
  });

  it("should return 404 if the company is not found", async () => {
    const decodedToken = { id: "user-id" };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(null);

    await removeInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Company not found" });
  });

  it("should return 500 if there is an error", async () => {
    const error = new Error("Test error");

    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await removeInvoice(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });
});

describe("getInvoice", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        token: "test-token",
        invoice_number: "12345",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return the invoice if found", async () => {
    const decodedToken = { id: "user-id" };
    const company = {
      _id: "company-id",
      user: "user-id",
      selected_company: "Y",
    };
    const invoice = {
      _id: "invoice-id",
    };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(company);
    Invoice.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([invoice]),
        }),
      }),
    });

    await getInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(Invoice.find).toHaveBeenCalledWith({
      invoice_number: "12345",
      company: "company-id",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([invoice]);
  });

  it("should return 404 if the company is not found", async () => {
    const decodedToken = { id: "user-id" };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(null);

    await getInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Company not found" });
  });

  it("should return 404 if the invoice is not found", async () => {
    const decodedToken = { id: "user-id" };
    const company = {
      _id: "company-id",
      user: "user-id",
      selected_company: "Y",
    };

    jwt.verify.mockReturnValue(decodedToken);
    Company.findOne.mockResolvedValue(company);
    Invoice.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    await getInvoice(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "test-token",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: "user-id",
      selected_company: "Y",
    });
    expect(Invoice.find).toHaveBeenCalledWith({
      invoice_number: "12345",
      company: "company-id",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Invoice not found" });
  });

  it("should return 500 if there is an error", async () => {
    const error = new Error("Test error");

    jwt.verify.mockImplementation(() => {
      throw error;
    });

    await getInvoice(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: error.message });
  });
});
