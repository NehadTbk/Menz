const express = require('express');
const {
  create, list, getOne,
} = require('../controllers/orderController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, list);
router.get('/:id', auth, getOne);
router.post('/', auth, create);

module.exports = router;
