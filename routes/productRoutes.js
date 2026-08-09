const express = require('express');
const {
  list, getOne, create, update, remove,
} = require('../controllers/productController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const requireRole = require('../middleware/role');
const { upload } = require('../utils/upload');

const router = express.Router();

router.get('/', optionalAuth, list);
router.get('/:id', optionalAuth, getOne);
router.post('/', auth, requireRole('admin'), upload.single('photo'), create);
router.put('/:id', auth, requireRole('admin'), upload.single('photo'), update);
router.delete('/:id', auth, requireRole('admin'), remove);

module.exports = router;
