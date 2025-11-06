/* 
  File: sales-report.js
  Purpose: Sales report UI logic (summary table, transactions modal, CSV export)
  Author: Saritwatt
  Date: 04 Nov 2025
*/

// Format numbers for currency
function fmt(n) 
{
  return Number(n).toLocaleString(undefined, 
    {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

document.addEventListener("DOMContentLoaded", () => 
  {
  const from = document.getElementById("from");
  const to = document.getElementById("to");
  const group = document.getElementById("group");
  const btnApply = document.getElementById("btn-apply");
  const btnExport = document.getElementById("btn-export");
  const tbodySummary = document.getElementById("sales-tbody");
  const modal = document.getElementById("transactions-modal");
  const tbodyTransactions = document.getElementById("transactions-tbody");
  const modalClose = document.getElementById("modal-close");

  let currentSummaryData = [];

  // --------------------
  // Date picker constraints
  // --------------------
  from.addEventListener("change", () => { to.min = from.value || ""; });
  to.addEventListener("change", () => { from.max = to.value || ""; });

  // --------------------
  // Load summary report data
  // --------------------
  async function loadSummaryReport() 
  {
    const params = new URLSearchParams
    ({
      from: from.value,
      to: to.value,
      group: group.value,
    });

    try 
    {
      const response = await fetch(`/sales-report/report-json?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load sales report.");
      const data = await response.json();
      currentSummaryData = data;
      renderSummaryTable(data);
    } 
    catch (err) 
    {
      console.error(err);
      tbodySummary.innerHTML = `<tr><td colspan="4" class="text-center">Error loading sales report</td></tr>`;
    }
  }

  // --------------------
  // Render summary table with "View Transactions" button
  // --------------------
  function renderSummaryTable(data) 
  {
    tbodySummary.innerHTML = "";
    if (!data.length) 
      {
      tbodySummary.innerHTML = `<tr><td colspan="4" class="text-center">No data found for selected range</td></tr>`;
      return;
    }

    data.forEach(row => 
      {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${row.total_quantity}</td>
        <td>${fmt(row.total_amount)}</td>
        <td></td>
      `;

      const btnTd = tr.querySelector("td:last-child");
      const btn = document.createElement("button");
      btn.textContent = "View Transactions";
      btn.className = "btn btn-small";
      btn.addEventListener("click", () => showTransactions(row.period));
      btnTd.appendChild(btn);

      tbodySummary.appendChild(tr);
    });
  }

  // --------------------
  // Show transactions modal for a specific day
  // --------------------
  async function showTransactions(period) {
    tbodyTransactions.innerHTML = `<tr><td colspan="4" class="text-center">Loading...</td></tr>`;
    modal.style.display = "block";

    try 
    {
      const params = new URLSearchParams
      ({
        from: from.value,
        to: to.value
      });
      const response = await fetch(`/sales-report/transactions-json?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load transactions.");
      const data = await response.json();

      // Filter only items for the selected day
      const filtered = data.filter(item => item.period === period);

      if (!filtered.length) 
      {
        tbodyTransactions.innerHTML = `<tr><td colspan="4" class="text-center">No transactions found</td></tr>`;
        return;
      }

      tbodyTransactions.innerHTML = "";
      filtered.forEach(item => 
      {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${fmt(item.price)}</td>
          <td>${fmt(item.subtotal)}</td>
        `;
        tbodyTransactions.appendChild(tr);
      });

    } 
    catch (err) 
    {
      console.error(err);
      tbodyTransactions.innerHTML = `<tr><td colspan="4" class="text-center">Error loading transactions</td></tr>`;
    }
  }

  // --------------------
  // Close modal
  // --------------------
  modalClose.addEventListener("click", () => modal.style.display = "none");
  window.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

  // --------------------
  // Apply filter manually
  // --------------------
  btnApply.addEventListener("click", loadSummaryReport);

  // --------------------
  // Export summary table as CSV
  // --------------------
  btnExport.addEventListener("click", () => 
  {
    if (!currentSummaryData.length) { alert("No data available to export."); return; }

    const header = ["Period", "Quantity Sold", "Total Amount"];
    const rows = currentSummaryData.map(r => [r.period, r.total_quantity, fmt(r.total_amount)]);
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --------------------
  // Load report on page load
  // --------------------
  loadSummaryReport();
});
