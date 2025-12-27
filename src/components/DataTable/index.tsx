import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  ColumnOrderState,
  flexRender,
  SortDirection,
} from '@tanstack/react-table';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Student } from '../../types';
import { generateStudents } from '../../data/sampleData';
import './DataTable.css';
import { SortableRow } from './SortableRow';

const MAJORS = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History', 'Psychology'];
const STATUSES = ['active', 'graduated', 'suspended'] as const;

const STORAGE_KEYS = {
  COLUMN_ORDER: 'data-table-column-order',
  COLUMN_VISIBILITY: 'data-table-column-visibility',
  DATA: 'data-table-data'
};

const SortArrow = ({ direction, index }: { direction: SortDirection | false, index: number }) => (
  <span className="sort-arrow-container" aria-hidden="true">
    <svg 
      width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
      style={{ transform: direction === 'desc' ? 'rotate(180deg)' : 'none', opacity: !direction ? 0.3 : 1 }}
    >
      <path d="M8 3.5L4 7.5H12L8 3.5Z" />
    </svg>
    {direction && <span className="sort-index-badge">{index + 1}</span>}
  </span>
);

// Тип для видимости колонок
type ColumnVisibilityState = Record<string, boolean>;

const DataTable = () => {
  // Загрузка данных с сохранением в localStorage
  const [data, setData] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DATA);
    return saved ? JSON.parse(saved) : generateStudents(50);
  });
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{rowId: string, columnId: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([...STATUSES]);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number, colIndex: number }>({ rowIndex: 0, colIndex: 0 });
  
  // Состояния для Drag-and-drop и настроек
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLUMN_ORDER);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLUMN_VISIBILITY);
    return saved ? JSON.parse(saved) : {};
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const editingCellRef = useRef(editingCell);
  const focusedCellRef = useRef(focusedCell);
  
  // Настройки для DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Сохранение данных в localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLUMN_ORDER, JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLUMN_VISIBILITY, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  // Обновляем ref'ы при изменении состояний
  useEffect(() => {
    editingCellRef.current = editingCell;
  }, [editingCell]);

  useEffect(() => {
    focusedCellRef.current = focusedCell;
  }, [focusedCell]);

  // Применяем фильтр статусов к columnFilters
  useEffect(() => {
    setColumnFilters((prev: ColumnFiltersState) => {
      const otherFilters = prev.filter(f => f.id !== 'status');
      if (selectedStatus.length === 0 || selectedStatus.length === STATUSES.length) {
        return otherFilters;
      }
      return [...otherFilters, { id: 'status', value: selectedStatus }];
    });
  }, [selectedStatus]);

  const getAriaSort = (direction: SortDirection | false): "none" | "ascending" | "descending" => {
    if (direction === 'asc') return 'ascending';
    if (direction === 'desc') return 'descending';
    return 'none';
  };

  const validate = (columnId: string, value: string): string | null => {
    const v = value.trim();
    switch (columnId) {
      case 'name': return v.length < 2 ? 'Минимум 2 символа' : null;
      case 'age': {
        const age = parseInt(v);
        return isNaN(age) || age < 16 || age > 100 ? 'Возраст: 16-100' : null;
      }
      case 'grade': {
        const grade = parseInt(v);
        return isNaN(grade) || grade < 0 || grade > 100 ? 'Оценка: 0-100' : null;
      }
      case 'email': {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Некорректный email';
      }
      default: return null;
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCellRef.current) return;
    
    const tableElement = tableRef.current;
    if (!tableElement) return;
    
    const rows = tableElement.querySelectorAll('tbody tr');
    const headerCells = tableElement.querySelectorAll('thead th');
    
    if (rows.length === 0 || headerCells.length === 0) return;
    
    const { rowIndex, colIndex } = focusedCellRef.current;
    const rowCount = rows.length;
    const colCount = headerCells.length;

    switch (e.key) {
      case 'ArrowUp': 
        e.preventDefault(); 
        setFocusedCell(p => ({ ...p, rowIndex: Math.max(0, p.rowIndex - 1) })); 
        break;
      case 'ArrowDown': 
        e.preventDefault(); 
        setFocusedCell(p => ({ ...p, rowIndex: Math.min(rowCount - 1, p.rowIndex + 1) })); 
        break;
      case 'ArrowLeft': 
        e.preventDefault(); 
        setFocusedCell(p => ({ ...p, colIndex: Math.max(0, p.colIndex - 1) })); 
        break;
      case 'ArrowRight': 
        e.preventDefault(); 
        setFocusedCell(p => ({ ...p, colIndex: Math.min(colCount - 1, p.colIndex + 1) })); 
        break;
      case 'Enter':
        e.preventDefault();
        const cellElement = rows[rowIndex]?.querySelectorAll('td')[colIndex];
        if (cellElement && !cellElement.querySelector('input[type="checkbox"]') && !cellElement.classList.contains('drag-handle')) {
          const rowId = cellElement.getAttribute('data-rowid') || rows[rowIndex].getAttribute('data-rowid');
          const columnId = cellElement.getAttribute('data-columnid') || headerCells[colIndex].getAttribute('data-columnid');
          const cellValue = cellElement.textContent || '';
          
          if (rowId && columnId && columnId !== 'select' && columnId !== 'id' && columnId !== 'drag') {
            handleDoubleClick(rowId, columnId, cellValue);
          }
        }
        break;
    }
  }, []);

  // Обработчик клика для мультисортировки
  const handleSortClick = (columnId: string) => {
    const existingSort = sorting.find(s => s.id === columnId);
    
    if (!existingSort) {
      // Добавляем новую сортировку в начало
      setSorting(prev => [{ id: columnId, desc: false }, ...prev]);
    } else if (!existingSort.desc) {
      // Меняем направление существующей сортировки
      setSorting(prev => prev.map(s => 
        s.id === columnId ? { ...s, desc: true } : s
      ));
    } else {
      // Удаляем сортировку
      setSorting(prev => prev.filter(s => s.id !== columnId));
    }
  };

  // Получаем порядковый номер сортировки для колонки
  const getSortIndex = (columnId: string) => {
    return sorting.findIndex(s => s.id === columnId);
  };

  // Получаем направление сортировки для колонки
  const getSortDirection = (columnId: string): SortDirection | false => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return false;
    return sort.desc ? 'desc' : 'asc';
  };

  // Drag-and-drop обработчики для строк
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setDragOverIndex(null);
    
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.findIndex(item => item.id === active.id);
        const newIndex = prev.findIndex(item => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleDragOver = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  useEffect(() => {
    if (!editingCell && tableRef.current) {
      const el = tableRef.current.querySelector(
        `[data-row="${focusedCell.rowIndex}"][data-col="${focusedCell.colIndex}"]`
      ) as HTMLElement;
      el?.focus();
    }
  }, [focusedCell, editingCell]);

  const handleDoubleClick = (rowId: string, columnId: string, value: any) => {
    setEditingCell({ rowId, columnId });
    setEditValue(String(value || ''));
    setValidationError(null);
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const error = validate(editingCell.columnId, editValue);
    if (error) { 
      setValidationError(error); 
      return; 
    }
    
    setData(prev => prev.map(row => 
      row.id === editingCell.rowId 
        ? { 
            ...row, 
            [editingCell.columnId]: ['age', 'grade'].includes(editingCell.columnId) 
              ? parseInt(editValue) 
              : editValue 
          } 
        : row
    ));
    setEditingCell(null);
  };

  // Восстановление настроек по умолчанию
  const resetSettings = () => {
    if (window.confirm('Сбросить все настройки таблицы?')) {
      localStorage.removeItem(STORAGE_KEYS.COLUMN_ORDER);
      localStorage.removeItem(STORAGE_KEYS.COLUMN_VISIBILITY);
      localStorage.removeItem(STORAGE_KEYS.DATA);
      
      setColumnOrder([]);
      setColumnVisibility({});
      setData(generateStudents(50));
      setSorting([]);
      setColumnFilters([]);
      setRowSelection({});
    }
  };

  // Переключение видимости колонки
  const toggleColumnVisibility = (columnId: string) => {
    setColumnVisibility((prev: ColumnVisibilityState) => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const renderInputCell = (info: any, type = 'text', suffix = '') => {
    const isEditing = editingCell?.rowId === info.row.original.id && editingCell?.columnId === info.column.id;
    if (isEditing) {
      return (
        <div className="edit-cell-container">
          <input 
            className={`cell-input ${validationError ? 'input-error' : ''}`}
            value={editValue} 
            type={type} 
            autoFocus
            onChange={e => { setEditValue(e.target.value); setValidationError(null); }}
            onBlur={saveEdit}
            onKeyDown={e => { 
              if (e.key === 'Enter') saveEdit(); 
              if (e.key === 'Escape') setEditingCell(null); 
            }}
          />
          {validationError && <div className="error-tooltip">{validationError}</div>}
        </div>
      );
    }
    return (
      <div 
        className="cell-content" 
        onDoubleClick={() => handleDoubleClick(info.row.original.id, info.column.id, info.getValue())}
        data-rowid={info.row.original.id}
        data-columnid={info.column.id}
      >
        {info.getValue()}{suffix}
      </div>
    );
  };

  const renderSelectCell = (info: any, options: string[], isStatus = false) => {
    const val = info.getValue() as string;
    const isEditing = editingCell?.rowId === info.row.original.id && editingCell?.columnId === info.column.id;
    if (isEditing) {
      return (
        <select 
          className="cell-select" 
          value={editValue} 
          onChange={e => setEditValue(e.target.value)} 
          onBlur={saveEdit} 
          autoFocus
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return (
      <div 
        className="cell-content" 
        onDoubleClick={() => handleDoubleClick(info.row.original.id, info.column.id, val)}
        data-rowid={info.row.original.id}
        data-columnid={info.column.id}
      >
        {isStatus ? <span className={`status-badge status-${val}`}>{val}</span> : val}
      </div>
    );
  };

  // Drag handle компонент
  const DragHandle = () => (
    <div className="drag-handle" title="Перетащите для изменения порядка">
      ⋮⋮
    </div>
  );

  const columns = useMemo<ColumnDef<Student>[]>(() => [
    {
      id: 'drag',
      header: () => <div className="drag-header">↕️</div>,
      cell: () => <DragHandle />,
      size: 40,
    },
    {
      id: 'select',
      header: ({ table }) => (
        <input 
          type="checkbox" 
          checked={table.getIsAllRowsSelected()} 
          onChange={table.getToggleAllRowsSelectedHandler()} 
          aria-label="Выбрать все" 
        />
      ),
      cell: ({ row }) => (
        <input 
          type="checkbox" 
          checked={row.getIsSelected()} 
          onChange={row.getToggleSelectedHandler()} 
          aria-label="Выбрать строку" 
        />
      ),
      size: 40,
    },
    { 
      accessorKey: 'id', 
      header: 'ID',
      cell: (info) => <div className="cell-content">{info.getValue() as string}</div>,
      size: 60,
    },
    { 
      accessorKey: 'name', 
      header: 'Имя', 
      cell: (info) => renderInputCell(info),
      size: 150,
    },
    { 
      accessorKey: 'age', 
      header: 'Возраст', 
      cell: (info) => renderInputCell(info, 'number'),
      size: 80,
    },
    { 
      accessorKey: 'major', 
      header: 'Предмет', 
      cell: (info) => renderSelectCell(info, MAJORS),
      size: 150,
    },
    { 
      accessorKey: 'status', 
      header: 'Статус',
      filterFn: 'arrIncludesSome' as any,
      cell: (info) => renderSelectCell(info, [...STATUSES], true),
      size: 100,
    },
    { 
      accessorKey: 'grade', 
      header: 'Баллы', 
      cell: (info) => renderInputCell(info, 'number'),
      size: 80,
    },
    { 
      accessorKey: 'email', 
      header: 'Email', 
      cell: (info) => renderInputCell(info, 'email'),
      size: 200,
    }
  ], [editingCell, editValue, validationError]);

  const table = useReactTable({
    data, 
    columns, 
    state: { sorting, columnFilters, rowSelection, globalFilter, columnOrder, columnVisibility },
    enableMultiSort: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const exportToCSV = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 
      ? selectedRows.map(r => r.original) 
      : table.getFilteredRowModel().rows.map(r => r.original);

    const headers = ['ID', 'Имя', 'Возраст', 'Баллы', 'Email', 'Предмет', 'Статус'];
    const csvContent = [
      headers.join(','),
      ...rowsToExport.map(r => [r.id, r.name, r.age, r.grade, r.email, r.major, r.status].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-table-container">
      <div className="table-header-actions">
        <div className="search-status-group">
          <input 
            className="global-search-input"
            placeholder="Поиск по всем полям..." 
            value={globalFilter ?? ''} 
            onChange={e => setGlobalFilter(e.target.value)} 
          />
          <div className="status-multi-filter">
            <span className="label">Статусы:</span>
            {STATUSES.map(s => (
              <button 
                key={s} 
                className={`filter-tag ${selectedStatus.includes(s) ? 'active' : ''}`}
                onClick={() => setSelectedStatus(prev => 
                  prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bulk-actions">
          <div className="table-settings">
            <button 
              className="action-btn settings" 
              onClick={() => {
                const menu = document.getElementById('column-menu');
                if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
              }}
            >
              Настройки
            </button>
            <div className="column-menu" id="column-menu" style={{ display: 'none' }}>
              <div className="menu-header">
                <span>Видимость колонок</span>
                <button 
                  className="close-menu" 
                  onClick={() => {
                    const menu = document.getElementById('column-menu');
                    if (menu) menu.style.display = 'none';
                  }}
                >
                  ×
                </button>
              </div>
              {columns.filter(col => col.id !== 'drag').map(column => (
                <label key={column.id} className="menu-item">
                  <input 
                    type="checkbox" 
                    checked={!columnVisibility[column.id as string]}
                    onChange={() => toggleColumnVisibility(column.id as string)}
                  />
                  <span>
                    {column.id === 'select' ? 'Выбор' : 
                     column.id === 'id' ? 'ID' : 
                     typeof (column as any).header === 'function' ? 
                       (column as any).header({}) : 
                       (column as any).header || column.id}
                  </span>
                </label>
              ))}
              <div className="menu-footer">
                <button className="action-btn small reset" onClick={resetSettings}>
                  Сбросить все
                </button>
              </div>
            </div>
          </div>
          <button 
            className="action-btn reset" 
            onClick={() => setSorting([])} 
            disabled={sorting.length === 0}
          >
            Сброс сортировки ({sorting.length})
          </button>
          <button 
            className="action-btn export" 
            onClick={exportToCSV}
          >
            Экспорт в CSV ({Object.keys(rowSelection).length || 'все'})
          </button>
          <button 
            className="action-btn delete" 
            onClick={() => {
              const ids = table.getSelectedRowModel().rows.map(r => r.original.id);
              if (ids.length && window.confirm(`Удалить ${ids.length} строк?`)) {
                setData(prev => prev.filter(d => !ids.includes(d.id)));
                setRowSelection({});
              }
            }} 
            disabled={Object.keys(rowSelection).length === 0}
          >
            Удалить выбранное
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="table-viewport">
          <table 
            ref={tableRef} 
            className="main-data-table" 
            role="grid" 
            onKeyDown={handleKeyDown}
            data-rowcount={table.getRowModel().rows.length}
          >
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} role="row">
                  {hg.headers.map((header, colIdx) => {
                    const columnId = header.column.id;
                    const sortIndex = getSortIndex(columnId);
                    const sortDirection = getSortDirection(columnId);
                    
                    return (
                      <th 
                        key={header.id} 
                        role="columnheader" 
                        aria-sort={getAriaSort(sortDirection)}
                        data-columnid={columnId}
                        data-columnindex={colIdx}
                        style={{ width: header.column.getSize() }}
                      >
                        {columnId === 'drag' ? (
                          <div className="header-cell-inner">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        ) : (
                          <div 
                            className="header-cell-inner" 
                            onClick={() => columnId !== 'drag' && handleSortClick(columnId)}
                            style={{ cursor: columnId !== 'drag' ? 'pointer' : 'default' }}
                            title={columnId !== 'drag' ? "Клик: добавить сортировку (asc)\nПовторный клик: изменить направление (desc)\nТретий клик: убрать сортировку" : ""}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {columnId !== 'drag' && columnId !== 'select' && (
                              <SortArrow 
                                direction={sortDirection} 
                                index={sortIndex} 
                              />
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody role="rowgroup">
              <SortableContext items={data.map(item => item.id)} strategy={verticalListSortingStrategy}>
                {table.getRowModel().rows.map((row, rIdx) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    index={rIdx}
                    isDragging={isDragging}
                    dragOverIndex={dragOverIndex}
                    focusedCell={focusedCell}
                    editingCell={editingCell}
                    setFocusedCell={setFocusedCell}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>

      <div className="table-pagination-footer">
        <div className="footer-info">
          {sorting.length > 0 && (
            <span className="sort-info">
              Сортировка по: {sorting.map((s, i) => (
                <span key={s.id} className="sort-tag">
                  {s.id} ({s.desc ? 'desc' : 'asc'}){i < sorting.length - 1 ? ', ' : ''}
                </span>
              ))}
            </span>
          )}
          <span>Всего: {table.getFilteredRowModel().rows.length} записей</span>
          <span className="drag-hint" style={{ opacity: 0.7, fontSize: '12px', marginLeft: '10px' }}>
            ↕️ Перетаскивайте строки для изменения порядка
          </span>
        </div>
        
        <div className="pagination-controls">
          <button 
            onClick={() => table.previousPage()} 
            disabled={!table.getCanPreviousPage()}
          >
            Назад
          </button>
          <span className="page-indicator">
            Страница {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button 
            onClick={() => table.nextPage()} 
            disabled={!table.getCanNextPage()}
          >
            Вперед
          </button>
          <select 
            className="page-size-select" 
            value={table.getState().pagination.pageSize} 
            onChange={e => table.setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(sz => <option key={sz} value={sz}>По {sz}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DataTable;