const express = require('express');
const router = express.Router();
const {
  getMedications, createMedication, updateMedication, deleteMedication,
  getMedicationLogs, logMedication, sendManualReminder,
  getMedicationEffects, logMedicationEffect
} = require('../controllers/medicationController');

router.get('/client/:cliente_id', getMedications);
router.post('/client/:cliente_id', createMedication);
router.put('/:id', updateMedication);
router.delete('/:id', deleteMedication);

router.get('/:medicamento_id/logs', getMedicationLogs);
router.post('/:medicamento_id/logs', logMedication);

router.get('/:medicamento_id/effects', getMedicationEffects);
router.post('/:medicamento_id/effects', logMedicationEffect);

router.post('/send-reminder', sendManualReminder);

module.exports = router;
