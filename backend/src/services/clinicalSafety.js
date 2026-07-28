// Motor de Segurança Clínica e Decisão Médica (Owner Health Clinical Decision Support System)
// Realiza checagem automatizada de alergias e matriz de interações medicamentosas graves.

const DRUG_INTERACTION_MATRIX = [
  {
    droga1: ['Losartana', 'Enalapril', 'Captopril'],
    droga2: ['Espironolactona', 'Suplemento de Potássio'],
    gravidade: 'GRAVE',
    titulo: 'Risco de Hipercalemia Grave (Aumento de Potássio no Sangue)',
    descricao: 'A combinação de inibidores da ECA ou BRA com poupadores de potássio pode provocar arritmias cardíacas graves por elevação do potássio sérico. Monitorar potássio sérico e ECG.'
  },
  {
    droga1: ['Tramadol'],
    droga2: ['Sertralina', 'Fluoxetina', 'Escitalopram', 'Paroxetina'],
    gravidade: 'GRAVE',
    titulo: 'Risco de Síndrome Serotoninérgica',
    descricao: 'Uso concomitante de Tramadol com inibidores seletivos de recaptação de serotonina (ISRS) pode precipitar hipertensão, hipertermia, tremores e rigidez muscular grave.'
  },
  {
    droga1: ['Ibuprofeno', 'Cetoprofeno', 'Nimesulida', 'Aspirina'],
    droga2: ['Varfarina', 'Rivaroxabana', 'Apixabana', 'Clopidogrel'],
    gravidade: 'GRAVE',
    titulo: 'Risco Elevado de Hemorragia Gastrointestinal',
    descricao: 'AINEs inibem a agregação plaquetária e causam lesão da mucosa gástrica. Potencialização extrema do risco hemorrágico quando associados a anticoagulantes.'
  },
  {
    droga1: ['Omeprazol'],
    droga2: ['Clopidogrel'],
    gravidade: 'MODERADO',
    titulo: 'Redução da Eficácia Antiplaquetária',
    descricao: 'O Omeprazol inibe a enzima CYP2C19, necessária para converter o Clopidogrel em seu metabólito ativo, podendo reduzir a proteção contra eventos trombóticos.'
  },
  {
    droga1: ['Clonazepam', 'Diazepam', 'Alprazolam', 'Zolpidem'],
    droga2: ['Tramadol', 'Codeína', 'Morphina'],
    gravidade: 'GRAVE',
    titulo: 'Risco de Depressão Respiratória e Sedação Profunda',
    descricao: 'A associação de benzodiazepínicos/hipnóticos com opioides pode resultar em sedação profunda, depressão respiratória, coma e óbito.'
  },
  {
    droga1: ['Amoxicilina', 'Ciprofloxacino', 'Azitromicina'],
    droga2: ['Metformina'],
    gravidade: 'MODERADO',
    titulo: 'Monitoramento de Glicemia',
    descricao: 'Certas infecções e o uso de antibióticos podem descompensar o controle glicêmico em pacientes diabéticos.'
  }
];

const ALLERGY_FAMILY_MAP = {
  'penicilina': ['amoxicilina', 'ampicilina', 'clavulanato', 'penicilina', 'benzatina'],
  'sulfa': ['sulfametoxazol', 'sulfadiazina', 'bactrim'],
  'aines': ['ibuprofeno', 'cetoprofeno', 'nimesulida', 'aspirina', 'naproxeno', 'diclofenaco', 'meloxicam'],
  'dipirona': ['dipirona', 'novalgina', 'metamizol', 'anador'],
  'macrolideos': ['azitromicina', 'claritromicina', 'eritromicina']
};

function evaluateClinicalSafety(prescribedItems = [], patientAllergies = [], patientContinuousMeds = []) {
  const alerts = [];

  // 1. Checagem de Alergias
  if (Array.isArray(patientAllergies) && patientAllergies.length > 0) {
    const allergiesLower = patientAllergies.map(a => (typeof a === 'string' ? a : a.nome || '').toLowerCase());

    prescribedItems.forEach(item => {
      const itemText = (typeof item === 'string' ? item : `${item.nome || ''} ${item.principio_ativo || ''}`).toLowerCase();

      allergiesLower.forEach(allergy => {
        if (!allergy || allergy.trim() === '') return;
        
        let matchAllergy = false;
        if (itemText.includes(allergy)) {
          matchAllergy = true;
        } else {
          // Checagem por família farmacológica
          Object.entries(ALLERGY_FAMILY_MAP).forEach(([family, drugs]) => {
            if (allergy.includes(family) || drugs.some(d => allergy.includes(d))) {
              if (drugs.some(d => itemText.includes(d))) {
                matchAllergy = true;
              }
            }
          });
        }

        if (matchAllergy) {
          alerts.push({
            tipo: 'ALERGIA',
            gravidade: 'CRITICO',
            titulo: `⚠️ ALERTA CRÍTICO: Alergia a ${allergy.toUpperCase()} Detectada!`,
            descricao: `O medicamento prescrito "${typeof item === 'string' ? item : item.nome}" possui contraindicação formal com o histórico de alergia do paciente (${allergy}).`,
            itemAfetado: typeof item === 'string' ? item : item.nome
          });
        }
      });
    });
  }

  // 2. Checagem de Interações Medicamentosas (entre os próprios prescritos e com uso contínuo)
  const allCurrentMeds = [
    ...prescribedItems.map(i => (typeof i === 'string' ? i : i.nome || i.principio_ativo || '')),
    ...patientContinuousMeds.map(m => (typeof m === 'string' ? m : m.nome || ''))
  ].filter(Boolean);

  DRUG_INTERACTION_MATRIX.forEach(rule => {
    let hasGroup1 = false;
    let drug1Found = '';
    let hasGroup2 = false;
    let drug2Found = '';

    allCurrentMeds.forEach(med => {
      const medLower = med.toLowerCase();
      rule.droga1.forEach(d1 => {
        if (medLower.includes(d1.toLowerCase())) {
          hasGroup1 = true;
          drug1Found = med;
        }
      });
      rule.droga2.forEach(d2 => {
        if (medLower.includes(d2.toLowerCase())) {
          hasGroup2 = true;
          drug2Found = med;
        }
      });
    });

    if (hasGroup1 && hasGroup2 && drug1Found !== drug2Found) {
      alerts.push({
        tipo: 'INTERACAO',
        gravidade: rule.gravidade,
        titulo: `⚡ INTERAÇÃO MEDICAMENTOSA (${rule.gravidade}): ${drug1Found} + ${drug2Found}`,
        descricao: rule.descricao,
        itemAfetado: `${drug1Found} e ${drug2Found}`
      });
    }
  });

  return {
    seguro: alerts.length === 0,
    totalAlertas: alerts.length,
    alertas: alerts
  };
}

module.exports = {
  evaluateClinicalSafety,
  DRUG_INTERACTION_MATRIX
};
