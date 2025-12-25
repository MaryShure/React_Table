import React, { useState, useMemo, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { 
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  flexRender,
  Row,
} from '@tanstack/react-table';
import { Student } from '../../types';
import { generateStudents } from '../../data/sampleData';
import './DataTable.css';

// Константы для валидации
const VALID_MAJORS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Engineering',
  'Business',
  'Economics',
  'Psychology',
  'Literature',
  'History',
  'Art'
] as const;

const VALID_STATUSES = ['active', 'graduated', 'suspended'] as const;

// Типы для валидации
type ValidationRule = {
  pattern?: RegExp;
  min?: number;
  max?: number;
  required?: boolean;
  enum?: readonly string[];
  custom?: (value: string) => boolean;
};

type ValidationRules = {
  [key: string]: ValidationRule;
};

type ValidationError = {
  field: string;
  message: string;
};

// Тип для сообщений об ошибках
type ErrorMessages = {
  name: {
    required: string;
    pattern: string;
    custom: string;
  };
  age: {
    required: string;
    min: string;
    max: string;
  };
  grade: {
    required: string;
    min: string;
    max: string;
  };
  email: {
    required: string;
    pattern: string;
  };
  phone: {
    required: string;
    pattern: string;
  };
  major: {
    required: string;
    enum: string;
  };
  status: {
    required: string;
    enum: string;
  };
};

// Тип для навигации с клавиатуры
type FocusedCell = {
  rowId: string;
  columnId: string;
};

// SVG стрелочки для сортировки
const SortArrow = ({ direction }: { direction: 'asc' | 'desc' | 'none' }) => {
  return (
    <span className="sort-arrow">
      <svg 
        width="12" 
        height="12" 
        viewBox="0 0 16 16" 
        fill="currentColor"
        style={{
          transform: direction === 'desc' ? 'rotate(180deg)' : 'none',
          opacity: direction === 'none' ? 0.3 : 1
        }}
      >
        <path d="M8 3.5L4 7.5H12L8 3.5Z" />
      </svg>
    </span>
  );
};

