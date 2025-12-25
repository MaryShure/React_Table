export interface Student {
  id: string;
  name: string;
  age: number;
  grade: number;
  email: string;
  phone: string;
  major: string;
  enrollmentDate: string;
  graduationDate: string;
  status: 'active' | 'graduated' | 'suspended';
}

export type ColumnConfig = {
  id: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  editable: boolean;
  visible: boolean;
  width?: number;
  validation?: (value: any) => boolean;
};

export interface TableSettings {
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  pageSize: number;
  sorting: SortingRule[];
}

export interface SortingRule {
  id: string;
  desc: boolean;
}

export interface BulkAction {
  id: string;
  label: string;
  handler: (selectedIds: string[]) => void;
}