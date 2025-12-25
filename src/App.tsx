import React from 'react';
import './App.css';
import DataTable from './components/DataTable';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Interactive Data Table</h1>
        <p>Таблица с сортировкой, фильтрацией, редактированием и экспортом</p>
        <p>Отображение 50+ записей студентов с возможностью управления</p>
      </header>
      <main>
        <DataTable />
      </main>
    </div>
  );
}

export default App;