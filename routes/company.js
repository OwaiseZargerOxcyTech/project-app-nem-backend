const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");

router.get(
  "/get-company-existing-flag",
  companyController.getCompanyExistingFlag
);
router.post("/create-company", companyController.createCompany);
router.get("/get-companies", companyController.getCompanies);
router.get("/get-selected-company", companyController.getSelectedCompany);
router.post(
  "/update-selected-company",
  companyController.updateSelectedCompany
);
router.put("/update-company", companyController.updateCompany);

module.exports = router;
