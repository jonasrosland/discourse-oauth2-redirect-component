// OAuth2 Redirect Handler Theme Component
// This component handles redirects after OAuth2 registration for Auth0 integration

(function() {
  'use strict';

  // Get allowed domains from theme settings
  function getAllowedDomains() {
    if (typeof settings !== 'undefined' && settings.whitelisted_domains) {
      return settings.whitelisted_domains;
    }
    // Fallback to default domains
    return [
      'thecosmoslabs.cloudflareaccess.com',
      'vastdata.thecosmoslabs.com'
    ];
  }

  // Get redirect delay from settings
  function getRedirectDelay() {
    if (typeof settings !== 'undefined' && settings.redirect_delay) {
      return settings.redirect_delay;
    }
    return 1000; // Default delay
  }

  // Check if debug mode is enabled
  function isDebugEnabled() {
    if (typeof settings !== 'undefined' && settings.debug_mode) {
      return settings.debug_mode;
    }
    return false; // Default to disabled
  }

  // Debug logging function
  function debugLog(message) {
    if (isDebugEnabled()) {
      console.log('OAuth2 Redirect:', message);
    }
  }

  // Check if a URL is from an allowed domain
  function isValidRedirectUrl(url) {
    try {
      const uri = new URL(url);
      const allowedDomains = getAllowedDomains();
      return allowedDomains.includes(uri.hostname) && uri.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  // Extract redirect URL from various possible sources
  function getRedirectUrl() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParams = ['origin', 'oauth2_redirect', 'return_to'];
    
    for (const param of redirectParams) {
      const value = urlParams.get(param);
      if (value && isValidRedirectUrl(decodeURIComponent(value))) {
        return decodeURIComponent(value);
      }
    }

    // Check localStorage for stored redirect URL
    const storedRedirect = localStorage.getItem('oauth2_redirect_url');
    if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
      return storedRedirect;
    }

    // Check referrer if it's from an allowed domain
    if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const allowedDomains = getAllowedDomains();
        if (allowedDomains.includes(referrerUrl.hostname)) {
          return document.referrer;
        }
      } catch (e) {
        // Invalid referrer URL, ignore
      }
    }

    return null;
  }

  // Store redirect URL for later use
  function storeRedirectUrl(url) {
    if (url && isValidRedirectUrl(url)) {
      localStorage.setItem('oauth2_redirect_url', url);
      debugLog('Stored redirect URL: ' + url);
    }
  }

  // Clear stored redirect URL
  function clearRedirectUrl() {
    localStorage.removeItem('oauth2_redirect_url');
  }

  // Show a message to the user
  function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `oauth2-redirect-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'info' ? '#d1ecf1' : '#d4edda'};
      border: 1px solid ${type === 'info' ? '#bee5eb' : '#c3e6cb'};
      border-radius: 4px;
      padding: 10px 15px;
      z-index: 9999;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // Perform the redirect
  function performRedirect(url) {
    debugLog('Redirecting to: ' + url);
    showMessage('Redirecting to original site...', 'info');
    
    // Clear the stored redirect URL
    clearRedirectUrl();
    
    // Redirect after the configured delay
    setTimeout(() => {
      window.location.href = url;
    }, getRedirectDelay());
  }

  // Main initialization function
  function initializeOAuth2Redirect() {
    debugLog('Initializing...');

    // Check if we're on a page that might have redirect parameters
    const redirectUrl = getRedirectUrl();
    
    if (redirectUrl) {
      debugLog('Found redirect URL: ' + redirectUrl);
      storeRedirectUrl(redirectUrl);
    }

    // Check if user is logged in and has a pending redirect
    if (window.currentUser && window.currentUser.id) {
      const storedRedirect = localStorage.getItem('oauth2_redirect_url');
      
      if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
        debugLog('User logged in, processing redirect');
        performRedirect(storedRedirect);
        return;
      }
    }

    // Listen for login events
    document.addEventListener('DOMContentLoaded', function() {
      // Check for login success indicators
      const loginSuccess = document.querySelector('.login-success') || 
                          document.querySelector('[data-login-success]') ||
                          window.location.search.includes('login_success');
      
      if (loginSuccess) {
        const storedRedirect = localStorage.getItem('oauth2_redirect_url');
        if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
          debugLog('Login detected, processing redirect');
          performRedirect(storedRedirect);
        }
      }
    });

    // Listen for page changes (for SPA navigation)
    let currentUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        
        // Check if we're on a page that indicates successful login/registration
        if (currentUrl.includes('/u/') || currentUrl.includes('/users/')) {
          const storedRedirect = localStorage.getItem('oauth2_redirect_url');
          if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
            debugLog('Page change detected, processing redirect');
            performRedirect(storedRedirect);
          }
        }
      }
    }, 1000);
  }

  // Initialize when the script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOAuth2Redirect);
  } else {
    initializeOAuth2Redirect();
  }

  // Also initialize on window load to catch any late changes
  window.addEventListener('load', initializeOAuth2Redirect);

})(); 