import React, { useState, useMemo, useEffect } from 'react';
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
} from '@tanstack/react-table';
import { Student } from '../../types';
import { generateStudents } from '../../data/sampleData';
import './DataTable.css';

const DataTable = () => {
  // Генерируем данные
  const [data, setData] = useState<Student[]>(() => generateStudents(50));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Определяем колонки таблицы
  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'age',
        header: 'Age',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'grade',
        header: 'Grade',
        cell: info => `${info.getValue()}%`,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'major',
        header: 'Major',
        cell: info => info.getValue(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: info => (
          <span className={`status-badge status-${info.getValue()}`}>
            {String(info.getValue())}
          </span>
        ),
      },
    ],
    []
  );

  // Создаем экземпляр таблицы
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

  return (
    <div className="data-table-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="global-search"
        />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'sortable-header' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="pagination-controls">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
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
          >
            Next
          </button>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
            }}
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