const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Company/CompanyDashboard.tsx', 'utf8');

// 1. Remove the entire "Predição de Agenda Widget" div
// It starts with {/* Predição de Agenda Widget */} and ends before {/* Ações Administrativas Rápidas */}
const startIdx = content.indexOf('{/* Predição de Agenda Widget */}');
const endIdx = content.indexOf('{/* Ações Administrativas Rápidas */}');
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + content.substring(endIdx);
}

fs.writeFileSync('frontend/src/pages/Company/CompanyDashboard.tsx', content);
console.log('CompanyDashboard rewritten');
