import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "oauth2-redirect-handler",

  initialize() {
    console.log("OAuth2 Redirect Handler JS loaded!");
    // OAuth2 Redirect Handler Theme Component
    // This component serves as a backup redirect mechanism for Auth0 integration
    // The primary redirect logic is now handled by the Auth0 Action using custom claims

    'use strict';

    withPluginApi("0.8.7", api => {
      // Get allowed domains from theme settings
      function getAllowedDomains() {
        if (typeof settings !== 'undefined' && settings.whitelisted_domains) {
          return settings.whitelisted_domains;
        }
        // Default allowed domains
        return [
          'vastdatacustomers.mindtickle.com',
          'mindtickle.com',
          'vastdata.com'
        ];
      }

      // Check if a URL is in the allowed domains list
      function isAllowedDomain(url) {
        try {
          const urlObj = new URL(url);
          const allowedDomains = getAllowedDomains();
          return allowedDomains.some(domain => urlObj.hostname.includes(domain));
        } catch (e) {
          console.log('Error parsing URL for domain check:', e);
          return false;
        }
      }

      // Main redirect handler function
      function handleRedirect() {
        console.log('OAuth2 Redirect Handler: Checking for redirect conditions...');
        
        // Check if user is logged in
        const currentUser = api.getCurrentUser();
        if (!currentUser) {
          console.log('OAuth2 Redirect Handler: No current user found, skipping redirect');
          return;
        }

        console.log(`OAuth2 Redirect Handler: User logged in: ${currentUser.email}`);
        console.log(`OAuth2 Redirect Handler: User created at: ${currentUser.created_at}`);
        console.log(`OAuth2 Redirect Handler: Current URL: ${window.location.href}`);

        // Check if user is on the signup page - if so, don't redirect yet
        const isOnSignupPage = window.location.pathname.includes('/signup') || 
                              window.location.pathname.includes('/register') ||
                              document.querySelector('.signup-form') ||
                              document.querySelector('.registration-form');
        
        if (isOnSignupPage) {
          console.log('OAuth2 Redirect Handler: User is on signup page, waiting for registration completion');
          return;
        }

        // Check if user has a username (indicates completed registration)
        if (currentUser.username) {
          console.log(`OAuth2 Redirect Handler: User has username: ${currentUser.username}, registration appears complete`);
        } else {
          console.log('OAuth2 Redirect Handler: User logged in but no username - registration may be incomplete');
          // Don't redirect if user doesn't have a username yet
          return;
        }

        // PRIORITY 1: Check for original_redirect URL parameter (primary method from Action)
        const urlParams = new URLSearchParams(window.location.search);
        const originalRedirectParam = urlParams.get('original_redirect');
        const redirectCount = parseInt(urlParams.get('redirect_count') || '0');
        
        if (originalRedirectParam && isAllowedDomain(originalRedirectParam)) {
          console.log(`OAuth2 Redirect Handler: Found original_redirect parameter: ${originalRedirectParam}`);
          console.log(`OAuth2 Redirect Handler: Redirect count: ${redirectCount}`);
          
          // Check if we're in a redirect loop
          if (redirectCount >= 3) {
            console.log(`OAuth2 Redirect Handler: Redirect loop detected (${redirectCount} attempts) - breaking loop`);
            console.log(`OAuth2 Redirect Handler: Redirecting to original site: ${originalRedirectParam}`);
            
            // Clear the parameters from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('original_redirect');
            newUrl.searchParams.delete('redirect_count');
            window.history.replaceState({}, '', newUrl.toString());
            
            // Redirect to the original site
            window.location.href = originalRedirectParam;
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('original_redirect');
          newUrl.searchParams.delete('redirect_count');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Redirect to the original site
          console.log(`OAuth2 Redirect Handler: Redirecting to original site: ${originalRedirectParam}`);
          window.location.href = originalRedirectParam;
          return;
        }

        // PRIORITY 2: Check if this is a registration completion scenario
        // Look for URL parameters that indicate we should redirect back to Auth0
        const shouldRedirectToAuth0 = urlParams.get('redirect_to_auth0') === 'true';
        const registrationComplete = urlParams.get('registration_complete') === 'true';
        
        if (shouldRedirectToAuth0 || registrationComplete) {
          console.log('OAuth2 Redirect Handler: Registration completion detected, redirecting to Auth0');
          
          // Redirect back to Auth0 to complete the flow
          const auth0RedirectUrl = 'https://vastdata.auth0.com/authorize?' +
            'client_id=2dtcwKoZnrnIbAdwnHxJJNcqLvAD3yK9&' +
            'redirect_uri=https://community.vastdata.com/auth/oauth2_basic/callback&' +
            'response_type=code&' +
            'scope=openid profile email';
          
          console.log(`OAuth2 Redirect Handler: Redirecting to Auth0: ${auth0RedirectUrl}`);
          window.location.href = auth0RedirectUrl;
          return;
        }

        // PRIORITY 3: Check if we have a stored redirect URL in localStorage (fallback method)
        const storedRedirectUrl = localStorage.getItem('auth0_original_redirect_url');
        if (storedRedirectUrl && isAllowedDomain(storedRedirectUrl)) {
          console.log(`OAuth2 Redirect Handler: Found stored redirect URL: ${storedRedirectUrl}`);
          
          // Clear the stored URL
          localStorage.removeItem('auth0_original_redirect_url');
          
          // Redirect to the original site
          console.log(`OAuth2 Redirect Handler: Redirecting to original site: ${storedRedirectUrl}`);
          window.location.href = storedRedirectUrl;
          return;
        }

        // PRIORITY 4: Check if user has completed registration and we should redirect
        // This is a fallback mechanism in case the Auth0 Action doesn't handle the redirect
        const userRegistrationTime = currentUser.created_at;
        const currentTime = new Date().getTime();
        const timeSinceRegistration = currentTime - new Date(userRegistrationTime).getTime();
        
        // If user was created in the last 5 minutes, they might have just completed registration
        if (timeSinceRegistration < 5 * 60 * 1000) {
          console.log('OAuth2 Redirect Handler: Recent registration detected, checking for redirect');
          console.log(`OAuth2 Redirect Handler: Time since registration: ${timeSinceRegistration}ms`);
          
          // Check if we have any stored redirect information
          const fallbackRedirectUrl = 'https://vastdatacustomers.mindtickle.com';
          console.log(`OAuth2 Redirect Handler: Using fallback redirect URL: ${fallbackRedirectUrl}`);
          
          // Redirect to the fallback URL
          window.location.href = fallbackRedirectUrl;
          return;
        }

        console.log('OAuth2 Redirect Handler: No redirect conditions met');
      }

      // Run redirect check when the page loads
      api.onPageChange(() => {
        // Small delay to ensure user data is loaded
        setTimeout(handleRedirect, 1000);
      });

      // Also run on initial load
      setTimeout(handleRedirect, 2000);

      // Listen for user login events
      api.onAppEvent('user:logged-in', () => {
        console.log('OAuth2 Redirect Handler: User logged in event detected');
        setTimeout(handleRedirect, 1000);
      });

      // Listen for user registration events
      api.onAppEvent('user:registered', () => {
        console.log('OAuth2 Redirect Handler: User registered event detected');
        setTimeout(handleRedirect, 1000);
      });

      // Store redirect URL when user is redirected to Discourse
      // This is a backup mechanism in case the Auth0 Action doesn't work
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check if this is an OAuth callback with redirect information
      // Updated to prioritize original_redirect parameter (used by the Action)
      const originalUrl = urlParams.get('original_redirect') ||
                         urlParams.get('original_url') || 
                         urlParams.get('saml_redirect') || 
                         urlParams.get('return_to') ||
                         urlParams.get('returnTo');
      
      const redirectCount = parseInt(urlParams.get('redirect_count') || '0');
      
      if (originalUrl && isAllowedDomain(originalUrl)) {
        console.log(`OAuth2 Redirect Handler: Storing original redirect URL: ${originalUrl}`);
        console.log(`OAuth2 Redirect Handler: Redirect count: ${redirectCount}`);
        localStorage.setItem('auth0_original_redirect_url', originalUrl);
        localStorage.setItem('auth0_redirect_count', redirectCount.toString());
      }

      console.log('OAuth2 Redirect Handler: Initialization complete');
    });
  }
}; 