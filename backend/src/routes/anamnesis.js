const express = require('express');
const router = express.Router();
const { getAnamnesis, createAnamnesis, updateAnamnesis } = require('../controllers/anamnesisController');
const {
  getSections, createSection, updateSection, deleteSection, reorderSections,
  getQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  getOptions, createOption, updateOption, deleteOption, updateOptions,
  getFullForm,
  submitResponse, getResponses, getResponseDetail, getCompanyResponses
} = require('../controllers/anamnesisFormController');

// ── Rotas legadas (compatibilidade) ──────────────────────────────────
router.get('/client/:cliente_id', getAnamnesis);
router.post('/client/:cliente_id', createAnamnesis);
router.put('/:id', updateAnamnesis);

// ── Formulário Completo (para renderização no paciente) ───────────────
router.get('/form/:empresa_id', getFullForm);

// ── Seções ────────────────────────────────────────────────────────────
router.get('/empresa/:empresa_id/sections', getSections);
router.post('/empresa/:empresa_id/sections', createSection);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);
router.put('/empresa/:empresa_id/sections/reorder', reorderSections);

// ── Perguntas ─────────────────────────────────────────────────────────
router.get('/sections/:section_id/questions', getQuestions);
router.post('/sections/:section_id/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.put('/sections/:section_id/questions/reorder', reorderQuestions);

// ── Opções ────────────────────────────────────────────────────────────
router.get('/questions/:question_id/options', getOptions);
router.post('/questions/:question_id/options', createOption);
router.put('/options/:id', updateOption);
router.delete('/options/:id', deleteOption);
router.put('/questions/:question_id/options/bulk', updateOptions);

// ── Respostas dos Pacientes ───────────────────────────────────────────
router.get('/responses/empresa/:empresa_id', getCompanyResponses);
router.get('/responses/client/:cliente_id', getResponses);
router.get('/responses/:id/detail', getResponseDetail);
router.post('/responses/client/:cliente_id', submitResponse);

module.exports = router;
