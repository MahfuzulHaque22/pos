let productsData = [];
let cart = [];

const spreadsheetId = "1nr6fXL6wbUHlXZaiAQYEFBWLMAauevT8zOtMfXbHMYw";
const sheetName = "Sheet1";
const apiKey = "AIzaSyC-crKfYn4PUeQXLIMIpCrfOVuuUXb4dfs";

const appsScriptEndpoint = "https://script.google.com/macros/s/AKfycbywL5OAII4O0RGMyGe5AgZsqrByQazZUnkuulEIzKMFMBDsN40eUvvaZ1I0OCLu0J8u/exec";

const googleSheetsAPI =
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;

let headerMap = {};
let inStockColLetter = "W"; // fallback if header not found

function columnIndexToLetter(index) {
  let letter = "";
  while (index > 0) {
    let mod = (index - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    index = Math.floor((index - mod) / 26);
  }
  return letter;
}

// LOAD PRODUCTS
async function loadProductsFromSheet() {
  try {
    const response = await fetch(googleSheetsAPI);
    const data = await response.json();
    const rows = data.values;
    if (!rows || rows.length < 2) return;

    const headers = rows[0];
    headerMap = {};
    headers.forEach((h, i) => (headerMap[h.trim()] = i));

    if (headerMap["in_stock"] != null) {
      const oneBased = headerMap["in_stock"] + 1;
      inStockColLetter = columnIndexToLetter(oneBased);
    }

    productsData = rows.slice(1).map((row, rowIndex) => {
      const item = {};
      headers.forEach((header, i) => {
        item[header] = (row[i] || "").toString().trim();
      });
      item.current_price = parseFloat(item.current_price) || 0;
      item.discount_price = parseFloat(item.discount_price) || 0;
      item.discount_percentage = parseFloat(item.discount_percentage) || 0;
      item.pueches_price = parseFloat(item.pueches_price) || 0;
      item.in_stock = item.in_stock || "0";
      item.image = item.image || "";
      item._row = rowIndex + 2;
      return item;
    }).filter((item) => item.name !== "");

    renderProductGrid();
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

// RENDER PRODUCT GRID
function renderProductGrid() {
  const productGrid = document.getElementById("productGrid");
  if (!productGrid) return;

  productGrid.innerHTML = productsData.map((product) => {
    const stock = parseInt(product.in_stock) || 0;
    return `
      <div class="product-card">
        <img src="${product.image}" alt="${product.name}" width="100%">
        <h4>${product.name}</h4>
        <p>${product.current_price.toFixed(2)}</p>
        <p>Stock: ${stock}</p>
        <button onclick="addProductByCode('${(product.code || "").replace(/'/g, "\\'")}')">Add</button>
      </div>`;
  }).join("");
}

// ADD BY CODE
function addProductByCode(code) {
  code = (code || "").toString().trim();
  if (!code) return;

  const product = productsData.find((p) => (p.code || "").trim() === code);
  if (product) addProductToCart(product);
}

// SEARCH
function findProduct() {
  const raw = (document.getElementById("productSearch").value || "").trim();
  if (!raw) {
    alert("Please enter product code or name.");
    return;
  }

  const queryLower = raw.toLowerCase();
  const product = productsData.find((p) =>
    (p.code || "").toLowerCase() === queryLower ||
    (p.name || "").toLowerCase() === queryLower
  );

  if (product) {
    addProductToCart(product);
    document.getElementById("productSearch").value = "";
  } else {
    alert("Product not found in inventory");
  }
}

// ADD TO CART
function addProductToCart(product) {
  if (!product) return;

  const stock = parseInt(product.in_stock) || 0;
  const key = (product.code || product.name).trim();
  const existing = cart.find((item) => (item.code || item.name).trim() === key);

  if (existing) {
    if (existing.qty + 1 > stock) {
      alert(`Cannot add more. Only ${stock} in stock.`);
      return;
    }
    existing.qty += 1;
  } else {
    if (stock < 1) {
      alert(`Product out of stock!`);
      return;
    }
    cart.push({ ...product, qty: 1, customDiscount: "" });
  }
  renderCart();
}

// RENDER CART
function renderCart() {
  const tbody = document.getElementById("cartTableBody");
  if (!tbody) return;

  let total = 0, profit = 0;
  tbody.innerHTML = cart.map((item, idx) => {
    // Apply discount
    let price = item.current_price;
    let discountValue = 0;

    if (item.customDiscount) {
      if (item.customDiscount.toString().includes("%")) {
        const perc = parseFloat(item.customDiscount) || 0;
        discountValue = (price * perc) / 100;
      } else {
        discountValue = parseFloat(item.customDiscount) || 0;
      }
    } else if (item.discount_percentage > 0) {
      discountValue = (price * item.discount_percentage) / 100;
    }

    const finalPrice = Math.max(price - discountValue, 0);
    const itemTotal = finalPrice * item.qty;
    const itemProfit = (finalPrice - item.pueches_price) * item.qty;

    total += itemTotal;
    profit += itemProfit;

    return `<tr>
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>${finalPrice.toFixed(2)}</td>
      <td><input type="number" min="1" value="${item.qty}" style="width:50px" onchange="updateQty(${idx}, this.value)"></td>
      <td><input type="text" value="${item.customDiscount || item.discount_percentage + '%'}" style="width:70px" onchange="updateDiscount(${idx}, this.value)"></td>
      <td>${itemTotal.toFixed(2)}</td>
      <td>${itemProfit.toFixed(2)}</td>
      <td><button onclick="removeFromCart('${(item.code || item.name).replace(/'/g, "\\'")}')">❌</button></td>
    </tr>`;
  }).join("");

  document.getElementById("totalAmount").textContent = total.toFixed(2);
  document.getElementById("totalProfit").textContent = profit.toFixed(2);
  document.getElementById("finalPrice").textContent = total.toFixed(2);
}

// Update qty/discount handlers
function updateQty(index, value) {
  value = parseInt(value) || 1;
  cart[index].qty = value;
  renderCart();
}

function updateDiscount(index, value) {
  cart[index].customDiscount = value.trim();
  renderCart();
}

// REMOVE
function removeFromCart(key) {
  cart = cart.filter((item) => (item.code || item.name) !== key);
  renderCart();
}

// CONFIRM PAYMENT + PRINT RECEIPT
async function confirmPayment() {
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }

  // Validate stock before proceeding
  for (let item of cart) {
    if (item.qty > (parseInt(item.in_stock) || 0)) {
      alert(`Stock error: "${item.name}" has only ${item.in_stock} left.`);
      return;
    }
  }

  // 1️⃣ Generate receipt
  generateReceipt();
  window.print();

  // 2️⃣ Update stock in Sheet
  const updatePromises = cart.map(item => {
    const newStock = Math.max((parseInt(item.in_stock) || 0) - item.qty, 0);
    item.in_stock = newStock; // update in memory
    return updateStockInSheet(item.code, newStock);
  });

  await Promise.allSettled(updatePromises);

  // 3️⃣ Reset cart
  cart = [];
  renderCart();
  renderProductGrid();
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
}


function printReceipt() {
  window.print();
}


// Update stock in Sheet
async function updateStockInSheet(productCode, newStock) {
  try {
    const res = await fetch(appsScriptEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: productCode, newStock: newStock })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Unknown error");
  } catch (err) {
    console.error("Error updating stock:", err);
  }
}


// INITIAL
document.addEventListener("DOMContentLoaded", () => {
  loadProductsFromSheet();
});



// Example structure of product in cart:
// { code, name, price, qty, discount, in_stock, profit }

function updateQuantity(code, newQty) {
  let item = cart.find(p => p.code === code);
  if (!item) return;

  if (newQty > item.in_stock) {
    alert(`Only ${item.in_stock} units of "${item.name}" are available in stock.`);
    item.qty = item.in_stock; // cap at stock
  } else if (newQty < 1) {
    item.qty = 1; // minimum 1
  } else {
    item.qty = newQty;
  }

  renderCart();
}

// function confirmPayment() {
//   // Validate stock
//   for (let item of cart) {
//     if (item.qty > item.in_stock) {
//       alert(`Stock error: "${item.name}" has only ${item.in_stock} left, but you requested ${item.qty}.`);
//       return;
//     }
//   }

//   generateReceipt();
//   printReceipt();

//   // Update stock
//   cart.forEach(item => {
//     let newStock = item.in_stock - item.qty;
//     updateStockInSheet(item.code, newStock);
//   });

//   cart = [];
//   renderCart();
// }



function generateReceipt() {
  let receiptHTML = `
    <h3 style="text-align:center;">My Shop Name</h3>
    <p style="text-align:center;">123 Main Street, Dhaka</p>
    <p style="text-align:center;">Phone: 0123456789</p>
    <hr>
    <p><strong>Customer:</strong> ${document.getElementById("customerName").value || "Walk-in Customer"}<br>
    <strong>Phone:</strong> ${document.getElementById("customerPhone").value || "-"}</p>
    <table style="width:100%; border-collapse: collapse; font-size:12px;">
      <tr><th>Code</th><th>Name</th><th>Price</th><th>Qty</th><th>Total</th></tr>
  `;

  cart.forEach((item) => {
    let price = item.current_price;
    let discountValue = 0;

    if (item.customDiscount) {
      if (item.customDiscount.includes("%")) {
        discountValue = (price * (parseFloat(item.customDiscount) || 0)) / 100;
      } else {
        discountValue = parseFloat(item.customDiscount) || 0;
      }
    } else if (item.discount_percentage > 0) {
      discountValue = (price * item.discount_percentage) / 100;
    }

    const finalPriceEach = Math.max(price - discountValue, 0);
    const itemTotal = finalPriceEach * item.qty;

    receiptHTML += `<tr>
      <td>${item.code}</td>
      <td>${item.name}</td>
      <td>${finalPriceEach.toFixed(2)}</td>
      <td>${item.qty}</td>
      <td>${itemTotal.toFixed(2)}</td>
    </tr>`;
  });

  receiptHTML += `</table><hr>
    <p><strong>Total:</strong> ${document.getElementById("totalAmount").textContent}</p>
    <p><strong>Final Price:</strong> ${document.getElementById("finalPrice").textContent}</p>
    <p><strong>Profit:</strong> ${document.getElementById("totalProfit").textContent}</p>
    <p style="text-align:center; font-size:12px;">⚠ No Refunds Allowed</p>
  `;

  document.getElementById("receipt").innerHTML = receiptHTML;
}

