// ═══════════════════════════════════════════════════════
//  auth.js  —  Expense Pattern · Master Auth & Storage
//  7-day session · multi-user · hashed passwords
// ═══════════════════════════════════════════════════════

const EP = (function () {

  const KEYS = {
    USERS   : 'ep_users',
    SESSION : 'ep_session',
    SETUP   : 'ep_setup',       // name + currency per user
    INCOME  : 'ep_income',      // income per user
    WALLET  : 'ep_wallet',      // wallet/budget per user
    EXPENSES: 'ep_expenses',    // expenses per user
  };

  const SESSION_DAYS = 7;

  // ── djb2 hash (keeps passwords out of plain text) ──
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  // ── Generic storage helpers ──────────────────────────
  function get(key)        { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  function set(key, val)   { localStorage.setItem(key, JSON.stringify(val)); }
  function remove(key)     { localStorage.removeItem(key); }

  // ── Per-user key namespacing ─────────────────────────
  function userKey(base, username) { return base + ':' + username.toLowerCase(); }

  // ════════════════════════════════════════════
  //  USER STORE
  // ════════════════════════════════════════════
  function loadUsers()      { return get(KEYS.USERS) || []; }
  function saveUsers(users) { set(KEYS.USERS, users); }

  function findUser(username) {
    return loadUsers().find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  // ════════════════════════════════════════════
  //  SESSION
  // ════════════════════════════════════════════
  function writeSession(username) {
    set(KEYS.SESSION, {
      username,
      expiresAt : Date.now() + SESSION_DAYS * 86400000,
      createdAt : Date.now()
    });
  }

  function getSession() {
    const s = get(KEYS.SESSION);
    if (!s) return null;
    if (Date.now() > s.expiresAt) { remove(KEYS.SESSION); return null; }
    return s;
  }

  function clearSession() { remove(KEYS.SESSION); }

  function requireSession(redirectTo) {
    const s = getSession();
    if (!s) { window.location.href = redirectTo || '01-login.html'; return null; }
    return s;
  }

  function getDaysLeft() {
    const s = getSession();
    if (!s) return 0;
    return Math.ceil((s.expiresAt - Date.now()) / 86400000);
  }

  // ════════════════════════════════════════════
  //  AUTH: SIGNUP
  // ════════════════════════════════════════════
  function signup(fullName, dob, username, password) {
    if (!fullName || !dob || !username || !password)
      return { ok: false, error: 'All fields are required.' };

    if (username.trim().length < 3 || username.includes(' '))
      return { ok: false, error: 'Username must be ≥3 chars and have no spaces.' };

    if (password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters.' };

    // Age check (13+)
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 13);
    if (new Date(dob) > cutoff)
      return { ok: false, error: 'You must be at least 13 years old.' };

    const users = loadUsers();
    if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase()))
      return { ok: false, error: 'That email / username is already registered.' };

    const newUser = {
      fullName  : fullName.trim(),
      dob,
      username  : username.trim(),
      passHash  : hash(password),
      createdAt : Date.now()
    };
    users.push(newUser);
    saveUsers(users);
    writeSession(username.trim());
    return { ok: true, user: newUser };
  }

  // ════════════════════════════════════════════
  //  AUTH: LOGIN
  // ════════════════════════════════════════════
  function login(username, password) {
    if (!username || !password)
      return { ok: false, error: 'Please enter both username and password.' };

    const user = findUser(username);
    if (!user)
      return { ok: false, error: 'No account found with that username.' };

    if (user.passHash !== hash(password))
      return { ok: false, error: 'Incorrect password. Please try again.' };

    writeSession(user.username);
    return { ok: true, user };
  }

  // ════════════════════════════════════════════
  //  AUTH: LOGOUT
  // ════════════════════════════════════════════
  function logout() { clearSession(); window.location.href = '01-login.html'; }

  // ════════════════════════════════════════════
  //  CURRENT USER HELPERS
  // ════════════════════════════════════════════
  function currentUser() {
    const s = getSession();
    if (!s) return null;
    return findUser(s.username);
  }

  function currentUsername() {
    const s = getSession();
    return s ? s.username.toLowerCase() : null;
  }

  // ════════════════════════════════════════════
  //  PER-USER DATA: SETUP (name + currency)
  // ════════════════════════════════════════════
  function saveSetup(name, currency) {
    const u = currentUsername(); if (!u) return;
    set(userKey(KEYS.SETUP, u), { name, currency, savedAt: Date.now() });
  }

  function getSetup() {
    const u = currentUsername(); if (!u) return null;
    return get(userKey(KEYS.SETUP, u));
  }

  // ════════════════════════════════════════════
  //  PER-USER DATA: INCOME
  // ════════════════════════════════════════════
  function saveIncome(amount) {
    const u = currentUsername(); if (!u) return;
    set(userKey(KEYS.INCOME, u), { amount: parseFloat(amount), savedAt: Date.now() });
  }

  function getIncome() {
    const u = currentUsername(); if (!u) return null;
    return get(userKey(KEYS.INCOME, u));
  }

  // ════════════════════════════════════════════
  //  PER-USER DATA: WALLET
  // ════════════════════════════════════════════
  function saveWallet(budgetAmount, budgetPeriod) {
    const u = currentUsername(); if (!u) return;
    const existing = getWallet();

    // Wallet balance should start from the user's income, NOT the budget limit.
    // Budget is just a spending cap for tracking — the actual spendable balance
    // comes from the income the user entered in income.html.
    const incomeData  = getIncome();
    const incomeVal   = incomeData ? incomeData.amount : parseFloat(budgetAmount);
    const totalSpent  = (function() {
      const uk2 = userKey(KEYS.EXPENSES, u);
      try {
        const exps = JSON.parse(localStorage.getItem(uk2)) || [];
        return exps.reduce(function(s, e) { return s + parseFloat(e.amount || 0); }, 0);
      } catch { return 0; }
    })();

    set(userKey(KEYS.WALLET, u), {
      budgetAmount : parseFloat(budgetAmount),
      budgetPeriod,
      // On first save: walletBalance = income minus anything already spent.
      // On re-save (editing): preserve current balance so expenses aren't wiped.
      walletBalance: existing ? existing.walletBalance : (incomeVal - totalSpent),
      createdAt    : existing ? existing.createdAt : new Date().toISOString(),
      updatedAt    : Date.now()
    });
  }

  function getWallet() {
    const u = currentUsername(); if (!u) return null;
    return get(userKey(KEYS.WALLET, u));
  }

  function updateWalletBalance(newBalance) {
    const u = currentUsername(); if (!u) return;
    const w = getWallet(); if (!w) return;
    w.walletBalance = newBalance;
    w.updatedAt = Date.now();
    set(userKey(KEYS.WALLET, u), w);
  }

  // ════════════════════════════════════════════
  //  PER-USER DATA: EXPENSES
  // ════════════════════════════════════════════
  function getExpenses() {
    const u = currentUsername(); if (!u) return [];
    return get(userKey(KEYS.EXPENSES, u)) || [];
  }

  function saveExpenses(expenses) {
    const u = currentUsername(); if (!u) return;
    set(userKey(KEYS.EXPENSES, u), expenses);
  }

  function addExpense(expense) {
    const expenses = getExpenses();
    expense.id = Date.now();
    expense.date = expense.date || new Date().toISOString().split('T')[0];
    expenses.push(expense);
    saveExpenses(expenses);

    // Deduct from wallet
    const w = getWallet();
    if (w) updateWalletBalance(w.walletBalance - parseFloat(expense.amount));
    return expense;
  }

  function deleteExpense(id) {
    const expenses = getExpenses();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) return;
    const removed = expenses[idx];
    expenses.splice(idx, 1);
    saveExpenses(expenses);
    // Refund wallet
    const w = getWallet();
    if (w) updateWalletBalance(w.walletBalance + parseFloat(removed.amount));
  }

  // ════════════════════════════════════════════
  //  CURRENCY SYMBOL HELPER
  // ════════════════════════════════════════════
  function currencySymbol() {
    const setup = getSetup();
    if (!setup || !setup.currency) return '₹';
    const map = {
      'Indian Rupee (₹)': '₹',
      'US Dollar ($)': '$',
      'Euro (€)': '€',
      'British Pound (£)': '£',
      'Japanese Yen (¥)': '¥',
      'Canadian Dollar (C$)': 'C$',
      'Australian Dollar (A$)': 'A$',
      'Singapore Dollar (S$)': 'S$',
      'UAE Dirham (د.إ)': 'د.إ',
      'Chinese Yuan (¥)': '¥'
    };
    return map[setup.currency] || '₹';
  }

  // ════════════════════════════════════════════
  //  UI HELPERS — shared error/success display
  // ════════════════════════════════════════════
  function showError(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = '#ff5fa2';
    el.style.fontSize = '0.8rem';
    el.style.textAlign = 'center';
    el.style.marginBottom = '10px';
    el.style.padding = '8px';
    el.style.borderRadius = '8px';
    el.style.background = 'rgba(255,95,162,0.08)';
  }

  function hideError(elId) {
    const el = document.getElementById(elId);
    if (el) el.style.display = 'none';
  }

  // ════════════════════════════════════════════
  //  PUBLIC API
  // ════════════════════════════════════════════
  return {
    signup, login, logout,
    getSession, requireSession, getDaysLeft, currentUser, currentUsername,
    saveSetup, getSetup,
    saveIncome, getIncome,
    saveWallet, getWallet, updateWalletBalance,
    getExpenses, saveExpenses, addExpense, deleteExpense,
    currencySymbol,
    showError, hideError
  };

})();
