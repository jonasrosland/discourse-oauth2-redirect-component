import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "community-signup-redirect-handler",

  initialize() {
    console.log("Community Signup Redirect Handler JS loaded!");
    // Community Signup Redirect Handler Theme Component
    // This component handles redirects after users complete community account registration
    // Works with the Auth0 Action that redirects users to direct signup flow

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

      // Check if user is currently on a registration/signup page
      function isOnRegistrationPage() {
        const pathname = window.location.pathname;
        const hasSignupForm = document.querySelector('.signup-form, .registration-form, .create-account-form');
        const hasSignupButton = document.querySelector('button[title="Create Account"], .btn-signup, .btn-register');
        
        return pathname.includes('/signup') || 
               pathname.includes('/register') || 
               pathname.includes('/create-account') ||
               hasSignupForm ||
               hasSignupButton;
      }

      // Check if user has completed registration (has username and is not on signup page)
      function hasCompletedRegistration(currentUser) {
        if (!currentUser) return false;
        
        // User must have a username
        if (!currentUser.username) {
          console.log('OAuth2 Redirect Handler: User has no username - registration incomplete');
          return false;
        }
        
        // User must not be on a registration page
        if (isOnRegistrationPage()) {
          console.log('OAuth2 Redirect Handler: User is on registration page - waiting for completion');
          return false;
        }
        
        // Check if user has been active for at least 15 minutes (much longer to ensure registration completion)
        const userCreatedTime = new Date(currentUser.created_at).getTime();
        const currentTime = new Date().getTime();
        const timeSinceCreation = currentTime - userCreatedTime;
        
        if (timeSinceCreation < 900000) { // 15 minutes
          console.log(`Community Signup Redirect Handler: User created recently (${timeSinceCreation}ms ago) - waiting for registration completion`);
          return false;
        }
        
        // Additional check: user should have some basic profile information
        if (!currentUser.name || currentUser.name.trim() === '') {
          console.log('OAuth2 Redirect Handler: User has no name - registration may be incomplete');
          return false;
        }
        
        // Additional check: user should not be on any signup/registration related pages
        const currentPath = window.location.pathname;
        if (currentPath.includes('/signup') || currentPath.includes('/register') || currentPath.includes('/create-account')) {
          console.log('OAuth2 Redirect Handler: User is still on signup/registration page - waiting for completion');
          return false;
        }
        
        // Additional check: look for signup forms or registration elements
        const signupForms = document.querySelectorAll('.signup-form, .registration-form, .create-account-form, form[action*="signup"], form[action*="register"]');
        if (signupForms.length > 0) {
          console.log('OAuth2 Redirect Handler: Signup forms detected - waiting for completion');
          return false;
        }
        
        console.log(`OAuth2 Redirect Handler: User appears to have completed registration (username: ${currentUser.username}, name: ${currentUser.name}, created ${timeSinceCreation}ms ago)`);
        return true;
      }

      // Main redirect handler function
      function handleRedirect() {
        console.log('Community Signup Redirect Handler: Checking for redirect conditions...');
        
        // PRIORITY 0: Check if we're currently on a signup/registration page - NEVER redirect from these pages
        const currentPath = window.location.pathname;
        const currentUrl = window.location.href;
        
        if (currentPath.includes('/signup') || currentPath.includes('/register') || currentPath.includes('/create-account')) {
          console.log('Community Signup Redirect Handler: Currently on signup/registration page - NEVER redirect from here');
          console.log(`Current path: ${currentPath}`);
          console.log(`Current URL: ${currentUrl}`);
          return;
        }
        
        // Check for signup forms or registration elements
        const signupForms = document.querySelectorAll('.signup-form, .registration-form, .create-account-form, form[action*="signup"], form[action*="register"]');
        if (signupForms.length > 0) {
          console.log('Community Signup Redirect Handler: Signup forms detected - NEVER redirect while forms are present');
          console.log(`Found ${signupForms.length} signup forms`);
          return;
        }
        
        // Check if user is logged in
        const currentUser = api.getCurrentUser();
        if (!currentUser) {
          console.log('Community Signup Redirect Handler: No current user found, skipping redirect');
          return;
        }

        console.log(`Community Signup Redirect Handler: User logged in: ${currentUser.email}`);
        console.log(`Community Signup Redirect Handler: User created at: ${currentUser.created_at}`);
        console.log(`Community Signup Redirect Handler: Current URL: ${window.location.href}`);

        // PRIORITY 1: Check for return_url parameter (from direct signup flow)
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrlParam = urlParams.get('return_url');
        
        if (returnUrlParam && isAllowedDomain(returnUrlParam)) {
          console.log(`Community Signup Redirect Handler: Found return_url parameter: ${returnUrlParam}`);
          
          // Only redirect if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('Community Signup Redirect Handler: User has not completed registration yet, waiting...');
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('return_url');
          newUrl.searchParams.delete('oauth2_redirect');
          newUrl.searchParams.delete('origin');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Redirect to the original site
          console.log(`Community Signup Redirect Handler: Redirecting to original site: ${returnUrlParam}`);
          window.location.href = returnUrlParam;
          return;
        }

        // PRIORITY 2: Check for oauth2_redirect parameter (from direct signup flow)
        const oauth2RedirectParam = urlParams.get('oauth2_redirect');
        
        if (oauth2RedirectParam && isAllowedDomain(oauth2RedirectParam)) {
          console.log(`Community Signup Redirect Handler: Found oauth2_redirect parameter: ${oauth2RedirectParam}`);
          
          // Only redirect if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('Community Signup Redirect Handler: User has not completed registration yet, waiting...');
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('return_url');
          newUrl.searchParams.delete('oauth2_redirect');
          newUrl.searchParams.delete('origin');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Redirect to the original site
          console.log(`Community Signup Redirect Handler: Redirecting to original site: ${oauth2RedirectParam}`);
          window.location.href = oauth2RedirectParam;
          return;
        }

        // PRIORITY 3: Check for origin parameter (from direct signup flow)
        const originParam = urlParams.get('origin');
        
        if (originParam && isAllowedDomain(originParam)) {
          console.log(`Community Signup Redirect Handler: Found origin parameter: ${originParam}`);
          
          // Only redirect if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('Community Signup Redirect Handler: User has not completed registration yet, waiting...');
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('return_url');
          newUrl.searchParams.delete('oauth2_redirect');
          newUrl.searchParams.delete('origin');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Redirect to the original site
          console.log(`Community Signup Redirect Handler: Redirecting to original site: ${originParam}`);
          window.location.href = originParam;
          return;
        }

        // PRIORITY 4: Check for original_redirect URL parameter (legacy method from Action)
        const originalRedirectParam = urlParams.get('original_redirect');
        
        if (originalRedirectParam && isAllowedDomain(originalRedirectParam)) {
          console.log(`OAuth2 Redirect Handler: Found original_redirect parameter: ${originalRedirectParam}`);
          
          // Only redirect if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('OAuth2 Redirect Handler: User has not completed registration yet, waiting...');
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

        // PRIORITY 5: Check if we have a stored redirect URL in localStorage (fallback method)
        const storedRedirectUrl = localStorage.getItem('auth0_original_redirect_url');
        if (storedRedirectUrl && isAllowedDomain(storedRedirectUrl)) {
          console.log(`OAuth2 Redirect Handler: Found stored redirect URL: ${storedRedirectUrl}`);
          
          // Only redirect if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('OAuth2 Redirect Handler: User has not completed registration yet, waiting...');
            return;
          }
          
          // Clear the stored URL
          localStorage.removeItem('auth0_original_redirect_url');
          
          // Redirect to the original site
          console.log(`OAuth2 Redirect Handler: Redirecting to original site: ${storedRedirectUrl}`);
          window.location.href = storedRedirectUrl;
          return;
        }

        // PRIORITY 6: Fallback redirect for recently registered users
        // Only if user has completed registration and we have no other redirect info
        if (hasCompletedRegistration(currentUser)) {
          const userRegistrationTime = currentUser.created_at;
          const currentTime = new Date().getTime();
          const timeSinceRegistration = currentTime - new Date(userRegistrationTime).getTime();
          
          // If user was created in the last 10 minutes, they might have just completed registration
          if (timeSinceRegistration < 10 * 60 * 1000) {
            console.log('OAuth2 Redirect Handler: Recent registration detected, using fallback redirect');
            console.log(`OAuth2 Redirect Handler: Time since registration: ${timeSinceRegistration}ms`);
            
            // Check if we have any stored redirect information
            const fallbackRedirectUrl = 'https://vastdatacustomers.mindtickle.com';
            console.log(`OAuth2 Redirect Handler: Using fallback redirect URL: ${fallbackRedirectUrl}`);
            
            // Redirect to the fallback URL
            window.location.href = fallbackRedirectUrl;
            return;
          }
        }

        console.log('OAuth2 Redirect Handler: No redirect conditions met');
      }

      // Run redirect check with much longer delays to allow for registration completion
      api.onPageChange(() => {
        // Much longer delay to ensure user has time to complete registration
        setTimeout(handleRedirect, 180000); // 3 minutes
      });

      // Also run on initial load with much longer delay
      setTimeout(handleRedirect, 300000); // 5 minutes

      // Listen for user login events
      api.onAppEvent('user:logged-in', () => {
        console.log('Community Signup Redirect Handler: User logged in event detected');
        // Don't redirect immediately on login - wait for registration completion
        setTimeout(handleRedirect, 180000); // 3 minutes
      });

      // Listen for user registration events
      api.onAppEvent('user:registered', () => {
        console.log('Community Signup Redirect Handler: User registered event detected');
        // Wait longer after registration to ensure completion
        setTimeout(handleRedirect, 300000); // 5 minutes
      });

      // Store redirect URL when user is redirected to Discourse
      // This is a backup mechanism in case the Auth0 Action doesn't work
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      console.log(`Community Signup Redirect Handler: Initial page load - URL: ${currentUrl}`);
      console.log(`Community Signup Redirect Handler: URL parameters:`, Object.fromEntries(urlParams.entries()));
      
      // Check if this is a signup flow or OAuth callback with redirect information
      // Updated to prioritize return_url parameter (from direct signup) and original_redirect parameter (from Action)
      const originalUrl = urlParams.get('return_url') ||
                         urlParams.get('original_redirect') ||
                         urlParams.get('original_url') || 
                         urlParams.get('saml_redirect') || 
                         urlParams.get('return_to') ||
                         urlParams.get('returnTo');
      
      if (originalUrl && isAllowedDomain(originalUrl)) {
        console.log(`Community Signup Redirect Handler: Storing original redirect URL: ${originalUrl}`);
        localStorage.setItem('auth0_original_redirect_url', originalUrl);
      }

      console.log('Community Signup Redirect Handler: Initialization complete');
    });
  }
}; 