const DataTable = () => {
  // Генерируем данные
  const [data, setData] = useState<Student[]>(() => generateStudents(50));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState<FocusedCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['active', 'graduated', 'suspended']);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  // Рефы для управления фокусом
  const tableRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Правила валидации для каждой колонки
  const validationRules: ValidationRules = useMemo(() => ({
    name: {
      required: true,
      pattern: /^[A-Za-zА-Яа-яЁё\s\-']{2,50}$/,
      custom: (value: string) => {
        return value.trim().split(' ').length >= 2;
      }
    },
    age: {
      required: true,
      min: 16,
      max: 100
    },
    grade: {
      required: true,
      min: 0,
      max: 100
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      required: true,
      pattern: /^\+?[\d\s\-\(\)]{10,15}$/
    },
    major: {
      required: true,
      enum: VALID_MAJORS
    },
    status: {
      required: true,
      enum: VALID_STATUSES
    }
  }), []);

  // Сообщения об ошибках для каждого поля
  const errorMessages: ErrorMessages = useMemo(() => ({
    name: {
      required: 'Name is required',
      pattern: 'Name must contain only letters, spaces, hyphens and apostrophes',
      custom: 'Please enter both first and last name'
    },
    age: {
      required: 'Age is required',
      min: 'Age must be at least 16',
      max: 'Age cannot exceed 100'
    },
    grade: {
      required: 'Grade is required',
      min: 'Grade cannot be negative',
      max: 'Grade cannot exceed 100'
    },
    email: {
      required: 'Email is required',
      pattern: 'Please enter a valid email address'
    },
    phone: {
      required: 'Phone is required',
      pattern: 'Please enter a valid phone number (10-15 digits)'
    },
    major: {
      required: 'Major is required',
      enum: 'Please select a valid major'
    },
    status: {
      required: 'Status is required',
      enum: 'Status must be: active, graduated, or suspended'
    }
  }), []);

  // Валидация значения
  const validateValue = (field: string, value: string): ValidationError | null => {
    const rules = validationRules[field];
    if (!rules) return null;

    const trimmedValue = value.trim();
    
    if (rules.required && !trimmedValue) {
      const errorMsg = (errorMessages as any)[field]?.required;
      return { field, message: errorMsg || 'This field is required' };
    }

    if (rules.enum && !rules.enum.includes(trimmedValue)) {
      const errorMsg = (errorMessages as any)[field]?.enum;
      return { field, message: errorMsg || 'Please select a valid value' };
    }

    if (rules.pattern && !rules.pattern.test(trimmedValue)) {
      const errorMsg = (errorMessages as any)[field]?.pattern;
      return { field, message: errorMsg || 'Invalid format' };
    }

    const numValue = parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      if (rules.min !== undefined && numValue < rules.min) {
        const errorMsg = (errorMessages as any)[field]?.min;
        return { field, message: errorMsg || `Value must be at least ${rules.min}` };
      }
      if (rules.max !== undefined && numValue > rules.max) {
        const errorMsg = (errorMessages as any)[field]?.max;
        return { field, message: errorMsg || `Value cannot exceed ${rules.max}` };
      }
    }

    if (rules.custom && !rules.custom(trimmedValue)) {
      const errorMsg = (errorMessages as any)[field]?.custom;
      return { field, message: errorMsg || 'Invalid value' };
    }

    return null;
  };

  // Очистка ошибок валидации
  const clearValidationErrors = (field?: string) => {
    if (field) {
      setValidationErrors(prev => prev.filter(error => error.field !== field));
    } else {
      setValidationErrors([]);
    }
  };

  // Сохранение изменений
  const saveEdit = useCallback(() => {
    if (!editingCell) return;

    const { rowId, columnId } = editingCell;
    
    const error = validateValue(columnId, editValue);
    if (error) {
      setValidationErrors(prev => [...prev.filter(e => e.field !== columnId), error]);
      return;
    }

    setData(prev => prev.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          [columnId]: convertValue(columnId, editValue)
        };
      }
      return row;
    }));

    setEditingCell(null);
    setEditValue('');
    clearValidationErrors(columnId);
    setFocusedCell({ rowId, columnId });
  }, [editingCell, editValue]);

  // Отмена редактирования
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    clearValidationErrors();
    if (focusedCell) {
      setFocusedCell(focusedCell);
    }
  }, [focusedCell]);

  // Конвертация значений
  const convertValue = (columnId: string, value: string): any => {
    switch (columnId) {
      case 'age':
      case 'grade':
        return parseInt(value) || 0;
      case 'status':
      case 'major':
        return value;
      default:
        return value;
    }
  };

  // Обработчик клика по заголовку колонки
  const handleColumnSort = (columnId: string) => {
    setSorting(prev => {
      const existingIndex = prev.findIndex(sort => sort.id === columnId);
      
      if (existingIndex >= 0) {
        const updatedSorting = [...prev];
        updatedSorting[existingIndex] = {
          ...updatedSorting[existingIndex],
          desc: !updatedSorting[existingIndex].desc
        };
        return updatedSorting;
      } else {
        return [...prev, { id: columnId, desc: false }];
      }
    });
  };

  // Сброс всей сортировки
  const clearAllSorting = () => {
    setSorting([]);
  };

  // Удаление сортировки по конкретной колонке
  const removeColumnSort = (columnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSorting(prev => prev.filter(sort => sort.id !== columnId));
  };

  // Фильтрация по статусу
  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(prev => {
      if (prev.includes(status)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // Выбрать все статусы
  const selectAllStatuses = () => {
    setSelectedStatus(['active', 'graduated', 'suspended']);
  };

  // Сбросить все фильтры
  const clearAllFilters = () => {
    setSelectedStatus(['active', 'graduated', 'suspended']);
    setColumnFilters([]);
    setGlobalFilter('');
    setValidationErrors([]);
  };

  // Применяем фильтры по статусу
  useEffect(() => {
    if (selectedStatus.length === 3) {
      setColumnFilters(prev => prev.filter(filter => filter.id !== 'status'));
      return;
    }
    
    setColumnFilters(prev => {
      const otherFilters = prev.filter(filter => filter.id !== 'status');
      
      if (selectedStatus.length > 0) {
        return [
          ...otherFilters,
          {
            id: 'status',
            value: selectedStatus
          }
        ];
      }
      
      return otherFilters;
    });
  }, [selectedStatus]);

  // Кастомная функция фильтрации для статуса
  const statusFilterFn = (row: Row<Student>, columnId: string, filterValue: string[]) => {
    if (!filterValue || filterValue.length === 0) return true;
    const value = row.getValue(columnId) as string;
    return filterValue.includes(value);
  };

  // Обработчик двойного клика для начала редактирования
  const handleDoubleClick = useCallback((rowId: string, columnId: string, value: any) => {
    if (columnId === 'select' || columnId === 'id') return;
    
    setEditingCell({ rowId, columnId });
    setEditValue(String(value));
    clearValidationErrors(columnId);
  }, []);

  // Обработчик клика по ячейке для навигации с клавиатуры
  const handleCellClick = useCallback((rowId: string, columnId: string) => {
    setFocusedCell({ rowId, columnId });
    setIsKeyboardMode(true);
  }, []);

  // Получение ошибки валидации для ячейки
  const getCellError = useCallback((rowId: string, columnId: string) => {
    if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
      return validationErrors.find(error => error.field === columnId);
    }
    return null;
  }, [editingCell, validationErrors]);

  // Экспорт в CSV
  const exportToCSV = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 ? selectedRows.map(row => row.original) : table.getFilteredRowModel().rows.map(row => row.original);
    
    const headers = ['ID', 'Name', 'Age', 'Grade', 'Email', 'Phone', 'Major', 'Status'];
    const csvContent = [
      headers.join(','),
      ...rowsToExport.map((row: Student) => {
        return [
          row.id,
          `"${row.name.replace(/"/g, '""')}"`,
          row.age,
          row.grade,
          `"${row.email.replace(/"/g, '""')}"`,
          `"${row.phone.replace(/"/g, '""')}"`,
          `"${row.major.replace(/"/g, '""')}"`,
          row.status
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Удаление выбранных строк
  const deleteSelectedRows = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => row.original.id);
    
    if (selectedIds.length === 0) {
      alert('Please select rows to delete');
      return;
    }
    
    if (window.confirm(`Delete ${selectedIds.length} selected row(s)?`)) {
      setData(prev => prev.filter(item => !selectedIds.includes(item.id)));
      setRowSelection({});
    }
  };

  // Определяем колонки таблицы с поддержкой редактирования
  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select row ${row.id}`}
          />
        ),
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: info => <span>{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as string;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-input ${error ? 'error' : ''}`}
                  autoFocus
                  placeholder="First Last"
                  aria-label="Edit name"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                />
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Name: ${value}`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              {value}
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'age',
        header: 'Age',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as number;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-input ${error ? 'error' : ''}`}
                  min="16"
                  max="100"
                  autoFocus
                  placeholder="16-100"
                  aria-label="Edit age"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                />
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Age: ${value}`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              {value}
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'grade',
        header: 'Grade',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as number;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-input ${error ? 'error' : ''}`}
                  min="0"
                  max="100"
                  step="0.1"
                  autoFocus
                  placeholder="0-100"
                  aria-label="Edit grade"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                />
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Grade: ${value}%`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              {value}%
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as string;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <input
                  ref={inputRef}
                  type="email"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-input ${error ? 'error' : ''}`}
                  autoFocus
                  placeholder="example@domain.com"
                  aria-label="Edit email"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                />
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Email: ${value}`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              {value}
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as string;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <input
                  ref={inputRef}
                  type="tel"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-input ${error ? 'error' : ''}`}
                  autoFocus
                  placeholder="+1234567890"
                  aria-label="Edit phone"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                />
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Phone: ${value}`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              {value}
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'major',
        header: 'Major',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as string;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <select
                  ref={inputRef as any}
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-select ${error ? 'error' : ''}`}
                  autoFocus
                  aria-label="Edit major"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                >
                  <option value="">Select a major</option>
                  {VALID_MAJORS.map(major => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Major: ${value}`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              {value}
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const rowId = info.row.original.id;
          const columnId = info.column.id;
          const value = info.getValue() as string;
          const error = getCellError(rowId, columnId);
          const isFocused = focusedCell?.rowId === rowId && focusedCell?.columnId === columnId;
          
          if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
            return (
              <div className="edit-container">
                <select
                  ref={inputRef as any}
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    clearValidationErrors(columnId);
                  }}
                  onBlur={saveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={`edit-select ${error ? 'error' : ''}`}
                  autoFocus
                  aria-label="Edit status"
                  aria-invalid={!!error}
                  aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
                >
                  <option value="">Select status</option>
                  {VALID_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {error && (
                  <span 
                    id={`error-${rowId}-${columnId}`}
                    className="error-message"
                    role="alert"
                  >
                    {error.message}
                  </span>
                )}
              </div>
            );
          }
          
          return (
            <div 
              onClick={() => handleCellClick(rowId, columnId)}
              onDoubleClick={() => handleDoubleClick(rowId, columnId, value)}
              className={`editable-cell ${error ? 'has-error' : ''} ${isFocused && isKeyboardMode ? 'keyboard-focused' : ''}`}
              title={error ? error.message : 'Double-click to edit'}
              tabIndex={0}
              role="gridcell"
              aria-label={`Status: ${value}`}
              aria-selected={isFocused}
              aria-invalid={!!error}
              aria-describedby={error ? `error-${rowId}-${columnId}` : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDoubleClick(rowId, columnId, value);
                }
              }}
            >
              <span className={`status-badge status-${value}`}>
                {value}
              </span>
              {error && <span className="error-indicator" role="alert">⚠</span>}
            </div>
          );
        },
        filterFn: statusFilterFn,
      },
    ],
    [editingCell, editValue, validationErrors, focusedCell, isKeyboardMode, getCellError, handleCellClick, handleDoubleClick, saveEdit, cancelEdit]
  );

  // Создаем экземпляр таблицы с правильными колонками
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Навигация с клавиатуры
  const navigateTable = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end') => {
    if (!focusedCell) return;

    const rows = table.getRowModel().rows;
    const columns = table.getAllColumns();
    
    const currentRowIndex = rows.findIndex(row => row.original.id === focusedCell.rowId);
    const currentColIndex = columns.findIndex(col => col.id === focusedCell.columnId);

    let newRowIndex = currentRowIndex;
    let newColIndex = currentColIndex;

    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, currentRowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(rows.length - 1, currentRowIndex + 1);
        break;
      case 'left':
        newColIndex = Math.max(0, currentColIndex - 1);
        break;
      case 'right':
        newColIndex = Math.min(columns.length - 1, currentColIndex + 1);
        break;
      case 'home':
        newColIndex = 0;
        break;
      case 'end':
        newColIndex = columns.length - 1;
        break;
    }

    if (newRowIndex !== currentRowIndex || newColIndex !== currentColIndex) {
      const newRow = rows[newRowIndex];
      const newColumn = columns[newColIndex];
      
      if (newRow && newColumn) {
        setFocusedCell({
          rowId: newRow.original.id,
          columnId: newColumn.id
        });
      }
    }
  }, [focusedCell, table]);

  // Обработчик клавиш для навигации
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isKeyboardMode) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateTable('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateTable('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateTable('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateTable('right');
        break;
      case 'Home':
        if (e.ctrlKey) {
          e.preventDefault();
          navigateTable('home');
        }
        break;
      case 'End':
        if (e.ctrlKey) {
          e.preventDefault();
          navigateTable('end');
        }
        break;
      case 'Enter':
      case ' ':
        if (focusedCell && !editingCell) {
          e.preventDefault();
          const row = table.getRowModel().rows.find(r => r.original.id === focusedCell.rowId);
          if (row) {
            const value = row.getValue(focusedCell.columnId);
            handleDoubleClick(focusedCell.rowId, focusedCell.columnId, value);
          }
        }
        break;
      case 'Escape':
        if (editingCell) {
          cancelEdit();
        } else {
          setFocusedCell(null);
          setIsKeyboardMode(false);
        }
        break;
      case 'Tab':
        setIsKeyboardMode(true);
        break;
    }
  }, [focusedCell, editingCell, isKeyboardMode, navigateTable, table, handleDoubleClick, cancelEdit]);

  // Фокусируемся на поле ввода при редактировании
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLSelectElement) {
        inputRef.current.size = Math.min(VALID_MAJORS.length + 1, 8);
      }
    }
  }, [editingCell]);

  // Устанавливаем фокус на первую ячейку при загрузке
  useEffect(() => {
    if (table.getRowModel().rows.length > 0 && !focusedCell) {
      const firstRow = table.getRowModel().rows[0];
      const firstColumn = table.getAllColumns().find(col => 
        col.id !== 'select' && col.id !== 'id'
      );
      if (firstRow && firstColumn) {
        setFocusedCell({
          rowId: firstRow.original.id,
          columnId: firstColumn.id
        });
      }
    }
  }, [table.getRowModel().rows, focusedCell]);

  // Обработчик глобальных клавиш
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !isKeyboardMode) {
        setIsKeyboardMode(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown as any);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown as any);
    };
  }, [isKeyboardMode]);

  // Подсчет отфильтрованных строк
  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalCount = data.length;

  // Получение описания для ARIA
  const getTableDescription = () => {
    const selectedCount = Object.keys(rowSelection).length;
    const pageInfo = `Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`;
    const filterInfo = filteredCount < totalCount ? `, filtered to ${filteredCount} of ${totalCount} records` : '';
    const sortInfo = sorting.length > 0 ? `, sorted by ${sorting.map(s => s.id).join(', ')}` : '';
    
    return `Students data table with ${totalCount} records${filterInfo}${sortInfo}. ${pageInfo}. ${selectedCount} rows selected.`;
  };

  return (
    <div 
      className="data-table-container"
      ref={tableRef}
      onKeyDown={handleKeyDown}
    >
      <div className="table-controls">
        <div className="controls-left">
          <input
            type="text"
            placeholder="Search in all columns..."
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="global-search"
            aria-label="Search table"
          />
          
          <div className="status-filter">
            <span className="filter-label">Status:</span>
            <div className="status-buttons" role="group" aria-label="Filter by status">
              <button
                className={`status-btn ${selectedStatus.includes('active') ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('active')}
                aria-pressed={selectedStatus.includes('active')}
                aria-label="Filter active students"
              >
                <span className="status-indicator active"></span>
                Active
              </button>
              <button
                className={`status-btn ${selectedStatus.includes('graduated') ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('graduated')}
                aria-pressed={selectedStatus.includes('graduated')}
                aria-label="Filter graduated students"
              >
                <span className="status-indicator graduated"></span>
                Graduated
              </button>
              <button
                className={`status-btn ${selectedStatus.includes('suspended') ? 'active' : ''}`}
                onClick={() => handleStatusFilterChange('suspended')}
                aria-pressed={selectedStatus.includes('suspended')}
                aria-label="Filter suspended students"
              >
                <span className="status-indicator suspended"></span>
                Suspended
              </button>
            </div>
          </div>
        </div>
        
        <div className="control-buttons">
          <button 
            onClick={clearAllSorting} 
            className="btn btn-clear-sort"
            disabled={sorting.length === 0}
            title="Clear all sorting"
            aria-label="Clear all sorting"
          >
            🗑️ Clear Sort
          </button>
          <button 
            onClick={clearAllFilters} 
            className="btn btn-clear-filters"
            disabled={selectedStatus.length === 3 && globalFilter === ''}
            title="Clear all filters"
            aria-label="Clear all filters"
          >
            🧹 Clear Filters
          </button>
          <button 
            onClick={exportToCSV} 
            className="btn btn-export"
            aria-label="Export to CSV"
          >
            Export CSV
          </button>
          <button 
            onClick={deleteSelectedRows} 
            className="btn btn-delete"
            aria-label="Delete selected rows"
          >
            Delete Selected
          </button>
        </div>
      </div>

      <div className="filter-info">
        {(filteredCount < totalCount || selectedStatus.length < 3) && (
          <div className="filter-stats">
            <span className="filter-count">
              Showing {filteredCount} of {totalCount} records
              {selectedStatus.length < 3 && (
                <span className="status-filter-info">
                  ∙ Filtered by status: {selectedStatus.map(s => s).join(', ')}
                </span>
              )}
              {globalFilter && (
                <span className="search-filter-info">
                  ∙ Search: "{globalFilter}"
                </span>
              )}
            </span>
            {selectedStatus.length < 3 && (
              <button 
                onClick={selectAllStatuses}
                className="btn-show-all"
                aria-label="Show all statuses"
              >
                Show all statuses
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sorting-info">
        {sorting.length > 0 && (
          <div className="active-sorting">
            <span className="sorting-label">Sorting order:</span>
            <div className="sorting-tags">
              {sorting.map((sort, index) => (
                <span key={sort.id} className="sorting-tag">
                  <span className="sort-order">{index + 1}</span>
                  <span className="sort-column">{sort.id}</span>
                  <span className="sort-direction">
                    {sort.desc ? '🔽' : '🔼'}
                  </span>
                  <button 
                    onClick={(e) => removeColumnSort(sort.id, e)}
                    className="remove-sort-btn"
                    title="Remove this sort"
                    aria-label={`Remove sort by ${sort.id}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <span className="sort-hint">
              Click column headers to add/change sorting
            </span>
          </div>
        )}
      </div>

      <div className="keyboard-hint" role="note" aria-live="polite">
        {isKeyboardMode 
          ? 'Keyboard navigation active. Use arrow keys to navigate, Enter or Space to edit, Escape to cancel.' 
          : 'Press Tab to activate keyboard navigation.'}
      </div>

      <div className="table-wrapper">
        <table 
          className="data-table"
          role="grid"
          aria-label="Students"
          aria-describedby="table-description"
          aria-rowcount={totalCount}
          aria-colcount={columns.length}
        >
          <caption id="table-description" className="sr-only">
            {getTableDescription()}
          </caption>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} role="row">
                {headerGroup.headers.map(header => {
                  const column = header.column;
                  const columnId = column.id;
                  const canSort = columnId !== 'id' && columnId !== 'select';
                  const isSorted = sorting.find(sort => sort.id === columnId);
                  const sortIndex = sorting.findIndex(sort => sort.id === columnId);
                  const sortDirection = isSorted?.desc ? 'descending' : 'ascending';
                  const ariaSort = isSorted ? sortDirection : 'none';
                  
                  return (
                    <th 
                      key={header.id} 
                      colSpan={header.colSpan}
                      role="columnheader"
                      aria-sort={ariaSort}
                      aria-colindex={header.index + 1}
                    >
                      <div className="header-content">
                        <div
                          className={canSort ? 'sortable-header' : ''}
                          onClick={canSort ? () => handleColumnSort(columnId) : undefined}
                          onKeyDown={(e) => {
                            if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              handleColumnSort(columnId);
                            }
                          }}
                          tabIndex={canSort ? 0 : -1}
                          role={canSort ? 'button' : undefined}
                          aria-label={`Sort by ${columnId}${isSorted ? `, currently sorted ${sortDirection}` : ''}`}
                        >
                          <span className="header-title">
                            {flexRender(
                              column.columnDef.header,
                              header.getContext()
                            )}
                            {sortIndex >= 0 && (
                              <span className="sort-order-number">
                                {sortIndex + 1}
                              </span>
                            )}
                          </span>
                          {canSort && (
                            <SortArrow 
                              direction={isSorted?.desc ? 'desc' : isSorted ? 'asc' : 'none'} 
                            />
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody ref={tableBodyRef} role="rowgroup">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, rowIndex) => {
                const isSelected = row.getIsSelected();
                const isFocusedRow = focusedCell?.rowId === row.original.id;
                
                return (
                  <tr 
                    key={row.id} 
                    className={isSelected ? 'selected' : ''}
                    role="row"
                    aria-rowindex={rowIndex + 1}
                    aria-selected={isSelected}
                    aria-label={`Student ${row.original.name}, ${row.original.major}`}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td 
                        key={cell.id}
                        role="gridcell"
                        aria-colindex={cellIndex + 1}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr className="no-results" role="row">
                <td 
                  colSpan={columns.length} 
                  className="empty-message"
                  role="gridcell"
                  aria-colspan={columns.length}
                >
                  No records found matching your filters.
                  {selectedStatus.length === 0 && (
                    <button 
                      onClick={selectAllStatuses}
                      className="btn-reset-filters"
                      aria-label="Reset status filters"
                    >
                      Reset status filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="selected-info">
          <span className="selected-count" role="status" aria-live="polite">
            {Object.keys(rowSelection).length} of {filteredCount} row(s) selected
          </span>
          <span className="edit-hint">
            Double-click any cell to edit | Press Enter to save, Escape to cancel
          </span>
          <span className="validation-hint" role="alert" aria-live="polite">
            {validationErrors.length > 0 
              ? `${validationErrors.length} validation error(s) present` 
              : 'All data is valid'}
          </span>
        </div>

        <div className="pagination-controls" role="navigation" aria-label="Pagination">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span>
            Page{' '}
            <strong>
              {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </strong>
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            Next
          </button>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
            }}
            aria-label="Rows per page"
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DataTable;   