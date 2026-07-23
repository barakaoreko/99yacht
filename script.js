// This file uses the `supabase` client created in supabaseClient.js,
// which is loaded before this script in index.html.

// ============ STATE ============
/** @typedef {{id:string, client:string, yacht:string, date:string, total:number, advance:number}} Booking */

/** @type {Booking[]} */
let bookings = [];

// `currentUser` is declared and managed in auth.js (loaded before this file).

// the month currently shown on the tide board
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth(); // 0-indexed

// ============ SUPABASE DATA LAYER ============
function rowToBooking(row) {
  return {
    id: row.id,
    client: row.client_name,
    yacht: row.yacht_name,
    date: row.booking_date,
    total: Number(row.total_amount),
    advance: Number(row.advance_paid),
  };
}

async function fetchBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true });

  if (error) {
    console.error("Could not load bookings:", error.message);
    return [];
  }
  return data.map(rowToBooking);
}

async function insertBooking(booking) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_name: booking.client,
      yacht_name: booking.yacht,
      booking_date: booking.date,
      total_amount: booking.total,
      advance_paid: booking.advance,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToBooking(data);
}

async function deleteBookingRow(id) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

// ============ REALTIME ============
// Keeps every open tab/device in sync when a booking is added or removed.
// Requires realtime replication turned on for the "bookings" table
// (Supabase dashboard → Database → Replication).
function subscribeRealtime() {
  supabase
    .channel("bookings-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      async () => {
        bookings = await fetchBookings();
        renderAll();
      }
    )
    .subscribe();
}

// ============ HELPERS ============
const money = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const dateKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function bookingsOn(dateStr) {
  return bookings.filter((b) => b.date === dateStr);
}

// ============ RENDER: CALENDAR ============
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("month-label");
  label.textContent = `${monthNames[viewMonth]} ${viewYear}`;
  grid.innerHTML = "";

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    blank.className = "day-cell is-empty";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = dateKey(viewYear, viewMonth, day);
    const dayBookings = bookingsOn(dStr);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (dayBookings.length) cell.classList.add("is-booked");
    if (dStr === todayStr) cell.classList.add("is-today");

    const num = document.createElement("span");
    num.textContent = day;
    cell.appendChild(num);

    if (dayBookings.length) {
      const flag = document.createElement("span");
      flag.className = "pennant";
      cell.appendChild(flag);
      cell.title = `${dayBookings.length} booking${dayBookings.length > 1 ? "s" : ""}`;
      cell.addEventListener("click", () => showDayDetail(dStr, dayBookings));
    }

    grid.appendChild(cell);
  }
}

function showDayDetail(dateStr, dayBookings) {
  const panel = document.getElementById("day-detail");
  const title = document.getElementById("day-detail-title");
  const list = document.getElementById("day-detail-list");

  const [y, m, d] = dateStr.split("-").map(Number);
  title.textContent = `${monthNames[m - 1]} ${d}, ${y} — ${dayBookings.length} booking${dayBookings.length > 1 ? "s" : ""}`;

  list.innerHTML = "";
  dayBookings.forEach((b) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = `${b.client} — ${b.yacht}`;
    const right = document.createElement("span");
    right.textContent = money(b.total);
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });

  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.getElementById("close-detail").addEventListener("click", () => {
  document.getElementById("day-detail").hidden = true;
});

document.getElementById("prev-month").addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});

document.getElementById("next-month").addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});

// ============ RENDER: LEDGER ============
function renderLedger() {
  const body = document.getElementById("ledger-body");
  const empty = document.getElementById("ledger-empty");
  body.innerHTML = "";

  if (bookings.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach((b) => {
    const balance = b.total - b.advance;
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(b.client)}</td>
      <td>${escapeHtml(b.yacht)}</td>
      <td>${formatDisplayDate(b.date)}</td>
      <td>${money(b.total)}</td>
      <td>${money(b.advance)}</td>
      <td class="${balance <= 0 ? "balance--paid" : "balance--due"}">${
        balance <= 0 ? "Paid in full" : money(balance)
      }</td>
      <td>${currentUser ? `<button class="row-delete" data-id="${b.id}">Remove</button>` : ""}</td>
    `;
    body.appendChild(tr);
  });

  body.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Removing…";
      try {
        await deleteBookingRow(btn.dataset.id);
        bookings = bookings.filter((b) => b.id !== btn.dataset.id);
        renderAll();
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = "Remove";
      }
    });
  });
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${monthNames[m - 1].slice(0, 3)} ${d}, ${y}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============ BOOKING FORM ============
const form = document.getElementById("booking-form");
const formError = document.getElementById("form-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  if (!currentUser) {
    formError.textContent = "Please log in to add a booking.";
    openLogin();
    return;
  }

  const client = document.getElementById("client-name").value.trim();
  const yacht = document.getElementById("yacht-name").value;
  const date = document.getElementById("booking-date").value;
  const total = parseFloat(document.getElementById("total-amount").value);
  const advance = parseFloat(document.getElementById("advance-paid").value);

  if (!client || !yacht || !date || isNaN(total) || isNaN(advance)) {
    formError.textContent = "Every field is needed to complete the entry.";
    return;
  }
  if (advance > total) {
    formError.textContent = "The advance can't be more than the total amount.";
    return;
  }
  if (total < 0 || advance < 0) {
    formError.textContent = "Amounts can't be negative.";
    return;
  }

  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const saved = await insertBooking({ client, yacht, date, total, advance });
    bookings.push(saved);

    const [y, m] = date.split("-").map(Number);
    viewYear = y;
    viewMonth = m - 1;

    form.reset();
    renderAll();
  } catch (err) {
    formError.textContent = `Couldn't save that booking: ${err.message}`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add to the log";
  }
});

// ============ MOBILE MENU ============
const menuToggle = document.getElementById("menu-toggle");
const topbarNav = document.getElementById("topbar-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = topbarNav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

topbarNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    topbarNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  });
});

// Login modal, logout, and the login form itself are handled in auth.js
// (loaded before this file). It exposes a global `openLogin()` used above
// when a logged-out visitor tries to submit the booking form.

// ============ INIT ============
function renderAll() {
  renderCalendar();
  renderLedger();
}

async function init() {
  try {
    await initAuth();
  } catch (err) {
    console.error("Auth setup failed:", err.message);
  }

  try {
    bookings = await fetchBookings();
  } catch (err) {
    console.error("Loading bookings failed:", err.message);
    bookings = [];
  }

  renderAll();

  try {
    subscribeRealtime();
  } catch (err) {
    console.error("Realtime sync failed to start:", err.message);
  }
}

init();