// LocalStorage DB
const USERS_KEY = 'crypto_sim_users';
const ACTIVE_USER_KEY = 'crypto_sim_active_user';

let usersDb = JSON.parse(localStorage.getItem(USERS_KEY)) || {};
let activeUsername = localStorage.getItem(ACTIVE_USER_KEY);

// Application State for Trading
let user = {
    isLoggedIn: false,
    username: '',
    balance: 100000.00,
    portfolio: { btc: 0, eth: 0, sol: 0, doge: 0 },
    invested: { btc: 0, eth: 0, sol: 0, doge: 0 },
    history: []
};

if (activeUsername && usersDb[activeUsername]) {
    user.isLoggedIn = true;
    user.username = activeUsername;
    user.balance = usersDb[activeUsername].balance;
    user.portfolio = usersDb[activeUsername].portfolio;
    user.invested = usersDb[activeUsername].invested || { btc: 0, eth: 0, sol: 0, doge: 0 };
    user.history = usersDb[activeUsername].history || [];
} else {
    localStorage.removeItem(ACTIVE_USER_KEY);
}

function saveUserState() {
    if (user.isLoggedIn && user.username) {
        // Use case insensitive mapping key
        const lowerU = user.username.toLowerCase();
        let key = Object.keys(usersDb).find(k => k.toLowerCase() === lowerU) || user.username;
        
        usersDb[key].balance = user.balance;
        usersDb[key].portfolio = user.portfolio;
        usersDb[key].invested = user.invested;
        usersDb[key].history = user.history;
        localStorage.setItem(USERS_KEY, JSON.stringify(usersDb));
    }
}

// Cryptos setup
const cryptos = {
    btc: { name: 'Bitcoin', price: 65000, volatility: 0.015, color: '#f59e0b', history: [], longHistory: [], chart: null },
    eth: { name: 'Ethereum', price: 3500, volatility: 0.02, color: '#8b5cf6', history: [], longHistory: [], chart: null },
    sol: { name: 'Solana', price: 150, volatility: 0.03, color: '#14b8a6', history: [], longHistory: [], chart: null },
    doge: { name: 'Dogecoin', price: 0.15, volatility: 0.08, color: '#eab308', history: [], longHistory: [], chart: null }
};

const maxDataPoints = 40;
const maxLongDataPoints = 300;
let timeLabels = [];
let longTimeLabels = [];
let portfolioChart = null;

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";

function initShortChart(key, crypto) {
    const ctx = document.getElementById(`chart-${key}`).getContext('2d');
    crypto.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: crypto.name,
                data: crypto.history,
                borderColor: crypto.color,
                backgroundColor: crypto.color + '20',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.2, 
                fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#f8fafc', bodyColor: '#e2e8f0', borderColor: '#334155', borderWidth: 1, padding: 10,
                    callbacks: { label: function(c) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 6 }).format(c.parsed.y); } }
                }
            },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { maxTicksLimit: 5 } },
                y: { type: 'linear', grace: '10%', grid: { color: '#1e293b', drawBorder: false }, ticks: { callback: function(value) {
                    if (value < 1) return '$' + value.toFixed(3);
                    if (value < 1000) return '$' + value.toFixed(0);
                    return '$' + (value/1000).toFixed(1) + 'k';
                } } }
            }
        }
    });
}

function initPortfolioChart() {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: longTimeLabels,
            datasets: [{
                label: 'Kein Coin ausgewählt',
                data: [],
                borderColor: '#64748b',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#f8fafc', bodyColor: '#e2e8f0', borderColor: '#334155', borderWidth: 1, padding: 10,
                    callbacks: { label: function(c) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 6 }).format(c.parsed.y); } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
                y: { type: 'linear', grace: '10%', grid: { color: '#1e293b' }, ticks: { callback: function(value) {
                    if (value < 1) return '$' + value.toFixed(3);
                    if (value < 1000) return '$' + value.toFixed(0);
                    return '$' + (value/1000).toFixed(1) + 'k';
                } } }
            }
        }
    });
}

