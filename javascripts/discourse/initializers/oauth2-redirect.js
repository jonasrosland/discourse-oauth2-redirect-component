import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "oauth2-redirect-handler",

  initialize() {
    console.log("OAuth2 Redirect Handler JS loaded!");
    // OAuth2 Redirect Handler Theme Component
    // This component handles redirects after OAuth2 registration for Auth0 integration

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

      // Extract redirect URL from various possible sources
      function getRedirectUrl() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParams = ['origin', 'oauth2_redirect', 'return_to', 'saml_redirect'];
        
        for (const param of redirectParams) {
          const value = urlParams.get(param);
          if (value && isValidRedirectUrl(decodeURIComponent(value))) {
            return decodeURIComponent(value);
          }
        }

        // Handle OAuth2 state parameter - decode it to extract redirect URI
        const stateParam = urlParams.get('state');
        if (stateParam) {
          try {
            // The state parameter is base64 encoded and contains the redirect URI
            // Try to decode it and extract the redirect URI
            const decodedState = atob(stateParam);
            debugLog('Decoded state parameter: ' + decodedState);
            
            // Look for redirect URI patterns in the decoded state
            const redirectPatterns = [
              /loginredirecturi=([^&]+)/,
              /redirect_uri=([^&]+)/,
              /return_to=([^&]+)/,
              /origin=([^&]+)/
            ];
            
            for (const pattern of redirectPatterns) {
              const match = decodedState.match(pattern);
              if (match && match[1]) {
                const decodedRedirect = decodeURIComponent(match[1]);
                if (isValidRedirectUrl(decodedRedirect)) {
                  debugLog('Found redirect URI in state: ' + decodedRedirect);
                  return decodedRedirect;
                }
              }
            }
            
            // Look for URL patterns in the decoded state (for JWT-like tokens)
            const urlMatch = decodedState.match(/https?:\/\/[^\s"']+/);
            if (urlMatch && !urlMatch[0].includes('community.vastdata.com')) {
              const foundUrl = urlMatch[0];
              if (isValidRedirectUrl(foundUrl)) {
                debugLog('Found URL in decoded state: ' + foundUrl);
                return foundUrl;
              }
            }
            
            // If no pattern matches, check if the entire decoded state is a valid URL
            if (isValidRedirectUrl(decodedState)) {
              debugLog('Decoded state is valid redirect URL: ' + decodedState);
              return decodedState;
            }
          } catch (e) {
            debugLog('Failed to decode state parameter: ' + e.message);
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

      // Check if we're on a registration page
      function isOnRegistrationPage() {
        const currentUrl = window.location.href;
        const registrationIndicators = [
          '/signup',
          '/register',
          '/welcome',
          '/onboarding',
          '/complete',
          '?signup=1',
          '?registration=1'
        ];
        
        return registrationIndicators.some(indicator => currentUrl.includes(indicator));
      }

      // Check if user has completed registration
      function checkUserRegistrationStatus() {
        // Check if user is logged in and has a profile
        if (window.currentUser && window.currentUser.id) {
          debugLog('User is logged in, checking registration status');
          debugLog('User object: ' + JSON.stringify(window.currentUser, null, 2));
          
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

      // Handle redirect logic when user is logged in
      function handleRedirectIfLoggedIn() {
        debugLog('Checking for redirect - currentUser:', window.currentUser);
        debugLog('Current URL:', window.location.href);
        debugLog('Stored redirect URL:', localStorage.getItem('oauth2_redirect_url'));
        
        const storedRedirect = localStorage.getItem('oauth2_redirect_url');
        
        if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
          // Check if we're on a registration page - if so, wait
          if (isOnRegistrationPage()) {
            debugLog('On registration page, waiting for completion');
            return false;
          }
          
          if (checkUserRegistrationStatus()) {
            debugLog('User registration complete, processing redirect');
            performRedirect(storedRedirect);
            return true;
          } else {
            debugLog('User not fully registered yet, waiting...');
            return false;
          }
        }
        
        // Additional checks for login completion
        const loginIndicators = [
          document.querySelector('.current-user'),
          document.querySelector('[data-current-user]'),
          document.querySelector('.user-menu'),
          document.querySelector('.header-dropdown-toggle'),
          window.location.pathname.includes('/u/'),
          window.location.pathname.includes('/users/')
        ];
        
        const hasLoginIndicator = loginIndicators.some(indicator => indicator !== null);
        debugLog('Login indicators found:', hasLoginIndicator);
        
        if (hasLoginIndicator) {
          if (storedRedirect && isValidRedirectUrl(storedRedirect)) {
            debugLog('Login indicator detected, processing redirect');
            performRedirect(storedRedirect);
            return true;
          }
        }
        
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

      // Periodic check for user login (in case user object becomes available later)
      let checkCount = 0;
      const maxChecks = 30; // Check for up to 30 seconds
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
      }, 1000);

      // Additional check for user profile completion
      // This handles cases where the user completes registration but doesn't navigate
      let profileCheckInterval = setInterval(() => {
        if (checkUserRegistrationStatus()) {
          debugLog('Profile check: User registration appears complete');
          if (handleRedirectIfLoggedIn()) {
            clearInterval(profileCheckInterval);
          }
        }
      }, 3000); // Check every 3 seconds

      // Clear interval after 5 minutes to prevent memory leaks
      setTimeout(() => {
        clearInterval(profileCheckInterval);
        debugLog('Profile check interval cleared');
      }, 300000);
    });
  }
}; 