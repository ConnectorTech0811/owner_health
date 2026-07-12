const express = require('express');
const router = express.Router();
const { getPrescriptions, createPrescription, updatePrescription, deletePrescription } = require('../controllers/prescriptionController');

router.get('/client/:cliente_id', getPrescriptions);
router.post('/client/:cliente_id', createPrescription);
router.put('/:id', updatePrescription);
router.delete('/:id', deletePrescription);

module.exports = router;