function seedData() {
    let now = new Date();
    Object.keys(cryptos).forEach(key => { cryptos[key].history = []; cryptos[key].longHistory = []; });
    timeLabels = []; longTimeLabels = [];

    // Seed short history
    let tempHistory = { btc: [], eth: [], sol: [], doge: [] };
    Object.keys(cryptos).forEach(key => {
        let crypto = cryptos[key]; let price = crypto.price; tempHistory[key].push(price);
        for (let i = 1; i < maxDataPoints; i++) {
            let change = (Math.random() - 0.5) * crypto.volatility * 2;
            price = price / (1 + change); 
            tempHistory[key].push(price);
        }
        crypto.history = tempHistory[key].reverse();
    });

    for (let i = maxDataPoints - 1; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 2000);
        timeLabels.push(pastTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
    }

    // Seed long history
    Object.keys(cryptos).forEach(key => {
        let crypto = cryptos[key]; let price = crypto.history[0]; 
        let l_temp = [];
        for (let i = 0; i < maxLongDataPoints; i++) {
            l_temp.push(price);
            let change = (Math.random() - 0.5) * crypto.volatility * 2;
            price = price / (1 + change); 
        }
        crypto.longHistory = l_temp.reverse();
    });

    for (let i = maxLongDataPoints - 1; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 10000); 
        longTimeLabels.push(pastTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' }));
    }
}

seedData();
Object.keys(cryptos).forEach(key => { initShortChart(key, cryptos[key]); });
updateUI(null);

