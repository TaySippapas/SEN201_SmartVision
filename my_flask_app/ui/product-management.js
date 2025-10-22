/* 
  File: product-management.js
  Purpose: Control product CRUD actions (backend-powered)
  Author: Saritwatt + fixes
*/

/* ---- BACKEND API CALLS ---- */
async function apiListProducts() {
  const res = await fetch("/api/products");
  if (!res.ok) { console.error("Failed to load products"); return []; }
  return await res.json();
}

async function apiCreateProduct(data) {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

async function apiUpdateProduct(id, data) {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

async function apiDeleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: "DELETE" });
}

/* ---- UTILITIES ---- */
function currency(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function computeStatus(qty, threshold) {
  if (qty <= 0) return { label: "out of stock", level: "danger" };
  if (typeof threshold === "number" && qty <= threshold) return { label: "low stock", level: "warning" };
  return { label: "in stock", level: "success" };
}

/* ---- ELEMENTS ---- */
const tbody = document.querySelector("#product-tbody");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const btnCreate = document.querySelector("#btn-create");
const btnExport = document.querySelector("#btn-export");

/* modal elements */
const modal = document.querySelector("#product-modal");
const modalTitle = document.querySelector("#modal-title");
const modalClose = document.querySelector("#modal-close");
const form = document.querySelector("#product-form");
const btnCancel = document.querySelector("#btn-cancel");

/* state */
let editingId = null;        // use DB product_id
let cachedProducts = [];     // keep last loaded list for filtering/export

/* ---- RENDERING ---- */
async function renderRows(filterText = "") {
  // fetch fresh list
  cachedProducts = await apiListProducts();

  const q = filterText.trim().toLowerCase();
  const list = q
    ? cachedProducts.filter(p =>
        ((p.product_id ?? "") + " " + (p.name ?? "")).toLowerCase().includes(q)
      )
    : cachedProducts;

  tbody.innerHTML = "";
  emptyState.hidden = list.length > 0;

  list.forEach(p => {
    const tr = document.createElement("tr");

    const id = p.product_id ?? p.code;                 // tolerate old demo data
    const name = p.name ?? "";
    const price = p.price ?? 0;
    const qty = p.quantity ?? p.qty ?? 0;
    const threshold = p.threshold ?? null;             // not in DB yet; UI field exists

    const tdCode = document.createElement("td");
    tdCode.textContent = id;

    const tdName = document.createElement("td");
    tdName.textContent = name;

    const tdPrice = document.createElement("td");
    tdPrice.className = "num";
    tdPrice.textContent = currency(price);

    const tdTh = document.createElement("td");
    tdTh.className = "num";
    tdTh.textContent = threshold ?? "-";

    const tdQty = document.createElement("td");
    tdQty.className = "num";
    tdQty.textContent = qty;

    const tdStatus = document.createElement("td");
    const st = computeStatus(qty, threshold);
    const badge = document.createElement("span");
    badge.className = "badge";
    const dot = document.createElement("span");
    dot.className = "dot dot-" + st.level;
    const text = document.createElement("span");
    text.textContent = st.label;
    badge.appendChild(dot);
    badge.appendChild(text);
    tdStatus.appendChild(badge);

    const tdAct = document.createElement("td");
    const group = document.createElement("div");
    group.className = "action-buttons";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-ghost";
    btnEdit.textContent = "Edit";
    btnEdit.addEventListener("click", () => openModal("edit", { id, name, price, qty, threshold }));

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-ghost";
    btnDel.textContent = "Delete";
    btnDel.addEventListener("click", () => onDelete(id));

    group.appendChild(btnEdit);
    group.appendChild(btnDel);
    tdAct.appendChild(group);

    tr.appendChild(tdCode);
    tr.appendChild(tdName);
    tr.appendChild(tdPrice);
    tr.appendChild(tdTh);
    tr.appendChild(tdQty);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
}

/* ---- MODAL CONTROL ---- */
function openModal(mode, product) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  if (mode === "create") {
    modalTitle.textContent = "Create Product";
    form.reset();
    editingId = null;
  } else {
    modalTitle.textContent = "Edit Product";
    form.code.value = product.id;          // read-only display
    form.name.value = product.name;
    form.price.value = product.price;
    form.threshold.value = product.threshold ?? "";
    form.qty.value = product.qty;
    editingId = product.id;
  }
  form.code.readOnly = true;               // id/code not editable (DB primary key)
  form.code.style.backgroundColor = "#f3f4f6";
  form.name.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

modal.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-backdrop")) closeModal();
});
modalClose.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);

/* ---- HANDLERS ---- */
btnCreate.addEventListener("click", () => openModal("create"));
searchInput.addEventListener("input", (e) => renderRows(e.target.value));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const price = Number(form.price.value);
  const quantity = Number(form.qty.value);
  const description = "";   // optional in DB

  if (!name || Number.isNaN(price) || Number.isNaN(quantity)) {
    alert("Please fill in name, price, and quantity.");
    return;
  }

  if (editingId === null) {
    await apiCreateProduct({ name, description, price, quantity });
  } else {
    await apiUpdateProduct(editingId, { name, description, price, quantity });
  }

  closeModal();
  await renderRows(searchInput.value);
});

async function onDelete(id) {
  const ok = confirm("Delete product " + id + "?");
  if (!ok) return;
  await apiDeleteProduct(id);
  await renderRows(searchInput.value);
}

/* ---- EXPORT CSV (from current table) ---- */
btnExport.addEventListener("click", () => {
  const header = ["id", "name", "price", "qty"];
  const lines = [header.join(",")].concat(
    cachedProducts.map(p => [
      p.product_id ?? "",
      p.name ?? "",
      p.price ?? 0,
      p.quantity ?? 0
    ].join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.csv";
  a.click();
  URL.revokeObjectURL(url);
});

/* ---- INIT ---- */
renderRows().catch(err => console.error(err));
