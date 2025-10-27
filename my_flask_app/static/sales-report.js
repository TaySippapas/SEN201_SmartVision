/* 
  File: sales-report.js
  Purpose: Sales report logic (filtering, export, and view transactions in modal)
  Author: Saritwatt
  Date: 27 Oct 2025
*/

// Format numbers for currency
function fmt(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener("DOMContentLoaded", () => {
  const from = document.getElementById("from");
  const to = document.getElementById("to");
  const group = document.getElementById("group");
  const btnApply = document.getElementById("btn-apply");
  const btnExport = document.getElementById("btn-export");
  const tbody = document.getElementById("sales-tbody");

  const modal = document.getElementById("details-modal");
  const modalPeriod = document.getElementById("modal-period");
  const detailsBody = document.getElementById("details-body");
  const closeModal = document.getElementById("close-modal");

  // --------------------
  // Load report data
  // --------------------
  btnApply.addEventListener("click", async () => {
    const params = new URLSearchParams({
      from: from.value,
      to: to.value,
      group: group.value
    });

    try {
      const response = await fetch(`/sales-report/report-json?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load sales report.");

      const data = await response.json();
      renderReportTable(data);
    } catch (err) {
      console.error(err);
      alert("Error loading sales report data.");
    }
  });

  // --------------------
  // Export CSV
  // --------------------
  btnExport.addEventListener("click", () => {
    const params = new URLSearchParams({
      from: from.value,
      to: to.value,
      group: group.value
    });
    window.location.href = `/sales-report/export?${params.toString()}`;
  });

  // --------------------
  // Render report table
  // --------------------
  function renderReportTable(data) {
    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">No data found for selected range</td></tr>`;
      return;
    }

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.period}</td>
        <td>${row.total_quantity}</td>
        <td>${fmt(row.total_amount)}</td>
        <td>
          <button class="btn btn-small btn-view" data-period="${row.period}">
            View Transactions
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Add click handler for "View Transactions"
    document.querySelectorAll(".btn-view").forEach(button => {
      button.addEventListener("click", async e => {
        const period = e.target.dataset.period;
        await viewTransactions(period);
      });
    });
  }

  // --------------------
  // View transactions per period (modal)
  // --------------------
  async function viewTransactions(period) {
    try {
      const response = await fetch(`/sales-report/details?period=${encodeURIComponent(period)}`);
      if (!response.ok) throw new Error("Failed to fetch transactions.");

      const transactions = await response.json();

      if (!transactions.length) {
        alert(`No transactions found for ${period}.`);
        return;
      }

      // Set modal period title
      modalPeriod.textContent = period;

      // Clear previous rows
      detailsBody.innerHTML = "";

      // Populate modal table
      transactions.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.transaction_id}</td>
          <td>${t.date_and_time}</td>
          <td>${t.item_name}</td>
          <td>${t.quantity}</td>
          <td>${fmt(t.price)}</td>
          <td>${fmt(t.total)}</td>
        `;
        detailsBody.appendChild(tr);
      });

      // Show modal
      modal.style.display = "flex";

    } catch (err) {
      console.error(err);
      alert("Error fetching transactions.");
    }
  }

  // --------------------
  // Close modal
  // --------------------
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Close modal if click outside content
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
