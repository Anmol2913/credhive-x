/**
 * Section Visibility Manager
 * Handles toggling between login/signup forms and dashboard
 * Zero CSS interference - only manipulates display property
 */

(function() {
  // Initialize on page load
  window.addEventListener('load', initLoginPersistence);

  /**
   * Runs on page load - checks localStorage for login state
   * If user is logged in, hide auth-section and show dashboard-section
   */
  function initLoginPersistence() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
      hideAuthSection();
      showDashboardSection();
    } else {
      showAuthSection();
      hideDashboardSection();
    }
  }

  /**
   * Call this on your login button's onclick event
   * Saves login state and toggles section visibility
   * Example: <button onclick="handleLogin()">Login</button>
   */
  function handleLogin() {
    // Save login state to localStorage
    localStorage.setItem('isLoggedIn', 'true');
    
    // Toggle section visibility
    hideAuthSection();
    showDashboardSection();
  }

  /**
   * Call this on your logout button's onclick event
   * Clears login state and shows login form again
   * Example: <button onclick="handleLogout()">Logout</button>
   */
  function handleLogout() {
    // Clear login state from localStorage
    localStorage.removeItem('isLoggedIn');
    
    // Toggle section visibility
    showAuthSection();
    hideDashboardSection();
  }

  // Helper functions (keep these private)
  function hideAuthSection() {
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.style.display = 'none';
    }
  }

  function showAuthSection() {
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.style.display = '';
    }
  }

  function hideDashboardSection() {
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
      dashboardSection.style.display = 'none';
    }
  }

  function showDashboardSection() {
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
      dashboardSection.style.display = '';
    }
  }

  // Expose the public functions globally
  window.handleLogin = handleLogin;
  window.handleLogout = handleLogout;
})();
