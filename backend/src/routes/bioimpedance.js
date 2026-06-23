const express = require('express');
const router = express.Router();
const { getBioimpedance, createBioimpedance, deleteBioimpedance } = require('../controllers/bioimpedanceController');

router.get('/client/:cliente_id', getBioimpedance);
router.post('/client/:cliente_id', createBioimpedance);
router.delete('/:id', deleteBioimpedance);

module.exports = router;
