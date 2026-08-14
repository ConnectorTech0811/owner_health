const express = require('express');
const router = express.Router();
const {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  shareExam,
  getSharedExamByToken,
  markSharedExamAsRead,
  listSharedExams,
  removeSharedExamForDoctor,
  bulkRemoveSharedExamsForDoctor
} = require('../controllers/examController');
const { authenticateToken } = require('../middleware/auth');

// Rotas de Exames Gerais
router.get('/client/:cliente_id', getExams);
router.post('/client/:cliente_id', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);

// Rotas de Compartilhamento de Exames (LGPD / Links seguros por token)
router.post('/share', authenticateToken, shareExam);
router.post('/share-bulk/delete', authenticateToken, bulkRemoveSharedExamsForDoctor);
router.get('/shared-list', authenticateToken, listSharedExams);
router.get('/share/:token', authenticateToken, getSharedExamByToken);
router.put('/share/:token/read', authenticateToken, markSharedExamAsRead);
router.delete('/share/:token', authenticateToken, removeSharedExamForDoctor);

module.exports = router;
