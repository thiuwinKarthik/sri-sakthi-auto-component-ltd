const express = require("express");
const router = express.Router();
const formController = require("../controllers/productController");

router.get("/components", formController.getComponents);
router.get("/delays", formController.getDelayReasons);
router.get("/employees", formController.getEmployees);
router.get("/incharges", formController.getIncharges);
router.get("/supervisors", formController.getSupervisors);
router.get("/operators", formController.getOperators);
router.get("/forms/last-mould-counter", formController.getLastMouldCounter);
router.get("/forms/last-personnel", formController.getLastPersonnel);
router.post("/forms", formController.createReport);
router.put("/forms/:id", formController.updateReport);
router.delete("/forms/:id", formController.deleteReport);
router.get("/forms/download-pdf", formController.downloadAllReports);

module.exports = router;
