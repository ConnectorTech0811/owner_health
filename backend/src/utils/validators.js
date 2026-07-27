/**
 * Valida CNPJ no formato tradicional (numérico) e no novo formato Alfanumérico (Receita Federal 2026+).
 * 
 * @param {string} cnpj 
 * @returns {boolean}
 */
const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false;

  const isString = typeof cnpj === 'string';
  const validTypes = isString || Number.isInteger(cnpj) || Array.isArray(cnpj);

  if (!validTypes) return false;

  const cleaned = cnpj.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (cleaned.length !== 14) return false;

  // Rejeita sequências de 14 caracteres idênticos (ex: "00000000000000")
  if (/^(.)\1{13}$/.test(cleaned)) return false;

  // Os 2 últimos dígitos (DVs) devem ser estritamente numéricos (0-9)
  if (!/^\d{2}$/.test(cleaned.slice(12))) return false;

  // Converte caracteres para valor ASCII - 48 (A=17 .. Z=42, '0'..'9'=0..9)
  const values = cleaned.split('').map(char => char.charCodeAt(0) - 48);

  const calcDV = (sliceLength, multipliers) => {
    let sum = 0;
    for (let i = 0; i < sliceLength; i++) {
      sum += values[i] * multipliers[i];
    }
    const resto = sum % 11;
    const dv = 11 - resto;
    return dv >= 10 ? 0 : dv;
  };

  const multDV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const multDV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const dv1 = calcDV(12, multDV1);
  if (dv1 !== values[12]) return false;

  const dv2 = calcDV(13, multDV2);
  return dv2 === values[13];
};

module.exports = {
  isValidCNPJ
};
