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
  
  const numbers = cnpj.toString().match(/\d/g)?.map(Number);
  
  if (!numbers || numbers.length !== 14) return false;
  
  const items = [...new Set(numbers)];
  if (items.length === 1) return false;
  
  const calc = (x: number) => {
    const slice = numbers.slice(0, x);
    let factor = x - 7;
    let sum = 0;
    
    for (let i = x; i >= 1; i--) {
      const n = slice[x - i];
      sum += n * factor--;
      if (factor < 2) factor = 9;
    }
    
    const result = 11 - (sum % 11);
    return result > 9 ? 0 : result;
  };
  
  const digits = numbers.slice(12);
  const digit0 = calc(12);
  if (digit0 !== digits[0]) return false;
  
  const digit1 = calc(13);
  return digit1 === digits[1];
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
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
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
