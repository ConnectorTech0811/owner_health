const express = require('express');
const router = express.Router();
const {
  createCustomAnamnesis,
  getDoctorCustomAnamnesis,
  getAllCustomAnamnesis,
  getCustomAnamnesisDetail,
  deleteCustomAnamnesis
} = require('../controllers/doctorCustomAnamnesisController');

router.post('/', createCustomAnamnesis);
router.get('/all', getAllCustomAnamnesis);
router.get('/doctor/:medico_id', getDoctorCustomAnamnesis);
router.get('/:id', getCustomAnamnesisDetail);
router.delete('/:id', deleteCustomAnamnesis);

module.exports = router;
