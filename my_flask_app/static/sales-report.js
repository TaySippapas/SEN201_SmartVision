/* 
  File: sales-report.js
  Purpose: Sales report logic (filtering and export)
  Author: Saritwatt
  Date: 22 Oct 2025
*/

function fmt(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function csv(rows) {
  return rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
}

const tbody = document.querySelector('#sales-tbody');
const from = document.querySelector('#from');
const to = document.querySelector('#to');
const group = document.querySelector('#group');
const btnApply = document.querySelector('#btn-apply');
const btnExport = document.querySelector('#btn-export');

// Render function
async function render() {
  const params = new URLSearchParams({
    from: from.value,
    to: to.value,
    group: group.value
  });

  const res = await fetch(`/sales-report/report-json?${params}`);
  const data = await res.json();

  tbody.innerHTML = '';

  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.period}</td>
      <td>${r.total_quantity ?? '-'}</td>
      <td>${fmt(r.total_amount ?? 0)}</td>
    `;
    tbody.appendChild(tr);
  });

  return data;
}

// Button listeners
btnApply.addEventListener('click', render);

btnExport.addEventListener('click', async () => {
  const data = await render();
  const rows = [['Period', 'Quantity Sold', 'Total Amount']]
    .concat(data.map(r => [r.period, r.total_quantity ?? 0, r.total_amount ?? 0]));
  const blob = new Blob([csv(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sales-report.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Set initial date range (last 7 days)
const last7 = new Date();
last7.setDate(last7.getDate() - 7);
from.value = last7.toISOString().slice(0, 10);
to.value = new Date().toISOString().slice(0, 10);

// Initial render
render();
