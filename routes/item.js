const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");

router.get("/get-items", itemController.getItems);
router.post("/add-item", itemController.addItem);
router.put("/update-item", itemController.updateItem);
router.delete("/remove-item", itemController.removeItem);
router.get("/get-all-items", itemController.getAllItems);

module.exports = router;
