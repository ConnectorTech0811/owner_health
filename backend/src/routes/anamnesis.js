const express = require('express');
const router = express.Router();
const { getAnamnesis, createAnamnesis, updateAnamnesis } = require('../controllers/anamnesisController');

router.get('/client/:cliente_id', getAnamnesis);
router.post('/client/:cliente_id', createAnamnesis);
router.put('/:id', updateAnamnesis);

module.exports = router;
