// File: static/sales-report.js
// Purpose: Sales report logic with auto-load and CSV export
// Author: Saritwatt
// Date: 27 Oct 2025

// Format numbers for currency
function fmt(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const from = document.getElementById("from");
  const to = document.getElementById("to");
  const group = document.getElementById("group");
  const btnApply = document.getElementById("btn-apply");
  const btnExport = document.getElementById("btn-export");
  const tbody = document.getElementById("sales-tbody");

  let currentData = []; // Store latest data for CSV export

  // --------------------
  // Load sales report data
  // --------------------
  async function loadReport() {
    const params = new URLSearchParams({
      from: from.value,
      to: to.value,
      group: group.value,
    });

    try {
      const response = await fetch(`/sales-report/report-json?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load sales report.");
      const data = await response.json();
      currentData = data;
      renderReportTable(data);
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="3" class="text-center">Error loading sales report</td></tr>`;
    }
  }

  // --------------------
  // Apply filter manually
  // --------------------
  btnApply.addEventListener("click", loadReport);

  // --------------------
  // Export current table as CSV
  // --------------------
  btnExport.addEventListener("click", () => {
    if (!currentData.length) {
      alert("No data available to export.");
      return;
    }

    const header = ["Period", "Quantity Sold", "Total Amount"];
    const rows = currentData.map((r) => [
      r.period,
      r.total_quantity,
      fmt(r.total_amount),
    ]);

    // Build CSV text
    let csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((e) => e.join(",")).join("\n");

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --------------------
  // Render report table
  // --------------------
  function renderReportTable(data) {
    tbody.innerHTML = "";
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center">No data found for selected range</td></tr>`;
      return;
    }

    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${row.total_quantity}</td>
        <td>${fmt(row.total_amount)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --------------------
  // Load report automatically on page load
  // --------------------
  loadReport();
});
