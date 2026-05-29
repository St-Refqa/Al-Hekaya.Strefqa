export function exportToCSV(filename: string, rows: any[][]) {
  const processRow = (row: any[]) => {
    return row.map(val => {
      if (val === null || val === undefined) return '""';
      let str = val.toString();
      if (val instanceof Date) {
        str = val.toLocaleString();
      }
      str = str.replace(/"/g, '""');
      if (str.search(/("|,|\n)/g) >= 0) {
        str = `"${str}"`;
      }
      return str;
    }).join(',');
  };

  const csvFile = rows.map(processRow).join('\n');
  const blob = new Blob(['\uFEFF' + csvFile], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('url');
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
