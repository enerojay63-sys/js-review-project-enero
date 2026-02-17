/* ========================================
   FULL-STACK WEB APP - JAVASCRIPT
   Student Build - Phase by Phase
   ======================================== */

// ========================================
// GLOBAL VARIABLES
// ========================================

// Storage key for localStorage
const STORAGE_KEY = 'ipt_demo_v1';

// Current logged-in user (null if not logged in)
let currentUser = null;

window.db = {
    accounts: [],
    departments: [],
    employees: [],
    requests: []
};

// ========================================
// PHASE 2: CLIENT-SIDE ROUTING
// ========================================

/**
 * Navigate to a specific route (hash)
 * @param {string} hash - The route to navigate to (e.g., '#/login')
 */
function navigateTo(hash) {
    window.location.hash = hash;
}

/**
 * Handle routing - shows/hides pages based on current URL hash
 * This function runs whenever the URL hash changes
 */
function handleRouting() {

    let hash = window.location.hash.slice(1) || '/';
    
    if (hash.startsWith('/')) {
        hash = hash.slice(1);
    }
    
    console.log('Navigating to:', hash); // Helpful for debugging
    
    const protectedRoutes = ['profile', 'requests'];
    const adminRoutes = ['employees', 'accounts', 'departments'];
    
    if (protectedRoutes.includes(hash) && !currentUser) {
        console.log('Access denied: Not authenticated');
        navigateTo('#/login');
        showToast('Please login to access this page', 'warning');
        return;
    }
    
    if (adminRoutes.includes(hash) && (!currentUser || currentUser.role !== 'admin')) {
        console.log('Access denied: Not an admin');
        navigateTo('#/');
        showToast('Access denied. Admin privileges required.', 'danger');
        return;
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    let pageId = hash === '' || hash === '/' ? 'home' : hash;
    const targetPage = document.getElementById(`${pageId}-page`);
    
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Call specific page render functions
        switch(pageId) {
            case 'profile':
                renderProfile();
                break;
            case 'employees':
                renderEmployeesTable();
                break;
            case 'accounts':
                renderAccountsList();
                break;
            case 'departments':
                renderDepartmentsList();
                break;
            case 'requests':
                renderRequestsList();
                break;
            case 'verify-email':
                renderVerifyEmail();
                break;
        }
    } else {
        // Page not found - go to home
        navigateTo('#/');
    }
}

// ========================================
// PHASE 3: AUTHENTICATION SYSTEM
// ========================================

/**
 * Set authentication state and update UI accordingly
 * @param {boolean} isAuthenticated - Whether user is logged in
 * @param {object} user - User object (if logged in)
 */
function setAuthState(isAuthenticated, user = null) {
    currentUser = user;
    
    const body = document.body;
    
    if (isAuthenticated && user) {
        // User is logged in
        body.classList.remove('not-authenticated');
        body.classList.add('authenticated');
        
        // Update username display in navbar
        document.getElementById('username-display').textContent = user.firstName;
        
        // Check if user is admin
        if (user.role === 'admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }
    } else {
        // User is not logged in
        body.classList.remove('authenticated', 'is-admin');
        body.classList.add('not-authenticated');
        currentUser = null;
    }
}

/**
 * Handle user registration
 */
function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    
    // Check if email already exists
    const existingUser = window.db.accounts.find(acc => acc.email === email);
    if (existingUser) {
        showToast('Email already registered!', 'danger');
        return;
    }
    
    // Create new account
    const newAccount = {
        id: Date.now(), // Simple ID generation
        firstName,
        lastName,
        email,
        password, // In real app, this would be hashed!
        role: 'user', // Default role
        verified: false, // Not verified yet
        createdAt: new Date().toISOString()
    };
    
    // Add to database
    window.db.accounts.push(newAccount);
    saveToStorage();
    
    // Store email for verification page
    localStorage.setItem('unverified_email', email);
    
    // Navigate to verification page
    showToast('Account created! Please verify your email.', 'success');
    navigateTo('#/verify-email');
    
    // Clear form
    document.getElementById('register-form').reset();
}

/**
 * Render verification email page
 */
function renderVerifyEmail() {
    const email = localStorage.getItem('unverified_email');
    if (email) {
        document.getElementById('verify-email-display').textContent = email;
    } else {
        navigateTo('#/');
    }
}

/**
 * Simulate email verification
 */
function handleVerifyEmail() {
    const email = localStorage.getItem('unverified_email');
    
    if (!email) {
        showToast('No email to verify', 'danger');
        return;
    }
    
    // Find the account
    const account = window.db.accounts.find(acc => acc.email === email);
    
    if (account) {
        account.verified = true;
        saveToStorage();
        localStorage.removeItem('unverified_email');
        showToast('Email verified successfully! You can now login.', 'success');
        navigateTo('#/login');
    } else {
        showToast('Account not found', 'danger');
    }
}

