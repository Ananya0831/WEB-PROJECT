// ═══════════════════════════════════════════════════════
//  common.js  —  Expense Pattern · Shared Page Logic
//  Depends on: auth.js (loaded first)
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {

  // ════════════════════════════════════════════
  //  DASHBOARD PAGE
  // ════════════════════════════════════════════

  const welcomeText = document.getElementById('welcomeText');
  if (welcomeText) {
    // Requires session or redirect
    const session = EP.requireSession('index.html');
    if (!session) return;

    const setup   = EP.getSetup();
    const income  = EP.getIncome();
    const wallet  = EP.getWallet();
    const sym     = EP.currencySymbol();
    const expenses = EP.getExpenses();

    // Welcome greeting
    const name = setup ? setup.name : session.username;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    welcomeText.textContent = greet + ', ' + name + ' 👋';

    // Wallet balance
    const walletAmountEl = document.getElementById('walletAmount');
    const budgetAmountEl = document.getElementById('budgetAmount');
    const progressFill   = document.querySelector('.progress-fill');

    if (walletAmountEl && wallet) {
      walletAmountEl.textContent = sym + wallet.walletBalance.toLocaleString();
      if (budgetAmountEl) budgetAmountEl.textContent = sym + wallet.budgetAmount.toLocaleString();
      if (progressFill) {
        const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
let pct = wallet.budgetAmount > 0
  ? (totalSpent / wallet.budgetAmount) * 100
  : 0;

pct = Math.max(0, Math.min(100, pct));
progressFill.style.width = pct + '%';
      }
    } else if (walletAmountEl) {
      walletAmountEl.textContent = sym + '0';
    }

    // Income
    const incomeAmountEl = document.getElementById('incomeAmount');
    if (incomeAmountEl && income) {
      incomeAmountEl.textContent = sym + ' ' + income.amount.toLocaleString();
    }

    // Total expense
    const expenseAmountEl = document.getElementById('expenseAmount');
    if (expenseAmountEl) {
      const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
      expenseAmountEl.textContent = sym + ' ' + totalExp.toLocaleString();
    }

    // Edit income button
    const editIncomeBtn = document.querySelector('.edit-income-btn');
    if (editIncomeBtn) {
      editIncomeBtn.addEventListener('click', function () {
        window.location.href = 'income.html';
      });
    }

    // Logout link in sidebar
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', function (e) {
        e.preventDefault();
        EP.logout();
      });
    }
  }

  // ════════════════════════════════════════════
  //  LOGOUT on any page
  // ════════════════════════════════════════════
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink && !welcomeText) {
    logoutLink.addEventListener('click', function (e) {
      e.preventDefault();
      EP.logout();
    });
  }
  


  // ════════════════════════════════════════════
  //  DASHBOARD BAR CHART (Income vs Expense)
  // ════════════════════════════════════════════
  const barCtx = document.getElementById('barChart');
  if (barCtx) {
    const sym      = EP.currencySymbol();
    const expenses = EP.getExpenses();
    const income   = EP.getIncome();
    const incomeVal = income ? income.amount : 0;

    // Build monthly expense totals
    const monthlyExpense = new Array(12).fill(0);
    expenses.forEach(function (e) {
      const d = new Date(e.date);
      if (!isNaN(d)) monthlyExpense[d.getMonth()] += parseFloat(e.amount || 0);
    });

    const monthlyIncome = new Array(12).fill(incomeVal);

    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [
          { label: 'Income',  data: monthlyIncome,  backgroundColor: '#aae9d0', borderRadius: 6 },
          { label: 'Expense', data: monthlyExpense, backgroundColor: '#ed788d', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: {
          x: { ticks: { color: '#fff' } },
          y: { beginAtZero: true, ticks: { color: '#fff', callback: function(v){ return sym + v; } } }
        }
      }
    });
  }

  // ════════════════════════════════════════════
  //  CATEGORY PIE CHART (with working toggle)
  // ════════════════════════════════════════════
  const pieCtx = document.getElementById('categoryPieChart');
  if (pieCtx) {
    const sym      = EP.currencySymbol();
    const allExpenses = EP.getExpenses();

    const CATS = [
      { label: '🏠 Housing',        color: '#F6B26B' },
      { label: '🍽️ Food & Dining',  color: '#F77F00' },
      { label: '🍎 Groceries',      color: '#D65A31' },
      { label: '🚗 Transport',      color: '#FF9ACD' },
      { label: '🎓 Education',      color: '#FF5FA2' },
      { label: '🏥 Medical',        color: '#D63384' },
      { label: '🛍️ Shopping',      color: '#C77DFF' },
      { label: '🎬 Entertainment',  color: '#9D4EDD' },
      { label: '📦 Others',         color: '#5A189A' }
    ];

    // Filter expenses by period
    function filterExpensesByPeriod(expenses, period) {
      const now = new Date();
      return expenses.filter(function(e) {
        const d = new Date(e.date);
        if (isNaN(d)) return false;
        if (period === 'monthly') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (period === 'weekly') {
          // current week: Mon–Sun
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
          startOfWeek.setHours(0,0,0,0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23,59,59,999);
          return d >= startOfWeek && d <= endOfWeek;
        }
        return true; // all time
      });
    }

    // Build category map from a set of expenses
    function buildCategoryMap(expenses) {
      const map = {};
      expenses.forEach(function(e) {
        const cat = e.category || 'Others';
        map[cat] = (map[cat] || 0) + parseFloat(e.amount || 0);
      });
      return map;
    }

    // Build chart data arrays from a category map
    function buildChartData(categoryMap) {
      if (Object.keys(categoryMap).length === 0) {
        // Demo data when no real expenses
        return {
          labels     : CATS.map(function(c){ return c.label; }),
          dataValues : [15000,6000,4500,3000,8000,2500,5000,3500,2000],
          colors     : CATS.map(function(c){ return c.color; })
        };
      }
      const labels     = Object.keys(categoryMap);
      const dataValues = Object.values(categoryMap);
      const colors     = labels.map(function(l, i) {
        const found = CATS.find(function(c) {
          return c.label.includes(l) || l.includes(c.label.replace(/^[^ ]+ /,''));
        });
        return found ? found.color : CATS[i % CATS.length].color;
      });
      return { labels, dataValues, colors };
    }

    // Initial render — monthly
    const initData  = buildChartData(buildCategoryMap(filterExpensesByPeriod(allExpenses, 'monthly')));
    const initTotal = initData.dataValues.reduce(function(a,b){ return a+b; }, 0);

    const pieChart = new Chart(pieCtx, {
      type: 'pie',
      data: { labels: initData.labels, datasets: [{ data: initData.dataValues, backgroundColor: initData.colors }] },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: '#fff' } },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const total = ctx.chart.data.datasets[0].data.reduce(function(a,b){ return a+b; }, 0);
                const pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0';
                return sym + ctx.raw.toLocaleString() + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });

    // Wire the Monthly / Weekly toggle buttons to actually update the pie
    const toggleBtns = document.querySelectorAll('.category-card .toggle-btn');
    toggleBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        toggleBtns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');

        const period   = btn.dataset.view;               // 'monthly' or 'weekly'
        const filtered = filterExpensesByPeriod(EP.getExpenses(), period);
        const catMap   = buildCategoryMap(filtered);
        const newData  = buildChartData(catMap);

        pieChart.data.labels                    = newData.labels;
        pieChart.data.datasets[0].data          = newData.dataValues;
        pieChart.data.datasets[0].backgroundColor = newData.colors;
        pieChart.update();
      });
    });
  }

  // ════════════════════════════════════════════
  //  CASH FLOW CHART
  // ════════════════════════════════════════════
  const cashFlowCanvas = document.getElementById('cashFlowChart');
  if (cashFlowCanvas) {
    const sym      = EP.currencySymbol();
    const expenses = EP.getExpenses();
    const income   = EP.getIncome();
    const incomeVal = income ? income.amount : 0;

    // Build real monthly totals
    const monthlyExp = new Array(12).fill(0);
    expenses.forEach(function(e) {
      const d = new Date(e.date);
      if (!isNaN(d)) monthlyExp[d.getMonth()] += parseFloat(e.amount || 0);
    });

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const WEEKS  = ['Week 1','Week 2','Week 3','Week 4'];

    // Weekly: split this month's expenses
    const weeklyExp = [0,0,0,0];
    const now = new Date();
    expenses.forEach(function(e) {
      const d = new Date(e.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const day  = d.getDate();
        const week = Math.min(3, Math.floor((day-1)/7));
        weeklyExp[week] += parseFloat(e.amount || 0);
      }
    });

    const cashFlowData = {
      monthly: {
        labels : MONTHS,
        income : new Array(12).fill(incomeVal),
        expense: monthlyExp
      },
      weekly: {
        labels : WEEKS,
        income : new Array(4).fill(Math.round(incomeVal/4)),
        expense: weeklyExp
      },
      yearly: {
        labels : [String(new Date().getFullYear())],
        income : [incomeVal * 12],
        expense: [monthlyExp.reduce(function(a,b){return a+b;},0)]
      }
    };

    let currentView = 'monthly';

    const cashFlowChart = new Chart(cashFlowCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels  : cashFlowData[currentView].labels,
        datasets: [
          { label: 'Income',  data: cashFlowData[currentView].income,  backgroundColor: '#aae9d0', borderRadius: 6 },
          { label: 'Expense', data: cashFlowData[currentView].expense, backgroundColor: '#ed788d', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: {
          x: { ticks: { color: '#fff' } },
          y: { beginAtZero: true, ticks: { color: '#fff', callback: function(v){ return sym + v; } } }
        }
      }
    });

    document.querySelectorAll('.toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.toggle-btn').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        currentView = btn.dataset.view;
        cashFlowChart.data.labels        = cashFlowData[currentView].labels;
        cashFlowChart.data.datasets[0].data = cashFlowData[currentView].income;
        cashFlowChart.data.datasets[1].data = cashFlowData[currentView].expense;
        cashFlowChart.update();
      });
    });
  }

  // ════════════════════════════════════════════
  //  GLOBAL REDIRECT FUNCTIONS (popup buttons)
  // ════════════════════════════════════════════
  window.goToSetup     = function () { window.location.href = 'setup.html'; };
  window.goToWallet    = function () { window.location.href = 'wallet.html'; };
  window.goToDashboard = function () { window.location.href = 'dashboard.html'; };

});
