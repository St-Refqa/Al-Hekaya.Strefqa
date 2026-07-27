const fetch = require('node-fetch');
const SHEET_ID = '1qLw0Md1-A9x8Vj_FWg_2B4j_cUOGTAmNTsdoASzvx-c';
fetch('https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:json&sheet=Products')
  .then(res => res.text())
  .then(text => {
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/)[1];
    const data = JSON.parse(jsonStr);
    console.log(data.table.rows.slice(0, 3));
  });
