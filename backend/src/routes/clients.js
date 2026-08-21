const express = require('express');
const router = express.Router();
const { 
  getClients, 
  getClientById, 
  registerClient, 
  updateClient,
  toggleClientStatus,
  updateClientPayment,
  deleteClient,
  getPatientObservations,
  createPatientObservation,
  updatePatientObservation,
  deletePatientObservation
} = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');

// Cadastro de cliente é público
router.post('/register', registerClient);

// Rotas autenticadas
router.get('/', authenticateToken, getClients);
router.get('/:id', authenticateToken, getClientById);
router.get('/:id/observations', authenticateToken, getPatientObservations);
router.post('/:id/observations', authenticateToken, createPatientObservation);
router.put('/:id/observations/:obsId', authenticateToken, updatePatientObservation);
router.delete('/:id/observations/:obsId', authenticateToken, deletePatientObservation);
router.put('/:id', authenticateToken, updateClient);
router.put('/:id/toggle-status', authenticateToken, toggleClientStatus);
router.put('/:id/payment-status', authenticateToken, updateClientPayment);
router.delete('/:id', authenticateToken, deleteClient);

module.exports = router;
