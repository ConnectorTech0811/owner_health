const express = require('express');
const router = express.Router();
const { getExams, createExam, updateExam, deleteExam } = require('../controllers/examController');

router.get('/client/:cliente_id', getExams);
router.post('/client/:cliente_id', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

module.exports = router;
