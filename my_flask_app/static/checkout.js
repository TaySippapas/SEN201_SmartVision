/*
  File: checkout2.js
  Purpose: Sales & checkout UI logic for POS. Supports entering product
           by code (numeric) or by name with autocomplete suggestions.
  Author: Jirapt Kulruchakorn
  Last-Updated: 25 Oct 2025
*/

/* ============================== Utilities ============================== */
function formatCurrency(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function debounce(fn, wait = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ============================== Elements =============================== */
const qtyInput = document.querySelector("#product-qty");
const btnAdd = document.querySelector("#add-item-button");
const btnPay = document.querySelector("#pay-button");
const btnCancel = document.querySelector("#cancel-button");
const tbody = document.querySelector("#cart-body");
const totalEl = document.querySelector("#total-amount");

// Prefer #product-name; fall back to #product-code for older markup
const codeOrNameInput =
  document.querySelector("#product-name") ||
  document.querySelector("#product-code");

let suggestionBox = document.querySelector("#suggestions");
if (codeOrNameInput && !suggestionBox) {
  suggestionBox = document.createElement("div");
  suggestionBox.id = "suggestions";
  suggestionBox.className = "omnibox-panel";
  codeOrNameInput.insertAdjacentElement("afterend", suggestionBox);
}

/* =============================== State ================================= */
let cart = [];
let activeIndex = -1;
let currentData = [];

/* =============================== Constants ============================= */
const API_SALES = "http://127.0.0.1:5000/api/sales";

/* ============================ Panel Helpers ============================ */
function showPanel() {
  suggestionBox.style.display = "block";
  codeOrNameInput.setAttribute("aria-expanded", "true");
}
function hidePanel() {
  suggestionBox.style.display = "none";
  codeOrNameInput.setAttribute("aria-expanded", "false");
  suggestionBox.innerHTML = "";
  activeIndex = -1;
  currentData = [];
}

/* ============================= API Helpers ============================= */
async function fetchProduct(productId) {
  const res = await fetch(`${API_SALES}/product/${productId}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Product not found");
  return data;
}

async function processCheckout(items, paymentMethod = "cash") {
  const res = await fetch(`${API_SALES}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, payment_method: paymentMethod }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.detail || data.error || "Checkout failed");
  }
  return data;
}

/* ============================ Autocomplete ============================= */
function renderSuggestions(list) {
  suggestionBox.innerHTML = "";
  currentData = list || [];

  if (!currentData.length) {
    hidePanel();
    return;
  }

  currentData.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "suggestion-item";
    row.dataset.index = String(idx);
    row.textContent = `${p.name} ($${formatCurrency(p.price)})`;

    row.addEventListener("mouseenter", () => setActive(idx));
    row.addEventListener("mousedown", (e) => e.preventDefault());
    row.addEventListener("click", () => chooseIndex(idx));

    suggestionBox.appendChild(row);
  });

  activeIndex = -1;
  showPanel();
}

function setActive(idx) {
  const items = suggestionBox.querySelectorAll(".suggestion-item");
  items.forEach((el) => el.classList.remove("is-active"));
  if (idx >= 0 && idx < items.length) {
    items[idx].classList.add("is-active");
    activeIndex = idx;
  }
}

function chooseIndex(idx) {
  const p = currentData[idx];
  if (!p) return;
  codeOrNameInput.value = p.name;
  codeOrNameInput.dataset.productId = String(p.product_id);
  hidePanel();
}

