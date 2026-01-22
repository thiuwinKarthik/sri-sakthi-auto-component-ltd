const express = require('express');
const router = express.Router();
const controller = require('../controllers/disaMachineChecklistController');

router.get('/details', controller.getChecklistDetails);
router.post('/report-nc', controller.saveNCReport);
router.post('/submit-batch', controller.saveBatchChecklist); // New Route

module.exports = router;