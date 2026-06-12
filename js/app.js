const STORAGE_KEY = "finance-tracker.transactions";
const DEFAULT_CATEGORIES = ["Salary", "Freelance", "Rent", "Groceries", "Transport", "Utilities", "Dining", "Health", "Entertainment", "Savings", "Other"];

const form = document.getElementById("transactionForm");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");
const categoryList = document.getElementById("categoryList");
const filterCategory = document.getElementById("filterCategory");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const transactionList = document.getElementById("transactionList");
const chart = document.getElementById("chart");
const insightText = document.getElementById("insightText");
const heroIncome = document.getElementById("heroIncome");
const heroExpense = document.getElementById("heroExpense");
const heroBalance = document.getElementById("heroBalance");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const netBalance = document.getElementById("netBalance");
const topCategory = document.getElementById("topCategory");
const resetFilters = document.getElementById("resetFilters");
const clearAll = document.getElementById("clearAll");
const seedDemo = document.getElementById("seedDemo");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR"
});

const today = new Date();
dateInput.value = toDateValue(today);

let transactions = loadTransactions();

populateCategoryOptions();
bindEvents();
render();

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function toDateValue(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatMoney(value) {
  return currency.format(value || 0);
}

function formatDisplayDate(value) {
  const date = new Date(value + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function normalizeCategory(name) {
  return name.trim().replace(/\s+/g, " ");
}

function bindEvents() {
  form.addEventListener("submit", handleSubmit);
  resetFilters.addEventListener("click", () => {
    filterCategory.value = "all";
    fromDate.value = "";
    toDate.value = "";
    render();
  });
  clearAll.addEventListener("click", () => {
    if (!transactions.length || !confirm("Clear all saved transactions?")) {
      return;
    }
    transactions = [];
    saveTransactions();
    render();
  });
  seedDemo.addEventListener("click", () => {
    transactions = [
      { id: crypto.randomUUID(), amount: 4200, category: "Salary", type: "income", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 1)), note: "Monthly paycheck" },
      { id: crypto.randomUUID(), amount: 1450, category: "Rent", type: "expense", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 3)), note: "Apartment" },
      { id: crypto.randomUUID(), amount: 210, category: "Groceries", type: "expense", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 6)), note: "Weekly stock-up" },
      { id: crypto.randomUUID(), amount: 84, category: "Transport", type: "expense", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 8)), note: "Gas and transit" },
      { id: crypto.randomUUID(), amount: 180, category: "Dining", type: "expense", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 10)), note: "Dinner with friends" },
      { id: crypto.randomUUID(), amount: 350, category: "Freelance", type: "income", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 12)), note: "Side project" },
      { id: crypto.randomUUID(), amount: 96, category: "Entertainment", type: "expense", date: toDateValue(new Date(today.getFullYear(), today.getMonth(), 15)), note: "Streaming and tickets" }
    ];
    saveTransactions();
    render();
  });
  [filterCategory, fromDate, toDate].forEach((input) => input.addEventListener("change", render));
}

function populateCategoryOptions() {
  const selectedFilter = filterCategory.value || "all";
  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...transactions.map((transaction) => transaction.category)]))
    .sort((left, right) => left.localeCompare(right));

  categoryList.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  filterCategory.innerHTML = ["<option value=\"all\">All categories</option>", ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)].join("");
  filterCategory.value = categories.includes(selectedFilter) ? selectedFilter : "all";
}

function handleSubmit(event) {
  event.preventDefault();

  const amount = Number(amountInput.value);
  const category = normalizeCategory(categoryInput.value);
  const type = typeInput.value;
  const date = dateInput.value;
  const note = noteInput.value.trim();

  if (!amount || amount <= 0 || !category || !date) {
    return;
  }

  transactions.unshift({
    id: crypto.randomUUID(),
    amount,
    category,
    type,
    date,
    note
  });

  saveTransactions();
  populateCategoryOptions();
  form.reset();
  dateInput.value = toDateValue(new Date());
  typeInput.value = type;
  render();
}

function getFilteredTransactions() {
  const selectedCategory = filterCategory.value;
  const start = fromDate.value;
  const end = toDate.value;

  return [...transactions]
    .sort((left, right) => right.date.localeCompare(left.date))
    .filter((transaction) => selectedCategory === "all" || transaction.category === selectedCategory)
    .filter((transaction) => !start || transaction.date >= start)
    .filter((transaction) => !end || transaction.date <= end);
}

