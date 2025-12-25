import { useState, useEffect } from 'react';

interface TableSettings {
  columnVisibility: Record<string, boolean>;
  pageSize: number;
  sorting: any[];
}

export const useTableSettings = () => {
  const [settings, setSettings] = useState<TableSettings>(() => {
    const saved = localStorage.getItem('tableSettings');
    return saved ? JSON.parse(saved) : {
      columnVisibility: {},
      pageSize: 10,
      sorting: [],
    };
  });

  useEffect(() => {
    localStorage.setItem('tableSettings', JSON.stringify(settings));
  }, [settings]);

  return { settings, setSettings };
};