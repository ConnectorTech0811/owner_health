const express = require('express');
const router = express.Router();
const { getSatisfactionByClient, createSatisfaction, getSatisfactionByProfessional } = require('../controllers/satisfactionController');

router.get('/client/:cliente_id', getSatisfactionByClient);
router.post('/client/:cliente_id', createSatisfaction);
router.get('/professional/:profissional_id', getSatisfactionByProfessional);

module.exports = router;
