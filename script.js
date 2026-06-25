// ----- State -----
let expenses = [];
let chart = null;

// ----- DOM References -----
const form = document.getElementById('expense-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const expenseList = document.getElementById('expense-list');
const totalExpensesEl = document.getElementById('total-expenses');
const highestCategoryEl = document.getElementById('highest-category');
const totalEntriesEl = document.getElementById('total-entries');
const clearAllBtn = document.getElementById('clear-all-btn');
const ctx = document.getElementById('expense-chart').getContext('2d');

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
        // Seed with sample data for a better first impression
        expenses = [
            { id: Date.now() + 1, description: 'Grocery Shopping', amount: 85.50, category: 'Food' },
            { id: Date.now() + 2, description: 'Uber Ride', amount: 24.00, category: 'Transport' },
            { id: Date.now() + 3, description: 'Netflix Subscription', amount: 15.99, category: 'Entertainment' },
        ];
        saveExpenses();
    }
    render();
}

// ----- Save to LocalStorage -----
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// ----- Generate unique ID -----
function generateId() {
    return Date.now() + Math.random() * 1000;
}

// ----- Add Expense -----
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

// ----- Delete Expense -----
function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    saveExpenses();
    render();
}

// ----- Clear All -----
function clearAllExpenses() {
    if (expenses.length === 0) return;
    if (confirm('Delete all expenses? This cannot be undone.')) {
        expenses = [];
        saveExpenses();
        render();
    }
}

// ----- Calculate Summary -----
function getSummary() {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const count = expenses.length;

    // Find highest category
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    let highestCat = '—';
    let highestAmt = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > highestAmt) {
            highestAmt = amt;
            highestCat = cat;
        }
    }
    return { total, count, highestCat };
}

// ----- Render Expense List -----
function renderList() {
    if (expenses.length === 0) {
        expenseList.innerHTML = `<p class="empty-message">No expenses yet. Add one above!</p>`;
        return;
    }

    // Sort by newest first
    const sorted = [...expenses].reverse();

    expenseList.innerHTML = sorted.map(exp => {
        const categoryEmojis = {
            'Food': '🍔',
            'Transport': '🚗',
            'Entertainment': '🎬',
            'Shopping': '🛍️',
            'Bills': '📄',
            'Health': '💊',
            'Education': '📚',
            'Other': '📦'
        };
        const emoji = categoryEmojis[exp.category] || '📦';
        return `
            <div class="expense-item category-${exp.category}">
                <div class="expense-info">
                    <span class="expense-category">${emoji}</span>
                    <span class="expense-desc">${escapeHtml(exp.description)}</span>
                </div>
                <span class="expense-amount">$${exp.amount.toFixed(2)}</span>
                <button class="expense-delete" data-id="${exp.id}" title="Delete">✕</button>
            </div>
        `;
    }).join('');

    // Add delete event listeners
    document.querySelectorAll('.expense-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseFloat(btn.dataset.id);
            deleteExpense(id);
        });
    });
}

// Simple escape to prevent XSS (good practice)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ----- Render Chart -----
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
        // Show empty state
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
                plugins: {
                    legend: { display: false },
                },
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

// ----- Render Summary -----
function renderSummary() {
    const { total, count, highestCat } = getSummary();
    totalExpensesEl.textContent = `$${total.toFixed(2)}`;
    totalEntriesEl.textContent = count;
    highestCategoryEl.textContent = highestCat !== '—' ? highestCat : '—';
}

// ----- Main Render -----
function render() {
    renderSummary();
    renderList();
    renderChart();
}

// ----- Form Submit -----
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

    // Reset form
    descriptionInput.value = '';
    amountInput.value = '';
    categorySelect.value = '';
    descriptionInput.focus();
});

// ----- Clear All -----
clearAllBtn.addEventListener('click', clearAllExpenses);

// ----- Initialize -----
loadExpenses();