let tickCount = 0;
setInterval(() => {
    tickCount++;
    let now = new Date();
    
    let timeString = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    timeLabels.push(timeString);
    if (timeLabels.length > maxDataPoints) timeLabels.shift();

    const previousPrices = {};
    Object.keys(cryptos).forEach((key) => {
        let crypto = cryptos[key];
        previousPrices[key] = crypto.price;
        
        let trend = (Math.random() - 0.5) * crypto.volatility * 1.5;
        let suddenSpike = (Math.random() > 0.8) ? (Math.random() - 0.5) * crypto.volatility * 2.5 : 0;
        crypto.price = crypto.price * (1 + trend + suddenSpike);
        
        crypto.history.push(crypto.price);
        if (crypto.history.length > maxDataPoints) crypto.history.shift();
        
        crypto.chart.data.labels = timeLabels;
        crypto.chart.data.datasets[0].data = crypto.history;
        crypto.chart.update();
    });

    if (tickCount % 5 === 0) {
        longTimeLabels.push(now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' }));
        if (longTimeLabels.length > maxLongDataPoints) longTimeLabels.shift();
        
        Object.keys(cryptos).forEach(key => {
            cryptos[key].longHistory.push(cryptos[key].price);
            if (cryptos[key].longHistory.length > maxLongDataPoints) cryptos[key].longHistory.shift();
        });
        
        if (portfolioChart) {
            portfolioChart.data.labels = longTimeLabels;
            updatePortfolioChartData();
        }
    }

    updateUI(previousPrices);
}, 2000);

function formatCurrency(value) {
    if (value >= 1000) return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (value >= 1) return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function updateUI(previousPrices) {
    Object.keys(cryptos).forEach(key => {
        let crypto = cryptos[key];
        let priceElement = document.getElementById(`price-${key}`);
        let changeElement = document.getElementById(`change-${key}`);
        priceElement.innerText = formatCurrency(crypto.price);
        
        if (previousPrices && previousPrices[key]) {
            let prevPrice = previousPrices[key];
            let percentChange = ((crypto.price - prevPrice) / prevPrice) * 100;
            let sign = percentChange >= 0 ? '+' : '';
            changeElement.innerText = `${sign}${percentChange.toFixed(2)}%`;
            if (percentChange >= 0) { changeElement.className = 'change positive'; } 
            else { changeElement.className = 'change negative'; }
        }
    });

    if (user.isLoggedIn) {
        document.getElementById('login-modal-btn').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('display-username').innerText = user.username;
        document.getElementById('display-balance').innerText = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(user.balance);

        Object.keys(cryptos).forEach(key => {
            document.getElementById(`buy-amount-${key}`).disabled = false;
            document.getElementById(`buy-btn-${key}`).disabled = false;
        });
    } else {
        document.getElementById('login-modal-btn').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        Object.keys(cryptos).forEach(key => {
            document.getElementById(`buy-amount-${key}`).disabled = true;
            document.getElementById(`buy-btn-${key}`).disabled = true;
        });
    }

    Object.keys(cryptos).forEach(key => {
        let amount = user.portfolio[key];
        let decimals = (key === 'doge' || key === 'sol') ? 2 : 4;
        document.getElementById(`owned-${key}`).innerText = amount.toFixed(decimals);
    });

    if (!document.getElementById('portfolio-view').classList.contains('hidden')) {
        updatePortfolioView();
    }
    if (!document.getElementById('leaderboard-view').classList.contains('hidden')) {
        updateLeaderboardView();
    }
}

// --- PORTFOLIO & SELL LOGIC ---
function updatePortfolioView() {
    const tbody = document.getElementById('portfolio-table-body');
    tbody.innerHTML = '';
    
    let hasCoins = false;
    
    Object.keys(cryptos).forEach(key => {
        let amount = user.portfolio[key];
        if (amount <= 0.000001) return;
        
        hasCoins = true;
        let avgPrice = user.invested[key] / amount;
        if(isNaN(avgPrice) || !isFinite(avgPrice)) avgPrice = 0;
        
        let profitLoss = ((cryptos[key].price - avgPrice) / avgPrice) * 100;
        if(avgPrice === 0) profitLoss = 0;

        let plClass = profitLoss >= 0 ? 'pl-positive' : 'pl-negative';
        let plSign = profitLoss >= 0 ? '+' : '';
        let step = (key === 'btc' || key === 'eth') ? '0.1' : (key === 'sol' ? '1' : '10');
        let amountFormatted = amount.toFixed((key==='doge'||key==='sol')?2:4);
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cryptos[key].name}</strong> <span style="color:var(--text-secondary);font-size:0.85rem">(${key.toUpperCase()})</span></td>
            <td>${amountFormatted}</td>
            <td>${formatCurrency(avgPrice)}</td>
            <td>${formatCurrency(cryptos[key].price)}</td>
            <td class="${plClass}">${plSign}${profitLoss.toFixed(2)}%</td>
            <td>
                <div class="sell-form">
                    <input type="number" id="sell-amount-${key}" class="sell-input" min="${step}" step="${step}" max="${amountFormatted}" value="${amountFormatted}">
                    <button class="btn small sell-btn" onclick="sellCrypto('${key}')">Verkaufen</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (!hasCoins) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Du besitzt aktuell keine Coins. Kaufe welche im Trading Tab!</td></tr>`;
    }
    
    updatePortfolioDropdown();
}

function updatePortfolioDropdown() {
    const selector = document.getElementById('portfolio-chart-selector');
    if (!selector) return;

    const oldVal = selector.value;
    selector.innerHTML = '';
    
    let ownsAny = false;
    Object.keys(cryptos).forEach(key => {
        if (user.portfolio[key] > 0.000001) {
            ownsAny = true;
            let opt = document.createElement('option');
            opt.value = key;
            opt.innerText = cryptos[key].name;
            selector.appendChild(opt);
        }
    });

    if (!ownsAny) {
        let opt = document.createElement('option');
        opt.value = '';
        opt.innerText = 'Keine Coins';
        selector.appendChild(opt);
        if (portfolioChart) {
            portfolioChart.data.datasets[0].label = 'Keine Coins';
            portfolioChart.data.datasets[0].data = [];
            portfolioChart.update();
        }
    } else {
        if (selector.querySelector(`option[value="${oldVal}"]`)) {
            selector.value = oldVal;
        } else {
            selector.value = selector.options[0].value; 
        }
        updatePortfolioChartData();
    }
}

function updatePortfolioChartData() {
    if (!portfolioChart) return;
    const selected = document.getElementById('portfolio-chart-selector').value;
    if (selected && cryptos[selected]) {
        const crypto = cryptos[selected];
        portfolioChart.data.datasets[0].label = crypto.name;
        portfolioChart.data.datasets[0].data = crypto.longHistory;
        portfolioChart.data.datasets[0].borderColor = crypto.color;
        portfolioChart.data.datasets[0].backgroundColor = crypto.color + '20';
        portfolioChart.update();
    }
}
document.getElementById('portfolio-chart-selector').addEventListener('change', updatePortfolioChartData);


// --- LOG TAB LOGIC ---
function updateLogView() {
    const tbody = document.getElementById('log-table-body');
    tbody.innerHTML = '';
    
    if (!user.history || user.history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Noch keine Trading-Aktivitäten vorhanden.</td></tr>`;
        return;
    }
    
    user.history.forEach(entry => {
        let typeHtml = entry.type === 'buy' ? '<span style="color:var(--positive);font-weight:600;">Kauf</span>' : '<span style="color:var(--negative);font-weight:600;">Verkauf</span>';
        let profitHtml = '<span style="color:var(--text-secondary)">-</span>';
        
        if (entry.type === 'sell' && entry.profit !== null && entry.profit !== undefined) {
            let pClass = entry.profit >= 0 ? 'pl-positive' : 'pl-negative';
            let pSign = entry.profit >= 0 ? '+' : '';
            profitHtml = `<span class="${pClass}">${pSign}${entry.profit.toFixed(2)}%</span>`;
        }
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.time}</td>
            <td>${typeHtml}</td>
            <td><strong>${entry.amount} ${entry.coin}</strong></td>
            <td>${formatCurrency(entry.price)}</td>
            <td>${formatCurrency(entry.total)}</td>
            <td>${profitHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}


// --- CUSTOM UI COMPONENTS (Toasts & Modals) ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

let confirmCallback = null;
const confirmModal = document.getElementById('confirm-modal');

document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    confirmCallback = null;
});

document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    if (confirmCallback) confirmCallback();
});

