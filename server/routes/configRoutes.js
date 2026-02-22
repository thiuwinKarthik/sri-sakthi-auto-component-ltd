const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// GET request to fetch the current master schema configuration for a specific form type
router.get('/:type/master', configController.getMasterConfig);

// POST request to save (add/update/delete) master schema configuration items
router.post('/:type/master', configController.saveMasterConfig);

module.exports = router;