const requestSuggestions = debounce(async (query) => {
  if (!query || /^\d+$/.test(query)) {
    hidePanel();
    return;
  }
  try {
    const res = await fetch(`${API_SALES}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderSuggestions(data);
  } catch {
    hidePanel();
  }
}, 120);

/* ============================== Cart Logic ============================= */
async function addItem(inputValue, qty) {
  let productId = null;

  if (codeOrNameInput.dataset.productId) {
    productId = parseInt(codeOrNameInput.dataset.productId, 10);
  } else if (/^\d+$/.test(inputValue)) {
    productId = parseInt(inputValue, 10);
  } else {
    const res = await fetch(`${API_SALES}/search?q=${encodeURIComponent(inputValue)}`);
    const results = await res.json();
    if (results.length === 1) {
      productId = results[0].product_id;
    } else {
      alert("Please select a product from the suggestion list.");
      return;
    }
  }

  if (!productId) {
    alert("Please enter a valid product code or name.");
    return;
  }

  const quantity = Number(qty) > 0 ? Number(qty) : 1;

  try {
    const product = await fetchProduct(productId);
    const existing = cart.find((i) => i.product_id === product.product_id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        quantity: quantity,
      });
    }

    renderCart();

    codeOrNameInput.value = "";
    codeOrNameInput.dataset.productId = "";
    hidePanel();
    qtyInput.value = "1";
    codeOrNameInput.focus();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

function removeItem(productId) {
  cart = cart.filter((i) => i.product_id !== productId);
  renderCart();
}

function updateQty(productId, qty) {
  const item = cart.find((i) => i.product_id === productId);
  if (!item) return;

  const newQty = Number(qty);
  if (isNaN(newQty) || newQty <= 0) {
    removeItem(productId);
    return;
  }

  item.quantity = newQty;
  renderCart();
}

function computeTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/* ============================== Rendering ============================== */
function renderCart() {
  tbody.innerHTML = "";
  const total = computeTotal();

  if (cart.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 5;
    emptyCell.textContent = "🛒 No items in cart.";
    emptyCell.style.textAlign = "center";
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    cart.forEach((i) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = i.name;

      const tdQty = document.createElement("td");
      const inputQty = document.createElement("input");
      inputQty.type = "number";
      inputQty.min = "1";
      inputQty.value = i.quantity;
      inputQty.className = "qty-input";
      inputQty.addEventListener("change", () => updateQty(i.product_id, inputQty.value));
      tdQty.appendChild(inputQty);

      const tdPrice = document.createElement("td");
      tdPrice.className = "num";
      tdPrice.textContent = "$" + formatCurrency(i.price);

      const tdLineTotal = document.createElement("td");
      tdLineTotal.className = "num";
      tdLineTotal.textContent = "$" + formatCurrency(i.price * i.quantity);

      const tdActions = document.createElement("td");
      const btnRemove = document.createElement("button");
      btnRemove.className = "btn btn-ghost";
      btnRemove.textContent = "Remove";
      btnRemove.addEventListener("click", () => removeItem(i.product_id));
      tdActions.appendChild(btnRemove);

      tr.append(tdName, tdQty, tdPrice, tdLineTotal, tdActions);
      tbody.appendChild(tr);
    });
  }

  totalEl.textContent = "$" + formatCurrency(total);
}

/* ============================== Handlers =============================== */
if (codeOrNameInput) {
  codeOrNameInput.addEventListener("input", (e) => {
    requestSuggestions(e.target.value.trim());
  });

  codeOrNameInput.addEventListener("keydown", (e) => {
    const items = suggestionBox.querySelectorAll(".suggestion-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!items.length) return;
      const next = (activeIndex + 1) % items.length;
      setActive(next);
      items[next].scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      const prev = (activeIndex - 1 + items.length) % items.length;
      setActive(prev);
      items[prev].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        chooseIndex(activeIndex);
      } else {
        addItem(codeOrNameInput.value.trim(), qtyInput.value.trim());
      }
    } else if (e.key === "Escape") {
      hidePanel();
    }
  });
}

document.addEventListener("click", (e) => {
  const wrapper = e.target.closest(".omnibox");
  const isPanel = e.target.closest("#suggestions");
  if (!wrapper && !isPanel) hidePanel();
});

btnAdd.addEventListener("click", () => {
  addItem(codeOrNameInput.value.trim(), qtyInput.value.trim());
});

btnPay.addEventListener("click", async () => {
  if (cart.length === 0) {
    alert("Cart is empty.");
    return;
  }

  const items = cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
  const paymentTypeEl = document.querySelector("#payment-type");
  const paymentMethod = (paymentTypeEl?.value || "cash").toLowerCase();

  try {
    const result = await processCheckout(items, paymentMethod);
    alert(
      `✅ Sale complete!\nTransaction ID: ${result.transaction_id}\nTotal: $${formatCurrency(
        result.total_amount
      )}\nPayment: ${result.payment_method.toUpperCase()}`
    );

    if (result.warnings) alert(result.warnings.join("\n"));

    cart = [];
    renderCart();
  } catch (err) {
    alert("❌ Checkout failed: " + err.message);
    console.error(err);
  }
});

btnCancel.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Cart is already empty.");
    return;
  }
  const ok = confirm("Cancel current sale and clear all items?");
  if (ok) {
    cart = [];
    renderCart();
  }
});

renderCart();