/**
 * Handle user login
 */
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    
    // Find matching account
    const account = window.db.accounts.find(acc => 
        acc.email === email && 
        acc.password === password && 
        acc.verified === true
    );
    
    if (account) {
        // Save auth token (in real app, this would be a JWT or session token)
        localStorage.setItem('auth_token', account.email);
        
        // Set authentication state
        setAuthState(true, account);
        
        showToast(`Welcome back, ${account.firstName}!`, 'success');
        navigateTo('#/profile');
        
        // Clear form
        document.getElementById('login-form').reset();
    } else {
        showToast('Invalid credentials or email not verified', 'danger');
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    localStorage.removeItem('auth_token');
    setAuthState(false);
    showToast('Logged out successfully', 'info');
    navigateTo('#/');
}

// ========================================
// PHASE 4: DATA PERSISTENCE
// ========================================

/**
 * Load data from localStorage
 */
function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        
        if (data) {
            window.db = JSON.parse(data);
            console.log('Data loaded from storage');
        } else {
            // First time - seed with initial data
            seedInitialData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        seedInitialData();
    }
}

/**
 * Save data to localStorage
 */
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
        console.log('Data saved to storage');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

/**
 * Seed initial data (first time setup)
 */
function seedInitialData() {
    window.db = {
        accounts: [
            {
                id: 1,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: 'Password123!',
                role: 'admin',
                verified: true,
                createdAt: new Date().toISOString()
            }
        ],
        departments: [
            {
                id: 1,
                name: 'Engineering',
                description: 'Software development and IT'
            },
            {
                id: 2,
                name: 'HR',
                description: 'Human Resources'
            }
        ],
        employees: [],
        requests: []
    };
    
    saveToStorage();
    console.log('Initial data seeded');
}

// ========================================
// PHASE 5: PROFILE PAGE
// ========================================

/**
 * Render user profile page
 */
function renderProfile() {
    if (!currentUser) return;
    
    const profileContent = document.getElementById('profile-content');
    
    profileContent.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>First Name:</strong> ${currentUser.firstName}</p>
                <p><strong>Last Name:</strong> ${currentUser.lastName}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Role:</strong> <span class="badge bg-${currentUser.role === 'admin' ? 'danger' : 'primary'}">${currentUser.role}</span></p>
                <p><strong>Account Created:</strong> ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
        <button class="btn btn-primary mt-3" onclick="alert('Edit profile feature coming soon!')">Edit Profile</button>
    `;
}

// ========================================
// PHASE 6: ADMIN FEATURES (Placeholder Functions)
// ========================================

function renderAccountsList() {
    // TODO: Phase 6 - Implement accounts management
    document.getElementById('accounts-table-container').innerHTML = `
        <p class="text-muted">Accounts management will be implemented in Phase 6</p>
    `;
}

function renderEmployeesTable() {
    // TODO: Phase 6 - Implement employees management
    document.getElementById('employees-table-container').innerHTML = `
        <p class="text-muted">Employees management will be implemented in Phase 6</p>
    `;
}

function renderDepartmentsList() {
    // TODO: Phase 6 - Implement departments management
    document.getElementById('departments-table-container').innerHTML = `
        <p class="text-muted">Departments management will be implemented in Phase 6</p>
    `;
}

// ========================================
// PHASE 7: REQUESTS (Placeholder Functions)
// ========================================

function renderRequestsList() {
    // TODO: Phase 7 - Implement requests
    document.getElementById('requests-table-container').innerHTML = `
        <p class="text-muted">Requests will be implemented in Phase 7</p>
    `;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: success, danger, warning, info
 */
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toast');
    const toastBody = document.getElementById('toast-message');
    
    // Set message
    toastBody.textContent = message;
    
    // Set color based on type
    toastElement.className = `toast bg-${type} text-white`;
    
    // Show toast
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize the application
 */
function init() {
    console.log('Initializing app...');
    
    // Load data from localStorage
    loadFromStorage();
    
    // Check if user was previously logged in
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
        const user = window.db.accounts.find(acc => acc.email === authToken);
        if (user && user.verified) {
            setAuthState(true, user);
        } else {
            // Invalid token - clear it
            localStorage.removeItem('auth_token');
        }
    }
    
    // Set initial hash if empty
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    
    // Handle initial route
    handleRouting();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('App initialized!');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Listen for hash changes (navigation)
    window.addEventListener('hashchange', handleRouting);
    
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Verify email button
    const verifyBtn = document.getElementById('simulate-verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerifyEmail);
    }
    
    // Add Account button (placeholder)
    const addAccountBtn = document.getElementById('add-account-btn');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', () => {
            alert('Add Account feature will be implemented in Phase 6');
        });
    }
    
    // Add Employee button (placeholder)
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            alert('Add Employee feature will be implemented in Phase 6');
        });
    }
    
    // Add Department button (placeholder)
    const addDepartmentBtn = document.getElementById('add-department-btn');
    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', () => {
            alert('Add Department feature will be implemented in Phase 6');
        });
    }
    
    // New Request button (placeholder)
    const newRequestBtn = document.getElementById('new-request-btn');
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', () => {
            alert('New Request feature will be implemented in Phase 7');
        });
    }
}

// ========================================
// START THE APP
// ========================================

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
