import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "oauth2-redirect-handler",

  initialize() {
    console.log("OAuth2 Redirect Handler JS loaded!");
    // OAuth2 Redirect Handler Theme Component
    // This component serves as a backup redirect mechanism for Auth0 integration
    // The primary redirect logic is now handled by the Auth0 Action using redirect_uri encoding

    'use strict';

    withPluginApi("0.8.7", api => {
      // Get allowed domains from theme settings
      function getAllowedDomains() {
        if (typeof settings !== 'undefined' && settings.whitelisted_domains) {
          return settings.whitelisted_domains;
        }
        // Fallback to default domains
        return [
          'thecosmoslabs.cloudflareaccess.com',
          'vastdata.thecosmoslabs.com',
          'vastdatacustomers.mindtickle.com',
          'vastdata.mindtickle.com',
          'mindtickle.com'
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

      // Extract redirect information from encoded redirect parameter
      function extractRedirectInfo() {
        debugLog('Checking for encoded redirect information...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const encodedRedirect = urlParams.get('encoded_redirect');
        
        if (encodedRedirect) {
          try {
            const decodedInfo = JSON.parse(atob(encodedRedirect));
            debugLog('Found encoded redirect info: ' + JSON.stringify(decodedInfo));
            
            if (decodedInfo.original_redirect_url && isValidRedirectUrl(decodedInfo.original_redirect_url)) {
              return decodedInfo;
            }
          } catch (e) {
            debugLog('Error decoding redirect info: ' + e.message);
          }
        }
        
        return null;
      }

      // Extract redirect URL from various possible sources (fallback)
      function getRedirectUrl() {
        debugLog('Checking for redirect URL from various sources...');
        
        // Check if we're in an Auth0 flow with user metadata (primary method)
        // This would be set by the Auth0 Action and available in the user object
        if (window.currentUser && window.currentUser.user_metadata && window.currentUser.user_metadata.original_redirect_url) {
          const auth0RedirectUrl = window.currentUser.user_metadata.original_redirect_url;
          debugLog('Found redirect URL in Auth0 user metadata: ' + auth0RedirectUrl);
          if (isValidRedirectUrl(auth0RedirectUrl)) {
            return auth0RedirectUrl;
          }
        }
        
        // Check URL parameters (fallback method)
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParams = ['origin', 'oauth2_redirect', 'return_to', 'saml_redirect', 'original_url'];
        
        for (const param of redirectParams) {
          const value = urlParams.get(param);
          if (value) {
            try {
              const decodedValue = decodeURIComponent(value);
              debugLog(`Found URL parameter ${param}: ${decodedValue}`);
              if (isValidRedirectUrl(decodedValue)) {
                return decodedValue;
              }
            } catch (e) {
              debugLog(`Error decoding parameter ${param}: ${e.message}`);
            }
          }
        }

        // Check localStorage for stored redirect URL
        const storedRedirect = localStorage.getItem('oauth2_redirect_url');
        if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
          debugLog('Found stored redirect URL: ' + storedRedirect);
          return storedRedirect;
        }

        debugLog('No valid redirect URL found');
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
        debugLog('Cleared stored redirect URL');
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

      // Perform the redirect back to Auth0
      function performRedirectToAuth0(redirectInfo) {
        debugLog('Theme component redirecting back to Auth0 with info: ' + JSON.stringify(redirectInfo));
        showMessage('Registration complete, redirecting to original site...', 'info');
        
        // Clear the stored redirect URL
        clearRedirectUrl();
        
        // Create the Auth0 callback URL with the encoded redirect information
        const baseRedirectUri = window.location.origin + '/auth/oauth2_basic/callback';
        const encodedInfo = btoa(JSON.stringify(redirectInfo));
        
        try {
          const auth0CallbackUrl = new URL(baseRedirectUri);
          auth0CallbackUrl.searchParams.set('encoded_redirect', encodedInfo);
          
          debugLog('Redirecting to Auth0 callback: ' + auth0CallbackUrl.toString());
          
          // Redirect after the configured delay
          setTimeout(() => {
            window.location.href = auth0CallbackUrl.toString();
          }, getRedirectDelay());
        } catch (e) {
          debugLog('Error creating Auth0 callback URL: ' + e.message);
          // Fallback to simple redirect
          setTimeout(() => {
            window.location.href = baseRedirectUri + '?encoded_redirect=' + encodeURIComponent(encodedInfo);
          }, getRedirectDelay());
        }
      }

      // Check if user has completed registration
      function checkUserRegistrationStatus() {
        // Check if user is logged in and has a profile
        if (window.currentUser && window.currentUser.id) {
          debugLog('User is logged in, checking registration status');
          
          // Check if user has a username (indicates completed registration)
          if (window.currentUser.username) {
            debugLog('User has username, registration appears complete');
            return true;
          } else {
            debugLog('User logged in but no username - registration may be incomplete');
            return false;
          }
        } else {
          debugLog('No current user found');
        }
        return false;
      }

      // Handle redirect logic for new redirect URI approach
      function handleRedirectIfLoggedIn() {
        debugLog('Theme component checking for redirect...');
        debugLog('Current user:', window.currentUser ? 'Logged in' : 'Not logged in');
        debugLog('Current URL:', window.location.href);
        
        // Check if Auth0 Action has already handled this (user metadata approach)
        if (window.currentUser && window.currentUser.user_metadata && window.currentUser.user_metadata.original_redirect_url) {
          debugLog('Auth0 Action has stored redirect URL in user metadata - letting Action handle redirect');
          return false; // Let the Action handle the redirect
        }
        
        // Check if user is logged in and has completed registration
        if (!checkUserRegistrationStatus()) {
          debugLog('User not fully registered yet, waiting for Action to handle...');
          return false;
        }
        
        // Check for encoded redirect information (new approach)
        const redirectInfo = extractRedirectInfo();
        if (redirectInfo) {
          debugLog('Found encoded redirect info, redirecting back to Auth0');
          performRedirectToAuth0(redirectInfo);
          return true;
        }
        
        // Look for stored redirect URL as backup (old approach)
        const storedRedirect = localStorage.getItem('oauth2_redirect_url');
        if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
          debugLog('Found stored redirect URL, performing backup redirect');
          showMessage('Redirecting to original site...', 'info');
          setTimeout(() => {
            window.location.href = storedRedirect;
          }, getRedirectDelay());
          return true;
        }
        
        debugLog('No redirect needed or handled by Action');
        return false;
      }

      // Initial setup - check for redirect parameters and store them
      function initializeRedirectStorage() {
        debugLog('Initializing redirect storage...');
        
        // Check if we're on a page that might have redirect parameters
        const redirectUrl = getRedirectUrl();
        
        if (redirectUrl) {
          debugLog('Found redirect URL: ' + redirectUrl);
          storeRedirectUrl(redirectUrl);
        }
        
        // Also check for encoded redirect info
        const redirectInfo = extractRedirectInfo();
        if (redirectInfo) {
          debugLog('Found encoded redirect info on page load: ' + JSON.stringify(redirectInfo));
          // Store the original redirect URL for backup
          if (redirectInfo.original_redirect_url) {
            storeRedirectUrl(redirectInfo.original_redirect_url);
          }
        }
      }

      // Run initial setup
      initializeRedirectStorage();

      // Use api.onPageChange to handle redirects when user is logged in
      api.onPageChange(() => {
        debugLog('Page changed, checking for redirect...');
        handleRedirectIfLoggedIn();
      });

      // Also check on initial load
      handleRedirectIfLoggedIn();

      // Simple periodic check for user login (reduced frequency)
      let checkCount = 0;
      const maxChecks = 10; // Reduced from 30 to 10
      const checkInterval = setInterval(() => {
        checkCount++;
        debugLog(`Periodic check ${checkCount}/${maxChecks} for user login...`);
        
        if (handleRedirectIfLoggedIn()) {
          clearInterval(checkInterval);
          debugLog('Redirect completed, stopping periodic checks');
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          debugLog('Max checks reached, stopping periodic checks');
        }
      }, 2000); // Increased interval from 1s to 2s

      // Clear interval after 2 minutes to prevent memory leaks
      setTimeout(() => {
        clearInterval(checkInterval);
        debugLog('Periodic check interval cleared');
      }, 120000);
    });
  }
}; 