function render() {
  populateCategoryOptions();

  const allStats = computeStats(transactions);
  const filteredTransactions = getFilteredTransactions();

  heroIncome.textContent = formatMoney(allStats.income);
  heroExpense.textContent = formatMoney(allStats.expense);
  heroBalance.textContent = formatMoney(allStats.balance);

  totalIncome.textContent = formatMoney(allStats.income);
  totalExpense.textContent = formatMoney(allStats.expense);
  netBalance.textContent = formatMoney(allStats.balance);
  topCategory.textContent = allStats.topCategory || "None yet";

  renderChart(allStats.expenseByCategory);
  renderInsight(allStats);
  renderTransactions(filteredTransactions);
}

function computeStats(source) {
  const totals = source.reduce((accumulator, transaction) => {
    const signedAmount = Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      accumulator.income += signedAmount;
    } else {
      accumulator.expense += signedAmount;
      accumulator.expenseByCategory[transaction.category] = (accumulator.expenseByCategory[transaction.category] || 0) + signedAmount;
    }

    return accumulator;
  }, {
    income: 0,
    expense: 0,
    expenseByCategory: {}
  });

  const balance = totals.income - totals.expense;
  const [topCategoryName] = Object.entries(totals.expenseByCategory)
    .sort((left, right) => right[1] - left[1])[0] || [];

  return {
    income: totals.income,
    expense: totals.expense,
    balance,
    expenseByCategory: totals.expenseByCategory,
    topCategory: topCategoryName || "None yet"
  };
}

function renderTransactions(items) {
  if (!items.length) {
    transactionList.innerHTML = `<div class="empty-state">No transactions match the current filters.</div>`;
    return;
  }

  transactionList.innerHTML = items.map((transaction) => {
    const note = transaction.note ? escapeHtml(transaction.note) : "<span class=\"muted\">No note</span>";

    return `
      <article class="transaction">
        <div class="amount ${transaction.type}">${transaction.type === "expense" ? "-" : "+"}${formatMoney(transaction.amount)}</div>
        <div>${escapeHtml(transaction.category)}</div>
        <div><span class="pill ${transaction.type}">${transaction.type}</span></div>
        <div>${formatDisplayDate(transaction.date)}</div>
        <div>${note}</div>
        <div style="text-align:right;">
          <button class="icon-btn" type="button" aria-label="Delete transaction" data-delete="${transaction.id}">×</button>
        </div>
      </article>
    `;
  }).join("");

  transactionList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-delete");
      transactions = transactions.filter((transaction) => transaction.id !== id);
      saveTransactions();
      render();
    });
  });
}

function renderChart(expenseByCategory) {
  const entries = Object.entries(expenseByCategory).sort((left, right) => right[1] - left[1]);

  if (!entries.length) {
    chart.innerHTML = '<div class="empty-state">No expense data yet. Add an expense to see the chart.</div>';
    return;
  }

  const maxValue = entries[0][1];
  chart.innerHTML = entries.map(([category, value]) => {
    const width = Math.max(6, (value / maxValue) * 100);
    return `
      <div class="bar-row">
        <div class="label">${escapeHtml(category)}</div>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
        <div class="bar-value">${formatMoney(value)}</div>
      </div>
    `;
  }).join("");
}

function renderInsight(stats) {
  if (!transactions.length) {
    insightText.textContent = "Add transactions to unlock a rule-based spending insight.";
    return;
  }

  if (stats.balance < 0) {
    insightText.textContent = `Your expenses exceed your income by ${formatMoney(Math.abs(stats.balance))}. Cutting back in ${stats.topCategory !== "None yet" ? stats.topCategory : "your largest spending area"} would have the biggest impact.`;
    return;
  }

  if (stats.expense > 0 && stats.topCategory !== "None yet") {
    const topCategoryAmount = stats.expenseByCategory[stats.topCategory] || 0;
    const share = (topCategoryAmount / stats.expense) * 100;
    if (share >= 35) {
      insightText.textContent = `${stats.topCategory} makes up ${share.toFixed(0)}% of your spending. That category is your clearest lever for reducing expenses.`;
      return;
    }
  }

  if (stats.expense > 0 && stats.income > 0) {
    const spendingRate = (stats.expense / stats.income) * 100;
    if (spendingRate >= 80) {
      insightText.textContent = `You are spending ${spendingRate.toFixed(0)}% of your income. Keeping a little more cash unspent could improve your buffer.`;
      return;
    }
  }

  insightText.textContent = `Healthy sign: you have a positive net balance of ${formatMoney(stats.balance)} and your spending is spread across ${Object.keys(stats.expenseByCategory).length} categories.`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}