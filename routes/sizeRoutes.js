const express = require('express');
const { list } = require('../controllers/sizeController');

const router = express.Router();

router.get('/', list);

module.exports = router;
