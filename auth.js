(function(){
  const STORAGE_USERS = 'auth_users';
  const STORAGE_CURRENT = 'auth_current';
  const STORAGE_REDIRECT = 'auth_post_redirect';
  const STORAGE_TOKEN = 'auth_token';
  const STORAGE_USEROBJ = 'auth_user';
  const STORAGE_REMEMBER = 'auth_remember_email';
  const BASE_URL = 'http://127.0.0.1:3000';

  function q(sel,root=document){ return root.querySelector(sel); }
  function qa(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }

  function toHex(buffer){
    const b = new Uint8Array(buffer); let s = '';
    for(let i=0;i<b.length;i++) s += b[i].toString(16).padStart(2,'0');
    return s;
  }
  async function sha256(str){
    if(window.crypto && window.crypto.subtle){
      const enc = new TextEncoder();
      const digest = await crypto.subtle.digest('SHA-256', enc.encode(str));
      return toHex(digest);
    }
    // Fallback (weak) if subtle not available
    return btoa(unescape(encodeURIComponent(str)));
  }

  function loadUsers(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_USERS) || '{}'); }catch(_){ return {}; }
  }
  function saveUsers(users){
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }
  function getCurrent(){
    try{
      // Prefer Firebase-authenticated session if present
      const firebaseUserStr = localStorage.getItem('auth_user_firebase');
      if(firebaseUserStr){
        const firebaseUser = JSON.parse(firebaseUserStr);
        const derivedName = (firebaseUser.displayName && firebaseUser.displayName.trim()) || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
        return { email: firebaseUser.email, name: derivedName, uid: firebaseUser.uid, source: 'firebase' };
      }

      const token = localStorage.getItem(STORAGE_TOKEN);
      const u = localStorage.getItem(STORAGE_USEROBJ);
      if(token && u){ return JSON.parse(u); }
      const email = localStorage.getItem(STORAGE_CURRENT);
    const defaultLoginLink = document.querySelector('nav a[href="login.html"]');
      const users = loadUsers();
    if(!user){
      if(defaultLoginLink){ defaultLoginLink.style.display = ''; }
    }catch(_){ return null; }
  }
  function setCurrent(email){ localStorage.setItem(STORAGE_CURRENT, email); }
  function clearCurrent(){ localStorage.removeItem(STORAGE_CURRENT); }

  async function register({name,email,password}){
      if(defaultLoginLink){ defaultLoginLink.style.display = 'none'; }
    email = (email||'').trim().toLowerCase();
    if(!name || name.trim().length < 2) throw new Error('Please enter your name');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That doesn’t look like a valid email');
      chip.className = 'btn auth-chip';
      chip.style.background = 'linear-gradient(180deg,#ff6b00,#ff8c00)';
      chip.style.color = '#fff';
      chip.style.boxShadow = '0 12px 32px rgba(255,107,0,0.25)';
      chip.style.border = 'none';
    // Try server-backed register
      chip.innerHTML = `<span class="avatar">👤</span><span>User Details</span>`;
      const res = await fetch(`${BASE_URL}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name:name.trim(), email, password }) });
      if(res.ok){
        const j = await res.json();
        localStorage.setItem(STORAGE_TOKEN, j.token);
        localStorage.setItem(STORAGE_USEROBJ, JSON.stringify(j.user));
        setCurrent(email);
        return { email: j.user.email, name: j.user.name };
      }
    }catch(_){ /* fall back */ }
    const users = loadUsers();
    if(users[email]) throw new Error('That email is already in use. Try logging in instead.');
    const passHash = await sha256(password);
    users[email] = { email, name: name.trim(), passHash, createdAt: Date.now() };
    saveUsers(users);
    setCurrent(email);
    return users[email];
  }

  async function login({email,password}){
    email = (email||'').trim().toLowerCase();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That doesn’t look like a valid email');
    // Try server-backed login
    try{
      const res = await fetch(`${BASE_URL}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
      if(res.ok){
        const j = await res.json();
        localStorage.setItem(STORAGE_TOKEN, j.token);
        localStorage.setItem(STORAGE_USEROBJ, JSON.stringify(j.user));
        setCurrent(email);
        return { email: j.user.email, name: j.user.name };
      }
    }catch(_){ /* fall back */ }
    const users = loadUsers();
    const user = users[email];
    if(!user) throw new Error('We couldn’t find an account with that email. Try creating one.');
    const passHash = await sha256(password||'');
    if(passHash !== user.passHash) throw new Error('Password is incorrect. Try again.');
    setCurrent(email);
    return user;
  }

  function logout(){
    // Clear both backend/local and firebase-based sessions
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USEROBJ);
    localStorage.removeItem('auth_user_firebase');
    localStorage.removeItem('auth_token_firebase');
    localStorage.removeItem('auth_method');
    localStorage.removeItem('auth_google_info');
    try{ if(window.auth && typeof window.auth.signOut === 'function'){ window.auth.signOut(); } }catch(_){ /* ignore */ }
    clearCurrent();
    renderAuthEntry();
  }

  function openAuthModal(mode='login', message){
    ensureModal();
    const overlay = q('#authOverlay');
    const tabLogin = q('#authTabLogin');
    const tabRegister = q('#authTabRegister');
    const nameRow = q('#authNameRow');
    const rememberRow = q('#authRememberRow');
    const rememberChk = q('#authRemember');
    const emailInput = q('#authEmail');
    const err = q('#authError');
    const ok = q('#authOk');
    const rememberedEmail = localStorage.getItem(STORAGE_REMEMBER) || '';
    err.classList.add('auth-hidden'); ok.classList.add('auth-hidden');
    if(message){ ok.textContent = message; ok.classList.remove('auth-hidden'); }

    if(mode==='register'){
      tabRegister.classList.add('active'); tabLogin.classList.remove('active'); nameRow.classList.remove('auth-hidden'); rememberRow.classList.add('auth-hidden'); rememberChk.checked = false;
    } else {
      tabLogin.classList.add('active'); tabRegister.classList.remove('active'); nameRow.classList.add('auth-hidden'); rememberRow.classList.remove('auth-hidden');
      if(rememberedEmail){ emailInput.value = rememberedEmail; rememberChk.checked = true; }
    }

    overlay.style.display = 'flex';
    setTimeout(()=> q('#authEmail').focus(), 0);
  }}
  function closeAuthModal(){ const overlay = q('#authOverlay'); if(overlay) overlay.style.display = 'none'; }

  function ensureModal(){
    if(q('#authOverlay')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
    <div id="authOverlay">
      <div id="authModal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <header>
          <h3 id="authTitle">Login to CredHive X</h3>
          <button class="close" id="authClose" aria-label="Close">×</button>
        </header>
        <div class="content">
          <div id="authOk" class="auth-success auth-hidden"></div>
          <div id="authError" class="auth-error auth-hidden"></div>
          <div class="auth-tabs">
            <button id="authTabLogin" class="active" type="button">Login</button>
            <button id="authTabRegister" type="button">Sign Up</button>
          </div>
          <div class="auth-field auth-hidden" id="authNameRow">
            <label for="authName">Your Name</label>
            <input id="authName" type="text" placeholder="e.g., Ria" />
          </div>
          <div class="auth-field">
            <label for="authEmail">Email</label>
            <input id="authEmail" type="email" placeholder="you@example.com" />
          </div>
          <div class="auth-field">
            <label for="authPass">Password</label>
            <div class="auth-pass-wrapper">
              <input id="authPass" type="password" placeholder="••••••••" />
              <button type="button" class="auth-pass-toggle" id="authPassToggle" aria-label="Toggle password visibility">👁️</button>
            </div>
          </div>
          <div class="auth-field" id="authRememberRow">
            <label></label>
            <label class="auth-remember-label"><input type="checkbox" id="authRemember" /> Remember me</label>
          </div>
          <div class="auth-actions">
            <button class="auth-link" id="authSwitch"></button>
            <div style="flex:1"></div>
            <button class="auth-primary" id="authSubmit">Continue</button>
          </div>
          <div class="auth-note" style="margin-top:8px">By continuing, you agree to our <a href="terms.html#privacy">Privacy Policy</a>.</div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);

    // events
    q('#authClose').addEventListener('click', closeAuthModal);
    q('#authOverlay').addEventListener('click', (e)=>{ if(e.target.id==='authOverlay') closeAuthModal(); });

    const tabLogin = q('#authTabLogin');
    const tabRegister = q('#authTabRegister');
    const nameRow = q('#authNameRow');
    const switchBtn = q('#authSwitch');
    const submitBtn = q('#authSubmit');
    const passToggle = q('#authPassToggle');
    const passInput = q('#authPass');
    const emailInput = q('#authEmail');
    const rememberRow = q('#authRememberRow');
    const rememberChk = q('#authRemember');
    let rememberedEmail = localStorage.getItem(STORAGE_REMEMBER) || '';

    if(rememberedEmail){
      emailInput.value = rememberedEmail;
      rememberChk.checked = true;
    }

    // Password toggle
    passToggle.addEventListener('click', ()=>{
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      passToggle.textContent = isPassword ? '👁️‍🗨️' : '👁️';
      passToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });

    function setMode(mode){
      if(mode==='login'){
        tabLogin.classList.add('active'); tabRegister.classList.remove('active'); nameRow.classList.add('auth-hidden'); switchBtn.textContent = 'Don’t have an account? Sign Up'; switchBtn.dataset.mode = 'register'; q('#authTitle').textContent = 'Welcome Back';
        rememberRow.classList.remove('auth-hidden');
        if(rememberedEmail){ emailInput.value = rememberedEmail; rememberChk.checked = true; }
      } else {
        tabRegister.classList.add('active'); tabLogin.classList.remove('active'); nameRow.classList.remove('auth-hidden'); switchBtn.textContent = 'Already have an account? Login'; switchBtn.dataset.mode = 'login'; q('#authTitle').textContent = 'Join CredHive X';
        rememberRow.classList.add('auth-hidden');
      }
      q('#authError').classList.add('auth-hidden');
      q('#authOk').classList.add('auth-hidden');
    }
    setMode('login');

    tabLogin.addEventListener('click', ()=> setMode('login'));
    tabRegister.addEventListener('click', ()=> setMode('register'));
    switchBtn.addEventListener('click', ()=> setMode(switchBtn.dataset.mode||'login'));

    submitBtn.addEventListener('click', async ()=>{
      const mode = tabRegister.classList.contains('active') ? 'register' : 'login';
      const email = q('#authEmail').value.trim();
      const password = q('#authPass').value;
      const name = q('#authName').value.trim();
      const err = q('#authError'); err.classList.add('auth-hidden'); err.textContent='';
      try{
        if(mode==='register') await register({name,email,password});
        else await login({email,password});
        if(mode==='login'){
          if(rememberChk.checked){ localStorage.setItem(STORAGE_REMEMBER, email); rememberedEmail = email; }
          else { localStorage.removeItem(STORAGE_REMEMBER); rememberedEmail = ''; }
        }
        renderAuthEntry();
        closeAuthModal();
        const redirect = localStorage.getItem(STORAGE_REDIRECT);
        if(redirect){ localStorage.removeItem(STORAGE_REDIRECT); window.location.href = redirect; }
      }catch(e){ err.textContent = e.message || 'Authentication error'; err.classList.remove('auth-hidden'); }
    });
  }

  function renderAuthEntry(){
    let nav = document.querySelector('header nav');
    let host;
    if(nav){
      let slot = q('#authEntrySlot', nav);
      if(!slot){ slot = document.createElement('span'); slot.id = 'authEntrySlot'; nav.appendChild(slot); }
      host = slot;
    } else {
      let fab = q('#authFab');
      if(!fab){ fab = document.createElement('div'); fab.id = 'authFab'; fab.className = 'auth-fab'; document.body.appendChild(fab); }
      host = fab;
    }

    host.innerHTML = '';
    const defaultLoginLink = document.querySelector('nav a[href="login.html"]');
    const user = getCurrent();
    
    console.log('renderAuthEntry called, user:', user);
    
    if(!user){
      if(defaultLoginLink){ 
        defaultLoginLink.style.display = ''; 
        console.log('Showing login link');
      }
      const btn = document.createElement('button');
      btn.className = 'btn auth-chip';
      btn.innerHTML = '<span class="avatar">🔐</span><span>Login</span>';
      btn.addEventListener('click', ()=> openAuthModal('login'));
      host.appendChild(btn);
    } else {
      if(defaultLoginLink){ 
        defaultLoginLink.style.display = 'none'; 
        console.log('Hiding login link, showing User Details');
      }
      const safeName = (user && user.name) ? user.name : (user && user.email ? user.email.split('@')[0] : 'User');
      const wrap = document.createElement('div');
      wrap.style.position = 'relative';
      const chip = document.createElement('button');
      chip.className = 'btn auth-chip';
      chip.style.background = 'linear-gradient(180deg,#ff6b00,#ff8c00)';
      chip.style.color = '#fff';
      chip.style.boxShadow = '0 12px 32px rgba(255,107,0,0.25)';
      chip.style.border = 'none';
      chip.innerHTML = `<span class="avatar">👤</span><span>User Details</span>`;
      wrap.appendChild(chip);
      const menu = document.createElement('div');
      menu.className = 'auth-menu auth-hidden';
      menu.innerHTML = `
        <button id="authMyAccount">My Account</button>
        <button id="authLogout">Logout</button>
      `;
      wrap.appendChild(menu);
      chip.addEventListener('click', ()=> menu.classList.toggle('auth-hidden'));
      document.addEventListener('click', (e)=>{ if(!wrap.contains(e.target)) menu.classList.add('auth-hidden'); });
      menu.querySelector('#authLogout').addEventListener('click', ()=>{ logout(); });
      menu.querySelector('#authMyAccount').addEventListener('click', ()=>{
        const msg = `Name: ${safeName}\nEmail: ${user.email || 'No email'}\nID: ${user.uid || user.email || 'N/A'}`;
        alert(msg);
        menu.classList.add('auth-hidden');
      });
      host.appendChild(wrap);
    }
  }

  function gatePlannerLinks(){
    const ensureAuth = (e)=>{
      const user = getCurrent();
      // If admin is logged in, allow access without user account
      const adminToken = localStorage.getItem('admin_token');
      if(user || adminToken) return; // allowed
      e.preventDefault();
      const target = e.currentTarget.getAttribute('href') || e.currentTarget.dataset.href || 'main-interface.html';
      localStorage.setItem(STORAGE_REDIRECT, target);
      openAuthModal('login', 'Please log in to continue');
    };
    qa('a[href$="main-interface.html"],a[href*="main-interface.html#"],button[data-href="main-interface.html"]').forEach(el=>{
      el.addEventListener('click', ensureAuth);
    });
  }

  function checkAdminAccess(){
    // Show admin link by default
    const adminLink = document.getElementById('adminLink');
    if(adminLink){
      adminLink.style.display = 'inline';
    }
  }

  function main(){
    // inject CSS if not linked
    if(!document.querySelector('link[href$="auth.css"]')){
      const l = document.createElement('link'); l.rel='stylesheet'; l.href='auth.css'; document.head.appendChild(l);
    }
    ensureModal();
    
    // Initial render
    renderAuthEntry();
    
    // Sync with external auth state (firebase/auth-firebase.js)
    window.addEventListener('authStateChanged', ()=> {
      console.log('Auth state changed, re-rendering...');
      renderAuthEntry();
    });
    
    // Poll for auth state changes (fallback if events don't fire)
    setInterval(()=> {
      const currentDisplay = document.querySelector('nav a[href="login.html"]')?.style.display;
      const user = getCurrent();
      if(user && currentDisplay !== 'none'){
        console.log('Detected logged-in user, updating UI...');
        renderAuthEntry();
      } else if(!user && currentDisplay === 'none'){
        console.log('Detected logged-out user, updating UI...');
        renderAuthEntry();
      }
    }, 500);
    
    gatePlannerLinks();
    checkAdminAccess();

    // Optional: show banner on planner if not logged in
    if(location.pathname.endsWith('main-interface.html')){
      const adminToken = localStorage.getItem('admin_token');
      if(!getCurrent() && !adminToken){
        const c = document.querySelector('.container');
        if(c){
          const note = document.createElement('div');
          note.className = 'warn';
          note.style.margin = '8px 0 12px';
          note.innerHTML = 'Log in to save your setup and documents. <button id="authBannerBtn" style="margin-left:8px" class="primary">Login / Sign Up</button>';
          const header = document.querySelector('header');
          const card = document.createElement('div'); card.className = 'card'; card.appendChild(note);
          c.insertBefore(card, c.children[1] || null);
          document.getElementById('authBannerBtn').addEventListener('click', ()=> openAuthModal('login'));
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', main);
  window.Auth = { open: openAuthModal, logout, current: getCurrent, login, register };
})();
