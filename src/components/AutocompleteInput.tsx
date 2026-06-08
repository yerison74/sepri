import React, { useEffect, useId, useRef, useState } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  loading?: boolean;
  placeholder?: string;
  minChars?: number;
  className?: string;
}

const INPUT_CLASS =
  'px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#42A5F5] focus:border-transparent w-full';

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  options,
  loading = false,
  placeholder,
  minChars = 2,
  className,
}) => {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const showSuggestions = open && value.trim().length >= minChars && (options.length > 0 || loading);

  useEffect(() => {
    setHighlighted(0);
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' && options[highlighted]) {
      event.preventDefault();
      selectOption(options[highlighted]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={className || INPUT_CLASS}
      />
      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">Buscando…</li>
          )}
          {options.map((option, index) => (
            <li
              key={`${option}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlighted ? 'bg-[#42A5F5]/10 text-[#1565C0]' : 'text-gray-800 hover:bg-gray-50'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => selectOption(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;
