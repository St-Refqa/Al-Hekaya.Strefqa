import XLSX from 'xlsx';

async function run() {
  console.log("Reading Excel file...");
  const workbook = XLSX.readFile('توزيع منهج العهد الجديد فاضي.xlsx');
  const sheetNames = workbook.SheetNames;
  console.log("Sheet names in workbook:", sheetNames);
  
  for (const sheetName of sheetNames) {
    console.log(`\n--- Content of Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 50 rows of data
    data.slice(0, 50).forEach((row, idx) => {
      console.log(`Row ${idx + 1}:`, row);
    });
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
