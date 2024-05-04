const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");

router.get("/get-customers", customerController.getCustomers);
router.post("/add-customer", customerController.addCustomer);
router.put("/update-customer", customerController.updateCustomer);
router.delete("/remove-customer", customerController.removeCustomer);
router.get("/get-all-customers", customerController.getAllCustomers);

module.exports = router;