function showConfirm(title, message, callback) {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerHTML = message;
    confirmCallback = callback;
    confirmModal.classList.remove('hidden');
}


// --- LEADERBOARD LOGIC ---
let leaderboardLimit = 10;

function updateLeaderboardView() {
    const tbody = document.getElementById('leaderboard-table-body');
    const loadMoreBtn = document.getElementById('leaderboard-load-more');
    if (!tbody || !loadMoreBtn) return;
    
    tbody.innerHTML = '';
    let ranking = [];
    
    for (let username in usersDb) {
        let uData = usersDb[username];
        if (!uData.history || uData.history.length === 0) continue;
        
        let portfolioValue = 0;
        if (uData.portfolio) {
            Object.keys(cryptos).forEach(key => {
                if (uData.portfolio[key] > 0) {
                    portfolioValue += uData.portfolio[key] * cryptos[key].price;
                }
            });
        }
        
        let totalNetWorth = uData.balance + portfolioValue;
        ranking.push({
            name: username,
            balance: uData.balance,
            portfolioValue: portfolioValue,
            netWorth: totalNetWorth
        });
    }
    
    ranking.sort((a, b) => b.netWorth - a.netWorth);
    
    if (ranking.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Noch keine Trader für das Leaderboard qualifiziert.</td></tr>`;
        loadMoreBtn.classList.add('hidden');
        return;
    }
    
    let renderedCount = Math.min(ranking.length, leaderboardLimit);
    for (let i = 0; i < renderedCount; i++) {
        let r = ranking[i];
        let isMe = (user.isLoggedIn && user.username === r.name);
        let nameHtml = isMe ? `<strong style="color:var(--accent)">${r.name} (Du)</strong>` : `<strong>${r.name}</strong>`;
        
        let rankHtml = '';
        if (i === 0) rankHtml = '🥇 1';
        else if (i === 1) rankHtml = '🥈 2';
        else if (i === 2) rankHtml = '🥉 3';
        else rankHtml = `${i + 1}.`;
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${rankHtml}</td>
            <td>${nameHtml}</td>
            <td>${formatCurrency(r.balance)}</td>
            <td>${formatCurrency(r.portfolioValue)}</td>
            <td style="color:var(--positive); font-weight:700;">${formatCurrency(r.netWorth)}</td>
        `;
        tbody.appendChild(tr);
    }
    
    if (ranking.length > 10 && leaderboardLimit === 10) {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }
}

document.getElementById('leaderboard-load-more').addEventListener('click', () => {
    leaderboardLimit = 20;
    updateLeaderboardView();
});


