/**
 * Formata o rótulo do perfil/cargo do profissional, identificando gênero para Secretário(a).
 * @param tipoProfissional - Código do perfil ('medico', 'secretario', 'secretaria', 'administrativo', etc.)
 * @param nome - Nome completo ou primeiro nome do profissional
 */
export const formatRoleName = (tipoProfissional?: string, nome?: string): string => {
  if (!tipoProfissional) return 'Profissional';
  const role = tipoProfissional.toLowerCase();

  if (role === 'medico') return 'Médico';
  if (role === 'administrativo' || role === 'admin') return 'Administrativo';
  if (role === 'clinica' || role === 'hospital') return 'Clínica / Hospital';

  if (role.includes('secretar') || role.includes('recepc')) {
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      return role === 'secretaria' ? 'Secretária' : 'Secretário';
    }

    const firstName = nome.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Nomes masculinos conhecidos terminados em A ou comuns
    const maleNames = ['luca', 'lucas', 'joshua', 'sasha', 'mustafa', 'jean', 'george', 'guilherme', 'felipe', 'henrique', 'alexandre', 'andre', 'jorge', 'jose', 'joao'];
    if (maleNames.includes(firstName)) return 'Secretário';

    // Nomes femininos em português terminam com 'a', 'is', 'iz', 'ete', 'ene', 'ine', 'elly', 'any', 'ele', 'y', 'ith', 'eth'
    if (
      firstName.endsWith('a') ||
      firstName.endsWith('is') ||
      firstName.endsWith('iz') ||
      firstName.endsWith('ete') ||
      firstName.endsWith('ene') ||
      firstName.endsWith('ine') ||
      firstName.endsWith('elly') ||
      firstName.endsWith('any') ||
      firstName.endsWith('ele') ||
      firstName.endsWith('y') ||
      firstName.endsWith('ith') ||
      firstName.endsWith('eth') ||
      role === 'secretaria'
    ) {
      return 'Secretária';
    }

    return 'Secretário';
  }

  return tipoProfissional;
};
