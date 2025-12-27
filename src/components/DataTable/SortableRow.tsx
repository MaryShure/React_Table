import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Row } from '@tanstack/react-table';
import { Student } from '../../types';
import { flexRender } from '@tanstack/react-table';

interface SortableRowProps {
  row: Row<Student>;
  index: number;
  isDragging: boolean;
  dragOverIndex: number | null;
  focusedCell: { rowIndex: number, colIndex: number };
  editingCell: { rowId: string, columnId: string } | null;
  setFocusedCell: (cell: { rowIndex: number, colIndex: number }) => void;
  handleDragOver: (index: number) => void;
  handleDragLeave: () => void;
}

export const SortableRow: React.FC<SortableRowProps> = ({
  row,
  index,
  isDragging,
  dragOverIndex,
  focusedCell,
  editingCell,
  setFocusedCell,
  handleDragOver,
  handleDragLeave,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isRowDragging,
  } = useSortable({ id: row.original.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isRowDragging ? 0.5 : 1,
  };

  const isDragOver = dragOverIndex === index;
  const dragOverClass = isDragOver ? 'drag-over' : '';
  const draggingClass = isDragging ? 'table-dragging' : '';

  // Для drag ячейки используем специальные атрибуты
  const getCellProps = (columnId: string, cIdx: number) => {
    const baseProps = {
      key: `${row.id}-${columnId}`,
      role: 'gridcell' as const,
      'data-row': index,
      'data-col': cIdx,
      tabIndex: focusedCell.rowIndex === index && focusedCell.colIndex === cIdx && !editingCell ? 0 : -1,
      onFocus: () => setFocusedCell({ rowIndex: index, colIndex: cIdx }),
      style: { width: row.getVisibleCells()[cIdx]?.column.getSize?.() || 'auto' },
    };

    if (columnId === 'drag') {
      return {
        ...baseProps,
        ...attributes,
        ...listeners,
        style: { 
          ...baseProps.style, 
          cursor: 'grab',
        },
      };
    }

    return baseProps;
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${row.getIsSelected() ? 'row-selected' : ''} ${dragOverClass} ${draggingClass}`}
      role="row"
      data-rowid={row.original.id}
      data-rowindex={index}
      onDragOver={() => handleDragOver(index)}
      onDragLeave={handleDragLeave}
    >
      {row.getVisibleCells().map((cell, cIdx) => {
        const columnId = cell.column.id;
        const cellProps = getCellProps(columnId, cIdx);
        
        return (
          <td {...cellProps}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
};