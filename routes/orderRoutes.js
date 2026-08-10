const express = require('express');
const {
  create, list, getOne, updateStatus,
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

router.get('/', auth, list);
router.get('/:id', auth, getOne);
router.post('/', auth, create);
router.put('/:id', auth, requireRole('admin'), updateStatus);

module.exports = router;
