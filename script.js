// ----- State -----
let expenses = [];
let chart = null;
let currentCurrency = 'USD';
let monthlyBudget = 0;

// ----- DOM References -----
const form = document.getElementById('expense-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const expenseList = document.getElementById('expense-list');
const totalExpensesEl = document.getElementById('total-expenses');
const budgetDisplayEl = document.getElementById('budget-display');
const remainingBalanceEl = document.getElementById('remaining-balance');
const topCategoryEl = document.getElementById('top-category');
const currencySelect = document.getElementById('currency-select');
const budgetInput = document.getElementById('budget-input');
const setBudgetBtn = document.getElementById('set-budget-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const budgetStatus = document.getElementById('budget-status');
const ctx = document.getElementById('expense-chart').getContext('2d');

// ----- Currency Formatter -----
function formatCurrency(amount) {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currentCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (e) {
        // Fallback if currency code is invalid
        return `$ ${amount.toFixed(2)}`;
    }
}

// ----- Load from LocalStorage -----
function loadExpenses() {
    const stored = localStorage.getItem('expenses');
    if (stored) {
        try {
            expenses = JSON.parse(stored);
        } catch (e) {
            expenses = [];
        }
    } else {
        expenses = [
            { id: Date.now() + 1, description: 'Grocery Shopping', amount: 85.50, category: 'Food' },
            { id: Date.now() + 2, description: 'Uber Ride', amount: 24.00, category: 'Transport' },
            { id: Date.now() + 3, description: 'Netflix Subscription', amount: 15.99, category: 'Entertainment' },
        ];
        saveExpenses();
    }
}

function loadPreferences() {
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) {
        currentCurrency = savedCurrency;
        currencySelect.value = savedCurrency;
    }

    const savedBudget = localStorage.getItem('budget');
    if (savedBudget) {
        monthlyBudget = parseFloat(savedBudget) || 0;
        budgetInput.value = monthlyBudget;
    }
}

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function savePreferences() {
    localStorage.setItem('currency', currentCurrency);
    localStorage.setItem('budget', monthlyBudget.toString());
}

// ----- Generate ID -----
function generateId() {
    return Date.now() + Math.random() * 1000;
}

// ----- CRUD Operations -----
function addExpense(description, amount, category) {
    const expense = {
        id: generateId(),
        description: description.trim(),
        amount: parseFloat(amount),
        category: category,
    };
    expenses.push(expense);
    saveExpenses();
    render();
}

function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    saveExpenses();
    render();
}

function clearAllExpenses() {
    if (expenses.length === 0) return;
    if (confirm('Delete all expenses? This cannot be undone.')) {
        expenses = [];
        saveExpenses();
        render();
    }
}

// ----- Summary Logic -----
function getSummary() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = expenses.length;

    // Find highest spending category
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    let topCat = '—';
    let topAmt = 0;
    const catEmojis = {
        'Food': '🍔',
        'Transport': '🚗',
        'Entertainment': '🎬',
        'Shopping': '🛍️',
        'Bills': '📄',
        'Health': '💊',
        'Education': '📚',
        'Other': '📦'
    };
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > topAmt) {
            topAmt = amt;
            topCat = cat;
        }
    }
    const topDisplay = topCat !== '—' ? `${catEmojis[topCat] || '📦'} ${topCat} (${formatCurrency(topAmt)})` : '—';

    const remaining = monthlyBudget - total;

    return { total, count, remaining, topDisplay };
}

// ----- Render Functions -----
function renderList() {
    if (expenses.length === 0) {
        expenseList.innerHTML = `<p class="empty-message">No expenses yet. Add one above!</p>`;
        return;
    }

    const sorted = [...expenses].reverse();
    expenseList.innerHTML = sorted.map(exp => {
        const catEmojis = {
            'Food': '🍔', 'Transport': '🚗', 'Entertainment': '🎬',
            'Shopping': '🛍️', 'Bills': '📄', 'Health': '💊',
            'Education': '📚', 'Other': '📦'
        };
        const emoji = catEmojis[exp.category] || '📦';
        return `
            <div class="expense-item category-${exp.category}">
                <div class="expense-info">
                    <span class="expense-category">${emoji}</span>
                    <span class="expense-desc">${escapeHtml(exp.description)}</span>
                </div>
                <span class="expense-amount">${formatCurrency(exp.amount)}</span>
                <button class="expense-delete" data-id="${exp.id}" title="Delete">✕</button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.expense-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseFloat(btn.dataset.id);
            deleteExpense(id);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderSummary() {
    const { total, count, remaining, topDisplay } = getSummary();
    totalExpensesEl.textContent = formatCurrency(total);
    budgetDisplayEl.textContent = formatCurrency(monthlyBudget);
    topCategoryEl.textContent = topDisplay;

    // Remaining balance with color coding
    remainingBalanceEl.textContent = formatCurrency(remaining);
    if (remaining < 0) {
        remainingBalanceEl.classList.add('negative');
    } else {
        remainingBalanceEl.classList.remove('negative');
    }

    // Update budget status message
    if (monthlyBudget === 0) {
        budgetStatus.textContent = '💡 Set your monthly budget to track your progress.';
        budgetStatus.style.color = '#475569';
    } else if (remaining < 0) {
        budgetStatus.textContent = `⚠️ You're over budget by ${formatCurrency(Math.abs(remaining))}!`;
        budgetStatus.style.color = '#f87171';
    } else {
        budgetStatus.textContent = `✅ You're on track! ${formatCurrency(remaining)} remaining this month.`;
        budgetStatus.style.color = '#4ade80';
    }
}

function renderChart() {
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    const colors = [
        '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6',
        '#ef4444', '#14b8a6', '#f97316', '#6b7280'
    ];

    if (chart) {
        chart.destroy();
        chart = null;
    }

    if (expenses.length === 0) {
        chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#30363d'],
                    borderColor: ['#30363d'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
            },
        });
        return;
    }

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#161b22',
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e8edf5',
                        font: { family: 'Inter', size: 11 },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                    }
                }
            },
            cutout: '60%',
        },
    });
}

function render() {
    renderSummary();
    renderList();
    renderChart();
}

// ----- Event Listeners -----

// Add Expense
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const description = descriptionInput.value.trim();
    const amount = amountInput.value;
    const category = categorySelect.value;

    if (!description || !amount || !category) {
        alert('Please fill in all fields.');
        return;
    }

    addExpense(description, amount, category);
    descriptionInput.value = '';
    amountInput.value = '';
    categorySelect.value = '';
    descriptionInput.focus();
});

// Currency Change
currencySelect.addEventListener('change', () => {
    currentCurrency = currencySelect.value;
    savePreferences();
    render();
});

// Set Budget
function setBudget() {
    const value = parseFloat(budgetInput.value);
    if (isNaN(value) || value < 0) {
        alert('Please enter a valid budget amount.');
        return;
    }
    monthlyBudget = value;
    savePreferences();
    render();
    budgetInput.value = monthlyBudget; // keep displayed
}

setBudgetBtn.addEventListener('click', setBudget);
budgetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') setBudget();
});

// Clear All
clearAllBtn.addEventListener('click', clearAllExpenses);

// ----- Initialize -----
loadPreferences();
loadExpenses();
render();
