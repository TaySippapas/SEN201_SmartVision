/*
File: checkout.js
Purpose: Logic for the checkout page
Author: Jirapat Kulruchakorn
Date: 14 October 2025
*/

/* Catalog for demo */
const catalog = {
  "Apple": { name: "Apple", price: 1.25 },
  "Banana": { name: "Banana", price: 0.99 },
  "Bread": { name: "Bread", price: 2.50 }
};

/* Application state: cart is an array */
let cart = [];

function formatCurrency(value) 
{
  return "$" + value.toFixed(2);
}

/* Add item to cart by product code */
function addItem(code, qty)
{
    if (!catalog[code])
    {
        alert("Unknown item code: " + code)
        return
    }

    const quantity = Number(qty) > 0 ? Number(qty) : 1;
    const existingIndex = cart.findIndex(item => item.code === code);

    if (existingIndex !== -1)
    {
        cart[existingIndex].qty += quantity;
    }
    else
    {
        const { name, price } = catalog[code];
        cart.push({ code: code, name: name, price: price, qty: quantity});
    }

    renderCart();
}

/* Remove item from cart */
function removeItem(code)
{
    cart = cart.filter(item => item.code !== code);
    renderCart();
}

/* Update quantity of an item */
function updateQty(code, qty)
{
    const item = cart.find(row => row.code === code);
    if (!item)
    {
        return;
    }

    const newQty = Number(qty);
    if (Number.isNaN(newQty) || newQty <= 0)
    {
        removeItem(code);
        return
    }

    item.qty = newQty;
    renderCart();
}

/* Compute total amount */
function computeTotal()
{
    let total = 0;
    for (const item of cart)
    {
        total += item.price * item.qty;
    }
    return total;
}

/* Render cart table */
function renderCart()
{
    const tbody = document.getElementById("cart-body");
    const totalEl = document.getElementById("total-amount");

    tbody.innerHTML = "";

    for (const item of cart)
    {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = item.name;

        const tdQty = document.createElement("td");
        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.min = "1";
        qtyInput.value = String(item.qty);
        qtyInput.className = "qty-input";
        qtyInput.addEventListener("change", function() {
            updateQty(item.code, qtyInput.value);
        })
        tdQty.appendChild(qtyInput);

        const tdPrice = document.createElement("td");
        tdPrice.textContent = formatCurrency(item.price);

        const tdTotal = document.createElement("td");
        tdTotal.textContent = formatCurrency(item.price * item.qty);

        const tdActions = document.createElement("td");
        const removeBtn = document.createElement("button");
        removeBtn.className = "button back-button";
        removeBtn.textContent = "remove";
        removeBtn.addEventListener("click", function() {
            removeItem(item.code);
        });
        tdActions.appendChild(removeBtn);

        tr.appendChild(tdName);
        tr.appendChild(tdQty);
        tr.appendChild(tdPrice);
        tr.appendChild(tdTotal);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    }

    totalEl.textContent = formatCurrency(computeTotal());
}

function initCheckout()
{
    const codeInput = document.getElementById("product-code");
    const qtyInput = document.getElementById("product-qty");
    const addButton = document.getElementById("add-item-button");   
    const payButton = document.getElementById("pay-button");
    const cancelButton = document.getElementById("cancel-button");
    
    addButton.addEventListener("click", function() {
        addItem(codeInput.value.trim(), qtyInput.value.trim());
        codeInput.value = "";
        qtyInput.value = "1";
        codeInput.focus();
    });

    codeInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") 
        {
            addItem(codeInput.value.trim(), qtyInput.value.trim());
            codeInput.value = "";
            qtyInput.value = "1";
        }
    });

    payButton.addEventListener("click", function() {
        if (cart.length === 0) 
        {
            alert("Cart is empty");
            return;
        }

        alert("Total amount to pay: " + formatCurrency(computeTotal()));
        cart = [];
        renderCart();
    });

    cancelButton.addEventListener("click", function() {
        if (cart.length === 0) 
        {
            alert("Cart is already empty");
            return;
        }
        const confirmCancel = confirm("Cancel current sale and clear all items?");
        if (confirmCancel)
        {
            cart = [];
            renderCart();
            alert("Sale cancelled. Cart cleared.");
        }
    });

    renderCart();
}

document.addEventListener("DOMContentLoaded", initCheckout);