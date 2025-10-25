/* 
  File: inventory-report.js
  Purpose: Inventory report logic (filter & export)
  Author: Saritwatt
  Date: 22 Oct 2025
*/
function fmt(n){ return Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function csv(rows){ return rows.map(r => r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n'); }

const tbody = document.querySelector('#inv-tbody');
const onlyLow = document.querySelector('#only-low');
const btnExport = document.querySelector('#btn-export-inv');

/* Load from localStorage (compatible with your Product Management demo) */
function loadProducts(){
  const raw = localStorage.getItem('sv_products');
  try { return raw ? JSON.parse(raw) : []; } catch(e){ return []; }
}
function status(p){
  if (p.qty <= 0) return 'Out of stock';
  if (p.qty <= p.threshold) return 'Low stock';
  return 'In stock';
}
function valuation(p){ return Number(p.price) * Number(p.qty); }

function render(){
  const products = loadProducts();
  const rows = (onlyLow.checked) ? products.filter(p => p.qty <= p.threshold) : products;

  tbody.innerHTML = '';
  rows.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.code}</td>
      <td>${p.name}</td>
      <td>${p.qty}</td>
      <td>${p.threshold}</td>
      <td>${fmt(p.price)}</td>
      <td>${fmt(valuation(p))}</td>
      <td><span class="badge">${status(p)}</span></td>`;
    tbody.appendChild(tr);
  });
  return rows;
}

btnExport.addEventListener('click', () => {
  const rows = [['Code','Name','Qty','Threshold','Unit Price','Value','Status']]
    .concat(render().map(p => [p.code, p.name, p.qty, p.threshold, p.price, valuation(p), status(p)]));
  const blob = new Blob([csv(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'inventory-report.csv'; a.click();
  URL.revokeObjectURL(url);
});

onlyLow.addEventListener('change', render);
render();
