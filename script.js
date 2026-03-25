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
    invested: { btc: 0, eth: 0, sol: 0, doge: 0 }
};

if (activeUsername && usersDb[activeUsername]) {
    user.isLoggedIn = true;
    user.username = activeUsername;
    user.balance = usersDb[activeUsername].balance;
    user.portfolio = usersDb[activeUsername].portfolio;
    user.invested = usersDb[activeUsername].invested || { btc: 0, eth: 0, sol: 0, doge: 0 };
} else {
    localStorage.removeItem(ACTIVE_USER_KEY);
}

function saveUserState() {
    if (user.isLoggedIn && user.username) {
        usersDb[user.username].balance = user.balance;
        usersDb[user.username].portfolio = user.portfolio;
        usersDb[user.username].invested = user.invested;
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
        let crypto = cryptos[key]; let price = crypto.history[0]; // Start matching newest of short backwards
        let l_temp = [];
        for (let i = 0; i < maxLongDataPoints; i++) {
            l_temp.push(price);
            let change = (Math.random() - 0.5) * crypto.volatility * 2;
            price = price / (1 + change); 
        }
        crypto.longHistory = l_temp.reverse();
    });

    for (let i = maxLongDataPoints - 1; i >= 0; i--) {
        let pastTime = new Date(now.getTime() - i * 10000); // 10s intervals
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
    
    // Process fast tick (2s)
    let timeString = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    timeLabels.push(timeString);
    if (timeLabels.length > maxDataPoints) timeLabels.shift();

    const previousPrices = {};
    Object.keys(cryptos).forEach((key) => {
        let crypto = cryptos[key];
        previousPrices[key] = crypto.price;
        
        // Random walk
        let trend = (Math.random() - 0.5) * crypto.volatility * 1.5;
        let suddenSpike = (Math.random() > 0.8) ? (Math.random() - 0.5) * crypto.volatility * 2.5 : 0;
        crypto.price = crypto.price * (1 + trend + suddenSpike);
        
        crypto.history.push(crypto.price);
        if (crypto.history.length > maxDataPoints) crypto.history.shift();
        
        crypto.chart.data.labels = timeLabels;
        crypto.chart.data.datasets[0].data = crypto.history;
        crypto.chart.update();
    });

    // Process long tick (every 10s = 5 ticks)
    if (tickCount % 5 === 0) {
        longTimeLabels.push(now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' }));
        if (longTimeLabels.length > maxLongDataPoints) longTimeLabels.shift();
        
        Object.keys(cryptos).forEach(key => {
            cryptos[key].longHistory.push(cryptos[key].price);
            if (cryptos[key].longHistory.length > maxLongDataPoints) cryptos[key].longHistory.shift();
        });
        
        if (portfolioChart) {
            portfolioChart.data.labels = longTimeLabels;
            updatePortfolioChartData(); // Ensures current active line is updated
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
}

// --- PORTFOLIO LOGIC ---
function updatePortfolioView() {
    const tbody = document.getElementById('portfolio-table-body');
    tbody.innerHTML = '';
    
    let totalValue = 0;
    let hasCoins = false;
    
    Object.keys(cryptos).forEach(key => {
        let amount = user.portfolio[key];
        if (amount <= 0.000001) return; // threshold for floating point
        
        hasCoins = true;
        let avgPrice = user.invested[key] / amount;
        let currentValue = amount * cryptos[key].price;
        let profitLoss = ((cryptos[key].price - avgPrice) / avgPrice) * 100;
        
        if(avgPrice === 0) profitLoss = 0;

        totalValue += currentValue;
        
        let plClass = profitLoss >= 0 ? 'pl-positive' : 'pl-negative';
        let plSign = profitLoss >= 0 ? '+' : '';
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cryptos[key].name}</strong> <span style="color:var(--text-secondary);font-size:0.85rem">(${key.toUpperCase()})</span></td>
            <td>${amount.toFixed((key==='doge'||key==='sol')?2:4)}</td>
            <td>${formatCurrency(avgPrice)}</td>
            <td>${formatCurrency(cryptos[key].price)}</td>
            <td class="${plClass}">${plSign}${profitLoss.toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    if (!hasCoins) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">Du besitzt aktuell keine Coins. Kaufe welche im Trading Tab!</td></tr>`;
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
    }, 4000); // Display for 4 seconds
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


// --- TABBING LOGIC ---
document.getElementById('tab-trading').addEventListener('click', () => {
    document.getElementById('tab-trading').classList.add('active');
    document.getElementById('tab-portfolio').classList.remove('active');
    document.getElementById('trading-view').classList.remove('hidden');
    document.getElementById('portfolio-view').classList.add('hidden');
});

document.getElementById('tab-portfolio').addEventListener('click', () => {
    if(!user.isLoggedIn) {
        showToast("Bitte logge dich zuerst ein, um dein Portfolio zu sehen.", "warning");
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('username').focus();
        return;
    }
    document.getElementById('tab-portfolio').classList.add('active');
    document.getElementById('tab-trading').classList.remove('active');
    document.getElementById('trading-view').classList.add('hidden');
    document.getElementById('portfolio-view').classList.remove('hidden');
    
    if (!portfolioChart) initPortfolioChart();
    updatePortfolioView();
});


// --- AUTH & BUY LOGIC ---
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
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;
    hideAuthMessage();
    
    if (u === '' || p === '') { 
        showAuthMessage('Bitte Benutzername und Passwort eingeben.', 'error'); 
        return; 
    }
    
    if (authMode === 'register') {
        if (usersDb[u]) { 
            showAuthMessage('Dieser Benutzername existiert bereits! Bitte wähle einen anderen.', 'error'); 
            return; 
        }
        
        usersDb[u] = {
            password: p,
            balance: 100000.00,
            portfolio: { btc: 0, eth: 0, sol: 0, doge: 0 },
            invested: { btc: 0, eth: 0, sol: 0, doge: 0 }
        };
        localStorage.setItem(USERS_KEY, JSON.stringify(usersDb));
        showToast('Registrierung erfolgreich! Du wurdest eingeloggt.', 'success');
        loginUser(u);
    } else {
        if (!usersDb[u]) { 
            showAuthMessage('Benutzer existiert nicht. Bitte registriere dich zuerst.', 'error'); 
            return; 
        }
        if (usersDb[u].password !== p) { 
            showAuthMessage('Falsches Passwort!', 'error'); 
            return; 
        }
        showToast('Erfolgreich eingeloggt.', 'success');
        loginUser(u);
    }
}

function loginUser(u) {
    user.isLoggedIn = true; user.username = u;
    user.balance = usersDb[u].balance;
    user.portfolio = usersDb[u].portfolio || { btc: 0, eth: 0, sol: 0, doge: 0 };
    user.invested = usersDb[u].invested || { btc: 0, eth: 0, sol: 0, doge: 0 };
    
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
        
        document.getElementById('tab-trading').click(); 
        updateUI(null);
        showToast('Du wurdest erfolgreich ausgeloggt.', 'success');
    });
});

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
        user.invested[key] += cost; // update total cost basis for this coin
        
        saveUserState(); // Persist changes immediately
        
        updateUI(null);
        let btn = document.getElementById(`buy-btn-${key}`);
        let initText = btn.innerText; btn.innerText = 'Gekauft!'; btn.style.backgroundColor = '#16a34a';
        setTimeout(() => { btn.innerText = initText; btn.style.backgroundColor = ''; }, 1200);
        
        showToast(`Kauf erfolgreich: ${amount} ${key.toUpperCase()} für ${formatCurrency(cost)}`, 'success');
    } else {
        showToast(`Nicht genug Guthaben!<br>Kosten: ${formatCurrency(cost)}<br>Guthaben: ${formatCurrency(user.balance)}`, 'error');
    }
};
