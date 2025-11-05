/* 
  File: product-management.js
  Purpose: Control product CRUD actions via Flask backend API
  Author: Saritwatt
  Date: 04 Nov 2025
*/



/* Format a number as localized currency-like string */
function currency(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* Compute stock badge label/level from a product object. */
function computeStatus(p) {
  if (p.quantity <= 0) return { label: "out of stock", level: "danger" };
  if (p.quantity <= 10) return { label: "low stock", level: "warning" };
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
let editingProduct = null;

/* API helpers */
const API_BASE = "http://127.0.0.1:5000/api/products";

/* Fetch all products from API */
async function fetchProducts() {
  const res = await fetch(API_BASE);
  return res.ok ? await res.json() : [];
}

/* Create a new product */
async function createProduct(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

/* Update an existing product by id */
async function updateProduct(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

/* Delete a product by id with confirmation */
async function deleteProduct(id) {
  const ok = confirm("Delete product ID " + id + "?");
  if (!ok) return;

  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (res.ok) renderRows(searchInput.value);
}

/* rendering */
async function renderRows(filterText = "") {
  const products = await fetchProducts();
  const q = filterText.trim().toLowerCase();
  const list = q
    ? products.filter(
        (p) =>
          (p.name + " " + (p.description || "")).toLowerCase().includes(q)
      )
    : products;

  tbody.innerHTML = "";
  if (list.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  list.forEach((p) => {
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.textContent = p.product_id;

    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    const tdDesc = document.createElement("td");
    tdDesc.textContent = p.description;

    const tdPrice = document.createElement("td");
    tdPrice.className = "num";
    tdPrice.textContent = currency(p.price);

    const tdQty = document.createElement("td");
    tdQty.className = "num";
    tdQty.textContent = p.quantity;

    const tdStatus = document.createElement("td");
    const st = computeStatus(p);
    const badge = document.createElement("span");
    badge.className = "badge";
    const dot = document.createElement("span");
    dot.className = "dot dot-" + st.level;
    const text = document.createElement("span");
    text.textContent = st.label;
    badge.append(dot, text);
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
    btnDel.addEventListener("click", () => deleteProduct(p.product_id));

    group.append(btnEdit, btnDel);
    tdAct.appendChild(group);

    tr.append(tdId, tdName, tdDesc, tdPrice, tdQty, tdStatus, tdAct);
    tbody.appendChild(tr);
  });
}

/* modal control */
function openModal(mode, product = null) {
  modal.hidden = false;
  document.body.style.overflow = "hidden";

  if (mode === "create") {
    modalTitle.textContent = "Create Product";
    form.reset();
    editingProduct = null;
  } else {
    modalTitle.textContent = "Edit Product";
    form.name.value = product.name;
    form.description.value = product.description;
    form.price.value = product.price;
    form.quantity.value = product.quantity;
    editingProduct = product;
  }

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

/* Open create modal */
btnCreate.addEventListener("click", () => openModal("create"));

/* Filter rows as the user types */
searchInput.addEventListener("input", (e) => renderRows(e.target.value));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    price: Number(form.price.value),
    quantity: Number(form.quantity.value),
  };

  if (data.price <= 0) {
    alert("Price must be greater than 0.");
    return; // stop form submission
  }

  if (editingProduct === null) {
    await createProduct(data);
  } else {
    await updateProduct(editingProduct.product_id, data);
  }

  closeModal();
  renderRows(searchInput.value);
});

/* export csv */
btnExport.addEventListener("click", async () => {
  const products = await fetchProducts();
  const header = ["product_id", "name", "description", "price", "quantity"];
  const lines = [header.join(",")].concat(
    products.map((p) =>
      [p.product_id, p.name, p.description, p.price, p.quantity].join(",")
    )
  );
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
