-- OWNER HEALTH — Tabela de Acessos a Prontuários Médicos

CREATE TABLE IF NOT EXISTS paciente_medico_acessos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  medico_id INT NOT NULL,
  concedido_por VARCHAR(50) NOT NULL, -- 'clinica' ou 'paciente'
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_acesso (cliente_id, medico_id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (medico_id) REFERENCES profissionais(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
