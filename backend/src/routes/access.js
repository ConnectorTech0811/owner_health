const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');
const { authenticateToken } = require('../middleware/auth');

router.post('/grant', authenticateToken, accessController.concederAcesso);
router.post('/revoke', authenticateToken, accessController.revogarAcesso);
router.get('/', authenticateToken, accessController.listarAcessos);

module.exports = router;
