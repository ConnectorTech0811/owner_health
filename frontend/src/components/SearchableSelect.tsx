import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SearchableOption {
  id: string | number;
  label: string;
  sublabel?: string;
  extra?: string;
  raw?: any;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number | null | undefined;
  onChange: (value: string | number | null, option?: SearchableOption) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
}

const normalizeText = (text?: string | null) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const normalizeDigits = (text?: string | null) => {
  if (!text) return '';
  return text.replace(/\D/g, '');
};

const ITEMS_PER_PAGE = 8;

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Digite para buscar...',
  label,
  required = false,
  disabled = false,
  className = '',
  emptyMessage = 'Nenhum resultado encontrado.',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resetar página de paginação ao mudar busca ou abrir dropdown
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isOpen]);

  // Filtrar opções dinamicamente por Nome, CPF, CRM, sublabel, etc.
  const filteredOptions = options.filter(opt => {
    if (!searchTerm.trim()) return true;
    const termNorm = normalizeText(searchTerm.trim());
    const termDigits = normalizeDigits(searchTerm);

    const labelNorm = normalizeText(opt.label);
    const sublabelNorm = normalizeText(opt.sublabel);
    const extraNorm = normalizeText(opt.extra);

    const labelDigits = normalizeDigits(opt.label);
    const sublabelDigits = normalizeDigits(opt.sublabel);

    const matchText = labelNorm.includes(termNorm) || sublabelNorm.includes(termNorm) || extraNorm.includes(termNorm);
    const matchDigits = termDigits.length >= 2 && (labelDigits.includes(termDigits) || sublabelDigits.includes(termDigits));

    return matchText || matchDigits;
  });

  const totalPages = Math.ceil(filteredOptions.length / ITEMS_PER_PAGE) || 1;
  const paginatedOptions = filteredOptions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelect = (option: SearchableOption) => {
    onChange(option.id, option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, undefined);
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (!disabled) setIsOpen(true);
  };

  // Valor do único input de busca:
  // Se está aberto: mostra o que o usuário está digitando (searchTerm)
  // Se está fechado: mostra a opção selecionada ou vazio
  const displayValue = isOpen
    ? searchTerm
    : selectedOption
    ? `${selectedOption.label}${selectedOption.sublabel ? ` (${selectedOption.sublabel})` : ''}`
    : '';

  const displayPlaceholder = isOpen && selectedOption
    ? `${selectedOption.label}${selectedOption.sublabel ? ` (${selectedOption.sublabel})` : ''}`
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Campo de Entrada Único / Trigger */}
      <div
        className={`relative flex items-center bg-slate-50 border rounded-xl transition ${
          isOpen
            ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <span className="pl-3.5 text-slate-400 pointer-events-none flex items-center shrink-0">
          <Search className="w-4 h-4 text-indigo-500/80" />
        </span>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={displayPlaceholder}
          className="w-full bg-transparent pl-2.5 pr-8 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
        />

        <div className="absolute right-2.5 flex items-center gap-1 text-slate-400">
          {(selectedOption || searchTerm) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-red-500 hover:bg-slate-100 rounded-md transition cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(prev => !prev)}
            className="p-1 hover:text-indigo-600 transition cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Options Dropdown ONLY (sem segundo input duplicado!) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn space-y-2 p-2 max-w-full">
          {/* Listagem de Opções */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                {emptyMessage}
              </div>
            ) : (
              paginatedOptions.map(opt => {
                const isSelected = String(opt.id) === String(value);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-100'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-slate-800">{opt.label}</div>
                      {(opt.sublabel || opt.extra) && (
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {opt.sublabel && <span>{opt.sublabel}</span>}
                          {opt.sublabel && opt.extra && <span> • </span>}
                          {opt.extra && <span>{opt.extra}</span>}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Controle de Paginação (se > 8 itens) */}
          {filteredOptions.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 px-2 text-[11px] font-semibold text-slate-500">
              <span>
                { (currentPage - 1) * ITEMS_PER_PAGE + 1 } - { Math.min(currentPage * ITEMS_PER_PAGE, filteredOptions.length) } de { filteredOptions.length }
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer disabled:cursor-not-allowed text-[10px] font-bold"
                >
                  Anterior
                </button>
                <span className="px-1 text-slate-400 text-[10px]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer disabled:cursor-not-allowed text-[10px] font-bold"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
