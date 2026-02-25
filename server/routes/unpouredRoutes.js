const express = require("express");
const router = express.Router();
const unpouredController = require("../controllers/unpouredController");

router.get("/unpoured-details", unpouredController.getUnpouredData);
router.get("/unpoured-details/download-pdf", unpouredController.downloadUnpouredPDF);
router.post("/unpoured-summary/save", unpouredController.saveUnpouredSummary);

module.exports = router;