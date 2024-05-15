const jwt = require("jsonwebtoken");
const Company = require("../models/company");
const Item = require("../models/item");

const { getItems, addItem } = require("../controllers/itemController");

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../models/company", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/item", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

describe("getItems", () => {
  let req, res;

  beforeEach(() => {
    req = { query: { token: "someToken" } };
    res = { status: jest.fn(), json: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return items if company is found", async () => {
    const userId = "someUserId";
    const company = { _id: "someCompanyId" };
    const items = [{ item_name: "Colgate" }, { item_name: "Surf Excel" }];

    jwt.verify.mockReturnValueOnce({ id: userId });
    Company.findOne.mockResolvedValueOnce(company);
    Item.find.mockResolvedValueOnce(items);

    await getItems(req, res);

    expect(jwt.verify).toHaveBeenCalledWith(
      "someToken",
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: userId,
      selected_company: "Y",
    });
    expect(Item.find).toHaveBeenCalledWith({ company: company._id });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(items);
  });

  it("should return 404 if company is not found", async () => {
    const userId = "someUserId";
    jwt.verify.mockReturnValueOnce({ id: userId });

    Company.findOne.mockResolvedValueOnce(null);

    await getItems(req, res);

    console.log("res.status calls:", res.status.mock.calls); // Log res.status calls
    console.log("res.json calls:", res.json.mock.calls);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Company not found" });
  });

  it("should return 500 if an error occurs", async () => {
    jwt.verify.mockReturnValueOnce({ id: "someUserId" });
    Company.findOne.mockRejectedValueOnce(new Error("Database error"));

    await getItems(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Database error" });
  });
});

describe("addItem function", () => {
  const req = {
    body: {
      token: "someToken",
      item_name: "Item Name",
      item_code: "Item Code",
      item_details: "Item Details",
      hsn_sac: "HSN/SAC",
      qty: 10,
      rate: 100,
    },
  };

  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add a new item successfully", async () => {
    const userId = "someUserId";
    const company = { _id: "someCompanyId" };

    const newItem = {
      item_name: req.body.item_name,
      item_code: req.body.item_code,
      item_details: req.body.item_details,
      hsn_sac: req.body.hsn_sac,
      qty: req.body.qty,
      rate: req.body.rate,
      company: company._id,
    };

    jwt.verify.mockReturnValue({ id: userId });

    Company.findOne.mockResolvedValue(company);

    Item.findOne.mockResolvedValue(null);

    Item.create.mockResolvedValue(newItem);

    await addItem(req, res);

    console.log("res.status calls:", res.status.mock.calls); // Log res.status calls
    console.log("res.json calls:", res.json.mock.calls);

    expect(jwt.verify).toHaveBeenCalledWith(
      req.body.token,
      process.env.SECRET_KEY
    );
    expect(Company.findOne).toHaveBeenCalledWith({
      user: userId,
      selected_company: "Y",
    });
    expect(Item.findOne).toHaveBeenCalledWith({
      item_name: req.body.item_name,
      company: company._id,
    });

    expect(Item.create).toHaveBeenCalledWith({
      item_name: req.body.item_name,
      item_code: req.body.item_code,
      item_details: req.body.item_details,
      hsn_sac: req.body.hsn_sac,
      qty: req.body.qty,
      rate: req.body.rate,
      company: company._id,
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newItem);
  });

  it("should return 409 status if item already exists", async () => {
    const userId = "someUserId";
    const company = { _id: "someCompanyId" };
    jwt.verify.mockReturnValue({ id: userId });

    Company.findOne.mockResolvedValue(company);

    const existingItem = { _id: "existingItemId" };
    Item.findOne.mockResolvedValue(existingItem);

    await addItem(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Item already exists!" });
  });

  it("should return 500 status if an error occurs", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("Token verification failed");
    });

    await addItem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token verification failed",
    });
  });
});
