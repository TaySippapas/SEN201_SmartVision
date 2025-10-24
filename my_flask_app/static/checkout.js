/*
  File: checkout.js
  Purpose: Control sales and checkout operations via Flask backend API
  Author: Jirapat Kulruchakorn (refined by ChatGPT)
*/

/* ---------- Utilities ---------- */
function formatCurrency(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ---------- Elements ---------- */
const codeInput = document.querySelector("#product-code");
const qtyInput = document.querySelector("#product-qty");
const btnAdd = document.querySelector("#add-item-button");
const btnPay = document.querySelector("#pay-button");
const btnCancel = document.querySelector("#cancel-button");
const tbody = document.querySelector("#cart-body");
const totalEl = document.querySelector("#total-amount");

/* ---------- State ---------- */
let cart = [];

/* ---------- API Base ---------- */
const API_SALES = "http://127.0.0.1:5000/api/sales";

/* ---------- API Helpers ---------- */

// Fetch a product by ID
async function fetchProduct(productId) {
  const res = await fetch(`${API_SALES}/product/${productId}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Product not found");
  }
  return data;
}

// Process checkout (POST)
async function processCheckout(items) {
  const res = await fetch(`${API_SALES}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.detail || data.error || "Checkout failed");
  }
  return data;
}

/* ---------- Cart Logic ---------- */

// Add product to cart
async function addItem(code, qty) {
  const productId = parseInt(code);
  if (isNaN(productId)) {
    alert("Please enter a valid product ID number.");
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
    codeInput.value = "";
    qtyInput.value = "1";
    codeInput.focus();

  } catch (err) {
    alert("❌ " + err.message);
  }
}

// Remove product from cart
function removeItem(productId) {
  cart = cart.filter((i) => i.product_id !== productId);
  renderCart();
}

// Update quantity
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

// Compute total
function computeTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/* ---------- Rendering ---------- */
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

/* ---------- Handlers ---------- */

// Add product to cart
btnAdd.addEventListener("click", () => {
  addItem(codeInput.value.trim(), qtyInput.value.trim());
});

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addItem(codeInput.value.trim(), qtyInput.value.trim());
  }
});

// Process payment
btnPay.addEventListener("click", async () => {
  if (cart.length === 0) {
    alert("Cart is empty.");
    return;
  }

  const items = cart.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
  }));

  try {
    const result = await processCheckout(items);
    alert(
      `✅ Sale complete!\nTransaction ID: ${result.transaction_id}\nTotal: $${formatCurrency(result.total_amount)}`
    );

    if (result.warnings) {
      alert(result.warnings.join("\n"));
    }

    cart = [];
    renderCart();

  } catch (err) {
    alert("❌ Checkout failed: " + err.message);
    console.error(err);
  }
});

// Cancel sale
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
