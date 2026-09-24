const express = require('express');
const router = express.Router();
const { authenticate, forgotPassword, resetPassword } = require('../controllers/authController');
const { registerClient } = require('../controllers/clientController');
const { registerCompany } = require('../controllers/companyController');
const { registerProfessional } = require('../controllers/professionalController');

router.post('/authenticate', authenticate);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Aliases para formulários de registro
router.post('/register/client', registerClient);
router.post('/register/company', registerCompany);
router.post('/register/professional', registerProfessional);

module.exports = router;
