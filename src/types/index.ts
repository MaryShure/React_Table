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
  visible: boolean;
  width?: number;
};