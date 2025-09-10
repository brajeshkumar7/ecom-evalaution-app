const express = require('express');
const router = express.Router();
const { getProductTrends, getVisitorStats } = require('../controllers/DashboardController');

router.get('/products', getProductTrends);
router.get('/visitors', getVisitorStats);

module.exports = router;