// --- TABBING LOGIC ---
['tab-trading', 'tab-portfolio', 'tab-log', 'tab-leaderboard'].forEach(tab => {
    document.getElementById(tab).addEventListener('click', (e) => {
        if((tab === 'tab-portfolio' || tab === 'tab-log') && !user.isLoggedIn) {
            showToast("Bitte logge dich zuerst ein.", "warning");
            document.getElementById('login-modal').classList.remove('hidden');
            document.getElementById('username').focus();
            return;
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(tab.replace('tab-', '') + '-view').classList.remove('hidden');

        if(tab === 'tab-portfolio') {
            if(!portfolioChart) initPortfolioChart();
            updatePortfolioView();
        } else if(tab === 'tab-log') {
            updateLogView();
        } else if(tab === 'tab-leaderboard') {
            leaderboardLimit = 10;
            updateLeaderboardView();
        }
    });
});


// --- AUTH LOGIC ---
let authMode = 'login';

function showAuthMessage(msg, type = 'error') {
    const box = document.getElementById('auth-message-box');
    box.innerHTML = msg;
    box.className = `auth-message-box ${type}`;
    box.classList.remove('hidden');
}

function hideAuthMessage() {
    const box = document.getElementById('auth-message-box');
    if(box) box.classList.add('hidden');
}

document.getElementById('tab-login-form').addEventListener('click', () => {
    hideAuthMessage();
    authMode = 'login';
    document.getElementById('tab-login-form').classList.add('active');
    document.getElementById('tab-register-form').classList.remove('active');
    document.getElementById('auth-title').innerText = 'Account Login';
    document.getElementById('auth-desc').innerText = 'Logge dich ein, um weiter zu traden.';
    document.getElementById('submit-auth').innerText = 'Einloggen';
});

document.getElementById('tab-register-form').addEventListener('click', () => {
    hideAuthMessage();
    authMode = 'register';
    document.getElementById('tab-register-form').classList.add('active');
    document.getElementById('tab-login-form').classList.remove('active');
    document.getElementById('auth-title').innerText = 'Neuen Account erstellen';
    document.getElementById('auth-desc').innerText = 'Registriere dich, um mit $100.000 Startkapital loszulegen.';
    document.getElementById('submit-auth').innerText = 'Registrieren';
});

document.getElementById('login-modal-btn').addEventListener('click', () => { hideAuthMessage(); document.getElementById('login-modal').classList.remove('hidden'); document.getElementById('username').focus(); });
document.getElementById('cancel-login').addEventListener('click', () => { document.getElementById('login-modal').classList.add('hidden'); document.getElementById('username').value = ''; document.getElementById('password').value = ''; hideAuthMessage(); });
document.getElementById('submit-auth').addEventListener('click', doAuth);
document.getElementById('password').addEventListener('keypress', (e) => { if (e.key === 'Enter') doAuth(); });

function doAuth() {
    const rawU = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;
    hideAuthMessage();
    
    if (rawU === '' || p === '') { 
        showAuthMessage('Bitte Benutzername und Passwort eingeben.', 'error'); 
        return; 
    }
    
    const lowerU = rawU.toLowerCase();
    const existingKey = Object.keys(usersDb).find(k => k.toLowerCase() === lowerU);
    
    if (authMode === 'register') {
        if (existingKey) { 
            showAuthMessage('Dieser Benutzername existiert bereits! Bitte wähle einen anderen.', 'error'); 
            return; 
        }
        
        usersDb[rawU] = {
            password: p,
            balance: 100000.00,
            portfolio: { btc: 0, eth: 0, sol: 0, doge: 0 },
            invested: { btc: 0, eth: 0, sol: 0, doge: 0 },
            history: []
        };
        localStorage.setItem(USERS_KEY, JSON.stringify(usersDb));
        showToast('Registrierung erfolgreich! Du wurdest eingeloggt.', 'success');
        loginUser(rawU);
    } else {
        if (!existingKey) { 
            showAuthMessage('Benutzer existiert nicht. Bitte registriere dich zuerst.', 'error'); 
            return; 
        }
        if (usersDb[existingKey].password !== p) { 
            showAuthMessage('Falsches Passwort!', 'error'); 
            return; 
        }
        showToast('Erfolgreich eingeloggt.', 'success');
        loginUser(existingKey);
    }
}

function loginUser(u) {
    user.isLoggedIn = true; user.username = u;
    user.balance = usersDb[u].balance;
    user.portfolio = usersDb[u].portfolio || { btc: 0, eth: 0, sol: 0, doge: 0 };
    user.invested = usersDb[u].invested || { btc: 0, eth: 0, sol: 0, doge: 0 };
    user.history = usersDb[u].history || [];
    
    localStorage.setItem(ACTIVE_USER_KEY, u);
    
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('username').value = ''; document.getElementById('password').value = '';
    updateUI(null);
}

document.getElementById('logout-btn').addEventListener('click', () => {
    showConfirm('Logout bestätigen', 'Möchtest du dich wirklich aus deinem Trading-Konto ausloggen?', () => {
        saveUserState();
        user.isLoggedIn = false; user.username = '';
        localStorage.removeItem(ACTIVE_USER_KEY);
        
        user.balance = 0;
        user.portfolio = { btc: 0, eth: 0, sol: 0, doge: 0 };
        user.invested = { btc: 0, eth: 0, sol: 0, doge: 0 };
        user.history = [];
        
        document.getElementById('tab-trading').click(); 
        updateUI(null);
        showToast('Du wurdest erfolgreich ausgeloggt.', 'success');
    });
});


// --- TRADING (BUY/SELL) LOGIC ---
window.buyCrypto = function(key) {
    if (!user.isLoggedIn) return;
    let crypto = cryptos[key];
    let amount = parseFloat(document.getElementById(`buy-amount-${key}`).value);
    
    if (isNaN(amount) || amount <= 0) { 
        showToast('Ungültige Menge. Bitte überprüfe deine Eingabe.', 'error'); 
        return; 
    }
    
    let cost = amount * crypto.price;
    if (user.balance >= cost) {
        user.balance -= cost;
        user.portfolio[key] += amount;
        user.invested[key] += cost; 
        
        user.history.unshift({
            time: new Date().toLocaleString('de-DE'),
            type: 'buy',
            coin: crypto.name,
            amount: amount,
            price: crypto.price,
            total: cost,
            profit: null
        });
        
        saveUserState(); 
        
        updateUI(null);
        let btn = document.getElementById(`buy-btn-${key}`);
        let initText = btn.innerText; btn.innerText = 'Gekauft!'; btn.style.backgroundColor = '#16a34a';
        setTimeout(() => { btn.innerText = initText; btn.style.backgroundColor = ''; }, 1200);
        
        showToast(`Kauf erfolgreich: ${amount} ${key.toUpperCase()} für ${formatCurrency(cost)}`, 'success');
    } else {
        showToast(`Nicht genug Guthaben!<br>Kosten: ${formatCurrency(cost)}<br>Guthaben: ${formatCurrency(user.balance)}`, 'error');
    }
};

window.sellCrypto = function(key) {
    if (!user.isLoggedIn) return;
    
    let crypto = cryptos[key];
    let amountInput = document.getElementById(`sell-amount-${key}`);
    let amountToSell = parseFloat(amountInput.value);
    let currentOwned = user.portfolio[key];
    
    if (isNaN(amountToSell) || amountToSell <= 0 || amountToSell > (currentOwned + 0.000001)) { 
        showToast('Ungültige Menge. Du kannst nicht mehr verkaufen, als du besitzt.', 'error'); 
        return; 
    }
    
    if (amountToSell > currentOwned) amountToSell = currentOwned; // Handle floating point drifts gracefully
    
    let currentPrice = crypto.price;
    let avgPrice = user.invested[key] / currentOwned;
    if (isNaN(avgPrice) || !isFinite(avgPrice)) avgPrice = 0;
    
    let profitPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
    let revenue = amountToSell * currentPrice;
    
    user.balance += revenue;
    
    // Decrease the aggregate cost basis proportionately
    let proportion = amountToSell / currentOwned;
    user.invested[key] -= (user.invested[key] * proportion);
    user.portfolio[key] -= amountToSell;

    // Zero out drift
    if (user.portfolio[key] < 0.000001) {
        user.portfolio[key] = 0;
        user.invested[key] = 0;
    }
    
    user.history.unshift({
        time: new Date().toLocaleString('de-DE'),
        type: 'sell',
        coin: crypto.name,
        amount: amountToSell,
        price: currentPrice,
        total: revenue,
        profit: profitPercent
    });
    
    saveUserState();
    updatePortfolioView(); // Re-render local portfolio DOM
    updateUI(null);
    
    showToast(`Verkauf erfolgreich: ${amountToSell} ${key.toUpperCase()} für ${formatCurrency(revenue)}`, 'success');
};
