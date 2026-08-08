const express = require('express');
const {
  list, getOne, create, update, remove,
} = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/', auth, requireRole('admin'), create);
router.put('/:id', auth, requireRole('admin'), update);
router.delete('/:id', auth, requireRole('admin'), remove);

module.exports = router;
