/* 
  File: sales-report.js
  Purpose: Sales report logic (filtering and export)
  Author: Saritwatt
  Date: 22 Oct 2025
*/
function fmt(n){ return Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function csv(rows){ return rows.map(r => r.map(v => '"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n'); }

const tbody = document.querySelector('#sales-tbody');
const from = document.querySelector('#from');
const to = document.querySelector('#to');
const group = document.querySelector('#group');
const btnApply = document.querySelector('#btn-apply');
const btnExport = document.querySelector('#btn-export');

/* demo data generator (replace with API later) */
function genDemo() {
  const base = new Date(); base.setHours(0,0,0,0);
  const days = 30, rows = [];
  for (let i=days-1; i>=0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    const orders = Math.floor(20 + Math.random()*25);
    const items = Math.floor(orders * (1.4 + Math.random()*0.8));
    const subtotal = items * (20 + Math.random()*30);
    const tax = subtotal * 0.07;
    rows.push({ date: d, orders, items, subtotal, tax, total: subtotal + tax });
  }
  return rows;
}
const data = genDemo();

function dstr(d){ return d.toISOString().slice(0,10); }
function inRange(d, a, b){ return (!a || d >= a) && (!b || d <= b); }

function aggregate(rows, mode){
  if (mode === 'daily') {
    return rows.map(r => ({ key: dstr(r.date), ...r }));
  }
  const bucket = new Map();
  rows.forEach(r => {
    let key;
    if (mode === 'weekly') {
      const tmp = new Date(r.date);
      const day = (tmp.getDay()+6)%7; // Monday=0
      tmp.setDate(tmp.getDate() - day);
      key = 'Wk ' + dstr(tmp);
    } else {
      key = r.date.getFullYear() + '-' + String(r.date.getMonth()+1).padStart(2,'0');
    }
    const v = bucket.get(key) || { key, orders:0, items:0, subtotal:0, tax:0, total:0 };
    v.orders += r.orders; v.items += r.items;
    v.subtotal += r.subtotal; v.tax += r.tax; v.total += r.total;
    bucket.set(key, v);
  });
  return Array.from(bucket.values());
}

function render() {
  const a = from.value ? new Date(from.value) : null;
  const b = to.value ? new Date(to.value) : null;
  const rows = data.filter(r => inRange(r.date, a, b));
  const agg = aggregate(rows, group.value);

  tbody.innerHTML = '';
  agg.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.key}</td>
      <td>${r.orders}</td>
      <td>${r.items}</td>
      <td>${fmt(r.subtotal)}</td>
      <td>${fmt(r.tax)}</td>
      <td>${fmt(r.total)}</td>`;
    tbody.appendChild(tr);
  });
  return agg;
}
btnApply.addEventListener('click', render);
btnExport.addEventListener('click', () => {
  const rows = [['Period','Orders','Items','Subtotal','Tax','Total']]
    .concat(render().map(r => [r.key, r.orders, r.items, r.subtotal, r.tax, r.total]));
  const blob = new Blob([csv(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'sales-report.csv'; a.click();
  URL.revokeObjectURL(url);
});
const last7 = new Date(); last7.setDate(last7.getDate()-7);
from.value = dstr(last7); to.value = dstr(new Date());
render();
