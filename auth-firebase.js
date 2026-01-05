/**
 * Firebase Authentication Module for CredHive X
 * Supports Email/Password and Google OAuth
 * Fallback to localStorage if Firebase not configured
 */

(function() {
  'use strict';

  const STORAGE_USER = 'auth_user_firebase';
  const STORAGE_TOKEN = 'auth_token_firebase';
  const STORAGE_GOOGLE_INFO = 'auth_google_info';
  const STORAGE_AUTH_METHOD = 'auth_method'; // 'email' or 'google'

  let firebase_app = null;
  let firebase_auth = null;
  let isFirebaseReady = false;

  // Initialize Firebase if available
  function initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && window.auth) {
        firebase_app = window.firebase_app;
        firebase_auth = window.auth;
        isFirebaseReady = true;
        console.log('✅ Firebase Auth Ready');
        setupFirebaseListeners();
        return true;
      } else if (typeof firebase !== 'undefined') {
        firebase_app = window.firebase_app || firebase.initializeApp(window.firebaseConfig || {});
        firebase_auth = firebase.auth(firebase_app);
        window.auth = firebase_auth;
        isFirebaseReady = true;
        console.log('✅ Firebase Auth Ready (fallback init)');
        setupFirebaseListeners();
        return true;
      }
    } catch (e) {
      console.warn('⚠️ Firebase not available, using fallback auth', e.message);
    }
    return false;
  }

  // Firebase Auth State Listener
  function setupFirebaseListeners() {
    if (!firebase_auth) return;
    
    firebase_auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL,
          isEmailVerified: user.emailVerified,
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime
        };
        
        localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_TOKEN, await user.getIdToken());
        
        // Determine auth method
        const isGoogleAuth = user.providerData.some(p => p.providerId === 'google.com');
        localStorage.setItem(STORAGE_AUTH_METHOD, isGoogleAuth ? 'google' : 'email');
        
        renderAuthUI();
        fireAuthChangeEvent(userData);
      } else {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_AUTH_METHOD);
        renderAuthUI();
        fireAuthChangeEvent(null);
      }
    });
  }

  // Get current logged-in user
  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem(STORAGE_USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  // Fallback: Email/Password Registration
  async function registerWithEmail(email, password, displayName) {
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();
    displayName = (displayName || '').trim();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!displayName || displayName.length < 2) {
      throw new Error('Please enter your name');
    }

    if (isFirebaseReady && firebase_auth) {
      try {
        const credential = await firebase_auth.createUserWithEmailAndPassword(email, password);
        const user = credential.user;
        
        // Update display name
        await user.updateProfile({ displayName });
        
        // Send verification email (optional)
        // await user.sendEmailVerification();
        
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: user.metadata.creationTime
        };
        
        localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_AUTH_METHOD, 'email');
        localStorage.setItem(STORAGE_TOKEN, await user.getIdToken());
        
        renderAuthUI();
        fireAuthChangeEvent(userData);
        return userData;
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Try logging in.');
        } else if (error.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Use at least 8 characters.');
        } else {
          throw new Error(error.message || 'Registration failed');
        }
      }
    } else {
      // Fallback: localStorage-based registration
      return fallbackRegisterEmail(email, password, displayName);
    }
  }

  // Fallback: Email/Password Login
  async function loginWithEmail(email, password) {
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    if (!password) {
      throw new Error('Please enter your password');
    }

    if (isFirebaseReady && firebase_auth) {
      try {
        const credential = await firebase_auth.signInWithEmailAndPassword(email, password);
        const user = credential.user;
        
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastSignIn: user.metadata.lastSignInTime
        };
        
        localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_AUTH_METHOD, 'email');
        localStorage.setItem(STORAGE_TOKEN, await user.getIdToken());
        
        renderAuthUI();
        fireAuthChangeEvent(userData);
        return userData;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          throw new Error('No account found with this email. Please sign up.');
        } else if (error.code === 'auth/wrong-password') {
          throw new Error('Incorrect password. Try again.');
        } else if (error.code === 'auth/invalid-email') {
          throw new Error('Invalid email address');
        } else {
          throw new Error(error.message || 'Login failed');
        }
      }
    } else {
      // Fallback: localStorage-based login
      return fallbackLoginEmail(email, password);
    }
  }

  // Google OAuth Login / Signup (Auto-creates account if new user)
  async function loginWithGoogle() {
    // FALLBACK: If Firebase not ready, show instruction to use email signup instead
    if (!isFirebaseReady || !firebase_auth) {
      console.log('ℹ️ Firebase not configured for Google OAuth. Using email/password system.');
      throw new Error('⚠️ Firebase not configured! Please add your real Firebase credentials in index.html (lines 24-30) from Firebase Console → Project Settings.');
    }
    
    if (isFirebaseReady && firebase_auth) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        const credential = await firebase_auth.signInWithPopup(provider);
        const user = credential.user;
        const isNewUser = credential.additionalUserInfo.isNewUser;
        
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          isNewUser,
          lastSignIn: user.metadata.lastSignInTime
        };
        
        localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_AUTH_METHOD, 'google');
        localStorage.setItem(STORAGE_TOKEN, await user.getIdToken());
        localStorage.setItem(STORAGE_GOOGLE_INFO, JSON.stringify(credential.additionalUserInfo));
        
        renderAuthUI();
        fireAuthChangeEvent(userData);
        
        // Redirect to main interface on success
        setTimeout(() => {
          window.location.href = 'main-interface.html';
        }, 500);
        
        return userData;
      } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') {
          throw new Error('Google login was cancelled');
        } else if (error.code === 'auth/popup-blocked') {
          throw new Error('Pop-up was blocked. Please allow pop-ups and try again.');
        } else if (error.code === 'auth/unauthorized-domain') {
          throw new Error('Unauthorized domain. Use http://localhost:5501 or add 127.0.0.1 to Firebase Authentication → Settings → Authorized domains.');
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          throw new Error('An account already exists with the same email. Try signing in with email/password.');
        } else {
          throw new Error(error.message || 'Google login failed');
        }
      }
    } else {
      throw new Error('Google authentication not available. Please setup Firebase.');
    }
  }

  // Logout
  async function logout() {
    if (isFirebaseReady && firebase_auth) {
      try {
        await firebase_auth.signOut();
      } catch (e) {
        console.warn('Firebase logout warning:', e);
      }
    }
    
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_AUTH_METHOD);
    localStorage.removeItem(STORAGE_GOOGLE_INFO);
    
    renderAuthUI();
    fireAuthChangeEvent(null);
  }

  // ==================== FALLBACK: localStorage-based auth ====================
  const FALLBACK_USERS = 'fallback_auth_users';
  
  async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function fallbackGetUsers() {
    try {
      return JSON.parse(localStorage.getItem(FALLBACK_USERS) || '{}');
    } catch (e) {
      return {};
    }
  }

  function fallbackSaveUsers(users) {
    localStorage.setItem(FALLBACK_USERS, JSON.stringify(users));
  }

  async function fallbackRegisterEmail(email, password, displayName) {
    const users = fallbackGetUsers();
    
    if (users[email]) {
      throw new Error('This email is already registered. Try logging in.');
    }
    
    const passHash = await sha256(password);
    const uid = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    users[email] = {
      uid,
      email,
      displayName,
      passHash,
      createdAt: new Date().toISOString(),
      authMethod: 'email'
    };
    
    fallbackSaveUsers(users);
    
    const userData = { uid, email, displayName, createdAt: users[email].createdAt };
    localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_AUTH_METHOD, 'email');
    
    renderAuthUI();
    fireAuthChangeEvent(userData);
    return userData;
  }

  async function fallbackLoginEmail(email, password) {
    const users = fallbackGetUsers();
    const user = users[email];
    
    if (!user) {
      throw new Error('No account found with this email. Please sign up.');
    }
    
    const passHash = await sha256(password);
    if (passHash !== user.passHash) {
      throw new Error('Incorrect password. Try again.');
    }
    
    const userData = { uid: user.uid, email: user.email, displayName: user.displayName };
    localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_AUTH_METHOD, 'email');
    
    renderAuthUI();
    fireAuthChangeEvent(userData);
    return userData;
  }

  // ==================== UI RENDERING ====================

  function renderAuthUI() {
    const nav = document.querySelector('header nav');
    if (!nav) return;

    let authSlot = document.getElementById('auth-ui-slot');
    if (!authSlot) {
      authSlot = document.createElement('div');
      authSlot.id = 'auth-ui-slot';
      nav.appendChild(authSlot);
    }

    const user = getCurrentUser();
    authSlot.innerHTML = '';

    if (!user) {
      // Not logged in - show Login/Signup buttons
      const loginBtn = document.createElement('a');
      loginBtn.href = 'login.html';
      loginBtn.className = 'btn primary';
      loginBtn.style.marginLeft = '8px';
      loginBtn.innerHTML = '<span style="margin-right:6px">🔐</span>Login';
      authSlot.appendChild(loginBtn);
    } else {
      // Logged in - show user menu
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '8px';
      wrapper.style.alignItems = 'center';

      const userChip = document.createElement('button');
      userChip.className = 'btn secondary';
      userChip.style.cursor = 'pointer';
      const initials = user.displayName
        .split(/\s+/)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      userChip.innerHTML = `<span style="margin-right:6px">${user.photoURL ? '📷' : initials}</span>${user.displayName.split(' ')[0]}`;

      const menu = document.createElement('div');
      menu.className = 'auth-menu';
      menu.style.display = 'none';
      menu.style.position = 'absolute';
      menu.style.top = '100%';
      menu.style.right = '0';
      menu.style.backgroundColor = 'var(--card)';
      menu.style.border = '1px solid var(--border)';
      menu.style.borderRadius = '12px';
      menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
      menu.style.zIndex = '1000';
      menu.style.minWidth = '200px';

      const profileBtn = document.createElement('button');
      profileBtn.style.width = '100%';
      profileBtn.style.padding = '12px 16px';
      profileBtn.style.border = 'none';
      profileBtn.style.background = 'none';
      profileBtn.style.textAlign = 'left';
      profileBtn.style.cursor = 'pointer';
      profileBtn.style.fontSize = '14px';
      profileBtn.innerHTML = `📧 <strong>${user.email}</strong>`;
      profileBtn.addEventListener('mouseenter', () => (profileBtn.style.backgroundColor = 'var(--bg)'));
      profileBtn.addEventListener('mouseleave', () => (profileBtn.style.backgroundColor = 'transparent'));

      const logoutBtn = document.createElement('button');
      logoutBtn.style.width = '100%';
      logoutBtn.style.padding = '12px 16px';
      logoutBtn.style.border = 'none';
      logoutBtn.style.background = 'none';
      logoutBtn.style.textAlign = 'left';
      logoutBtn.style.cursor = 'pointer';
      logoutBtn.style.fontSize = '14px';
      logoutBtn.style.color = '#ef4444';
      logoutBtn.innerHTML = '🚪 Logout';
      logoutBtn.addEventListener('mouseenter', () => (logoutBtn.style.backgroundColor = 'var(--bg)'));
      logoutBtn.addEventListener('mouseleave', () => (logoutBtn.style.backgroundColor = 'transparent'));
      logoutBtn.addEventListener('click', () => {
        logout();
        menu.style.display = 'none';
      });

      menu.appendChild(profileBtn);
      menu.appendChild(logoutBtn);

      userChip.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          menu.style.display = 'none';
        }
      });

      wrapper.appendChild(userChip);
      wrapper.style.position = 'relative';
      wrapper.appendChild(menu);
      authSlot.appendChild(wrapper);
    }
  }

  // Fire custom event when auth state changes
  function fireAuthChangeEvent(user) {
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
  }

  // ==================== PUBLIC API ====================
  window.Auth = {
    // Auth methods
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
    
    // User info
    getCurrentUser,
    isFirebaseReady: () => isFirebaseReady,
    
    // Utilities
    firebaseAuth: () => firebase_auth,
    firebaseApp: () => firebase_app
  };

  // Initialize
  function init() {
    if (!document.querySelector('link[href$="auth-firebase.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'auth-firebase.css';
      document.head.appendChild(link);
    }
    
    initFirebase();
    renderAuthUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
