export const isValidCPF = (cpf: string): boolean => {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  const values = cpf.split('').map(el => parseInt(el));
  const rest = (count: number): number => {
    return (values.slice(0, count - 12).reduce((soma, el, index) => (soma + el * (count - index)), 0) * 10) % 11 % 10;
  };
  return rest(10) === values[9] && rest(11) === values[10];
};

export const isValidCNPJ = (cnpj: string): boolean => {
  if (!cnpj) return false;

  const isString = typeof cnpj === 'string';
  const validTypes = isString || Number.isInteger(cnpj) || Array.isArray(cnpj);

  if (!validTypes) return false;

  const cleaned = cnpj.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (cleaned.length !== 14) return false;

  // Rejeita sequências de 14 caracteres idênticos
  if (/^(.)\1{13}$/.test(cleaned)) return false;

  // Os 2 últimos dígitos (DVs) devem ser estritamente numéricos (0-9)
  if (!/^\d{2}$/.test(cleaned.slice(12))) return false;

  // Converte caracteres para valor ASCII - 48 (A=17 .. Z=42, '0'..'9'=0..9)
  const values = cleaned.split('').map(char => char.charCodeAt(0) - 48);

  const calcDV = (sliceLength: number, multipliers: number[]): number => {
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

export const isAdult = (dateString: string): boolean => {
  if (!dateString) return false;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
};

export const formatCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
};

export const formatCNPJ = (value: string): string => {
  if (!value) return '';
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);

  return clean
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')
    .replace(/\/([A-Z0-9]{4})([0-9])/, '/$1-$2');
};

export const formatCelular = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

export const formatCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
};
