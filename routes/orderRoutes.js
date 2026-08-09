const express = require('express');
const { create } = require('../controllers/orderController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, create);

module.exports = router;
