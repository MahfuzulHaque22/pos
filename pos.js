// Sidebar toggle
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('collapsed');
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    html.setAttribute("data-theme", newTheme);

    // Show/hide theme buttons
    document.getElementById("theme-light-btn").style.display = newTheme === "dark" ? "inline-block" : "none";
    document.getElementById("theme-dark-btn").style.display = newTheme === "light" ? "inline-block" : "none";
}


//find
function findProduct() {
    const s=document.getElementById('productSearch').value.toLowerCase();
    const p=productsData.find(p=>p.code.toLowerCase()===s||p.name.toLowerCase().includes(s));
    if(p) addProductToCart(p); else alert('Product not found');
}



// Initialize button visibility on page load
window.addEventListener("DOMContentLoaded", () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme") || "light";
    document.getElementById("theme-light-btn").style.display = currentTheme === "dark" ? "inline-block" : "none";
    document.getElementById("theme-dark-btn").style.display = currentTheme === "light" ? "inline-block" : "none";
});

// Dropdown toggle on click
document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
  toggle.addEventListener('click', e => {
    e.preventDefault();
    toggle.parentElement.classList.toggle('open');
  });
});

// Settings menu toggle
document.getElementById('settings-btn').addEventListener('click', e => {
  e.stopPropagation();
  const menu = document.getElementById('settings-menu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', () => {
  document.getElementById('settings-menu').style.display = 'none';
});

// Function to load page
async function loadPage(page, linkElement) {
  const content = document.getElementById('content');
  try {
    // Mark active link
    document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
    if (linkElement) linkElement.classList.add('active');

    content.classList.remove('page-fade');
    void content.offsetWidth; // reflow
    const response = await fetch(`${page}.html`);
    if (!response.ok) throw new Error(`Failed to load ${page}.html`);
    const html = await response.text();
    content.innerHTML = html;
    content.classList.add('page-fade');
  } catch (error) {
    content.innerHTML = `<p style="color:red;">Error loading page: ${error.message}</p>`;
  }
}

// Click event for sidebar links
document.querySelectorAll('.nav a[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.getAttribute('data-page');
    loadPage(page, link);
  });
});

// On page load
window.addEventListener("DOMContentLoaded", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  document.getElementById("theme-light-btn").style.display = currentTheme === "light" ? "none" : "inline-block";
  document.getElementById("theme-dark-btn").style.display = currentTheme === "dark" ? "none" : "inline-block";

  // Load Home page by default
  const homeLink = document.querySelector('.nav a[data-page="home"]');
  if (homeLink) {
    loadPage("home", homeLink);
  }
});
