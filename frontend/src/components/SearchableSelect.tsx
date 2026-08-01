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
  placeholder = 'Selecione ou digite para buscar por Nome ou CPF...',
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no input de busca ao abrir e resetar paginação
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  // Resetar página ao mudar termo de busca
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`w-full text-left bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none transition flex items-center justify-between gap-2 cursor-pointer ${
          isOpen ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20' : 'hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <span className={`truncate ${selectedOption ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
          {selectedOption
            ? `${selectedOption.label}${selectedOption.sublabel ? ` (${selectedOption.sublabel})` : ''}`
            : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedOption && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:text-red-500 hover:bg-slate-100 rounded-md transition cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </div>
      </button>

      {/* Floating Dropdown Overlay (Paginated & Mobile Responsive) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fadeIn space-y-2 p-2 max-w-full">
          {/* Search Field */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Digite o nome ou CPF para buscar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List (Max 8 items per view) */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-100'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-slate-800">{opt.label}</div>
                      {(opt.sublabel || opt.extra) && (
                        <div className="text-[10px] text-slate-400 font-medium">
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

          {/* Pagination Controls for > 8 items */}
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
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-1 text-slate-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 transition cursor-pointer disabled:cursor-not-allowed"
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
