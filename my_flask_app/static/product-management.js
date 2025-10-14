/* 
  File: product-management.js
  Purpose: Control product CRUD actions
  Author: Saritwatt
*/

/* utilities */
const storageKey = "sv_products";
function loadProducts() 
{
  const raw = localStorage.getItem(storageKey);
  if (!raw) { return []; 
    
  }
  try { return JSON.parse(raw); } catch (e) { return []; }
}
function saveProducts(products) {
  localStorage.setItem(storageKey, JSON.stringify(products));
}
function currency(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function computeStatus(p) {
  if (p.qty <= 0) { return { label: "out of stock", level: "danger" }; }
  if (p.qty <= p.threshold) { return { label: "low stock", level: "warning" }; }
  return { label: "in stock", level: "success" };
}

/* elements */
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
let editingCode = null;

/* initial demo data (only on first run) */
(function seed() {
  const already = loadProducts();
  if (already.length > 0) { return; }
  const sample = [
    { code: "P001", name: "Classic Burger", price: 89, threshold: 10, qty: 22 },
    { code: "P002", name: "French Fries", price: 49, threshold: 15, qty: 9 },
    { code: "P003", name: "Iced Tea", price: 35, threshold: 20, qty: 0 }
  ];
  saveProducts(sample);
})();

/* rendering */
function renderRows(filterText = "") {
  const products = loadProducts();
  const q = filterText.trim().toLowerCase();
  const list = q
    ? products.filter(p => (p.code + " " + p.name).toLowerCase().includes(q))
    : products;

  tbody.innerHTML = "";
  if (list.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  list.forEach(p => {
    const tr = document.createElement("tr");

    const tdCode = document.createElement("td");
    tdCode.textContent = p.code;

    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    const tdPrice = document.createElement("td");
    tdPrice.className = "num";
    tdPrice.textContent = currency(p.price);

    const tdTh = document.createElement("td");
    tdTh.className = "num";
    tdTh.textContent = p.threshold;

    const tdQty = document.createElement("td");
    tdQty.className = "num";
    tdQty.textContent = p.qty;

    const tdStatus = document.createElement("td");
    const st = computeStatus(p);
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
    btnEdit.addEventListener("click", () => openModal("edit", p));

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-ghost";
    btnDel.textContent = "Delete";
    btnDel.addEventListener("click", () => deleteProduct(p.code));

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

/* modal control */
function openModal(mode, product) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  if (mode === "create") {
    modalTitle.textContent = "Create Product";
    form.reset();
    editingCode = null;
  } else {
    modalTitle.textContent = "Edit Product";
    form.code.value = product.code;
    form.name.value = product.name;
    form.price.value = product.price;
    form.threshold.value = product.threshold;
    form.qty.value = product.qty;
    editingCode = product.code;
  }
  form.code.readOnly = editingCode !== null; // do not change primary key
  form.code.style.backgroundColor = editingCode ? "#f3f4f6" : "#ffffff";
  form.code.tabIndex = editingCode ? -1 : 0;
  form.name.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

modal.addEventListener("click", (e) => {
  const target = e.target;
  if (target.classList.contains("modal-backdrop")) {
    closeModal();
  }
});
modalClose.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);

/* handlers */
btnCreate.addEventListener("click", () => openModal("create"));
searchInput.addEventListener("input", (e) => renderRows(e.target.value));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = form.code.value.trim();
  const name = form.name.value.trim();
  const price = Number(form.price.value);
  const threshold = Number(form.threshold.value);
  const qty = Number(form.qty.value);

  const products = loadProducts();
  if (editingCode === null) 
    {
    const exists = products.some(p => p.code === code);
    if (exists) 
      {
      alert("Code already exists.");
      return;
    }
    products.push({ code, name, price, threshold, qty });
  } 
  else 
  {
    const idx = products.findIndex(p => p.code === editingCode);
    if (idx >= 0) 
      {
      products[idx] = { code, name, price, threshold, qty };
    }
  }
  saveProducts(products);
  closeModal();
  renderRows(searchInput.value);
});

function deleteProduct(code) 
{
  const ok = confirm("Delete product " + code + "?");
  if (!ok) { return; }
  const products = loadProducts().filter(p => p.code !== code);
  saveProducts(products);
  renderRows(searchInput.value);
}

/* export csv */
btnExport.addEventListener("click", () => 
  {
  const products = loadProducts();
  const header = ["code", "name", "price", "threshold", "qty"];
  const lines = [header.join(",")].concat(products.map(p => [p.code, p.name, p.price, p.threshold, p.qty].join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.csv";
  a.click();
  URL.revokeObjectURL(url);
});

/* init */
renderRows();
