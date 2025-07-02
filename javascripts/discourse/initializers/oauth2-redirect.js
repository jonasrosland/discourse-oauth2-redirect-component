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
        try {
          if (typeof settings !== 'undefined' && settings.whitelisted_domains && Array.isArray(settings.whitelisted_domains)) {
          return settings.whitelisted_domains;
          }
        } catch (e) {
          console.log('Error accessing settings.whitelisted_domains:', e);
        }
        
        // Default allowed domains - updated to include Auth0 SAML callback URL
        return [
          'vastdatacustomers.mindtickle.com',
          'mindtickle.com',
          'vastdata.com',
          'thecosmosai-community.us.auth0.com' // Auth0 SAML callback domain
        ];
      }

      // Check if a URL is in the allowed domains list
      function isAllowedDomain(url) {
        try {
          if (!url || typeof url !== 'string') {
            console.log('Invalid URL provided to isAllowedDomain:', url);
            return false;
          }
          
          const urlObj = new URL(url);
          const allowedDomains = getAllowedDomains();
          
          if (!Array.isArray(allowedDomains)) {
            console.log('Allowed domains is not an array:', allowedDomains);
            return false;
          }
          
          return allowedDomains.some(domain => {
            if (typeof domain !== 'string') {
              console.log('Invalid domain in allowedDomains:', domain);
              return false;
            }
            return urlObj.hostname.includes(domain);
          });
        } catch (e) {
          console.log('Error parsing URL for domain check:', e);
          return false;
        }
      }

      // Get destination site name from URL
      function getDestinationSiteName(url) {
        try {
          const urlObj = new URL(url);
          if (urlObj.hostname.includes('mindtickle.com')) {
            return 'Mindtickle';
          } else if (urlObj.hostname.includes('vastdata.com')) {
            return 'Vast Data Labs';
          } else if (urlObj.hostname.includes('auth0.com')) {
            return 'Mindtickle'; // Auth0 SAML callback goes to Mindtickle
          } else {
            return 'your original site';
          }
        } catch (e) {
          return 'your original site';
        }
      }

      // Create countdown CTA element
      function createCountdownCTA(redirectUrl, destinationName) {
        console.log(`Community Signup Redirect Handler: Creating countdown CTA for ${destinationName} (${redirectUrl})`);
        
        // Remove any existing CTA
        const existingCTA = document.getElementById('redirect-countdown-cta');
        if (existingCTA) {
          existingCTA.remove();
        }

        const ctaContainer = document.createElement('div');
        ctaContainer.id = 'redirect-countdown-cta';
        ctaContainer.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 350px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: slideIn 0.5s ease-out;
        `;

        let countdown = 10;
        const countdownElement = document.createElement('div');
        countdownElement.style.cssText = `
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
        `;

        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
          font-size: 14px;
          margin-bottom: 15px;
          line-height: 1.4;
          text-align: center;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          display: flex;
          gap: 10px;
          justify-content: center;
        `;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Stay Here';
        cancelButton.style.cssText = `
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        `;

        const goNowButton = document.createElement('button');
        goNowButton.textContent = 'Go Now';
        goNowButton.style.cssText = `
          background: rgba(255, 255, 255, 0.9);
          border: none;
          color: #667eea;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          transition: all 0.2s ease;
        `;

        // Add hover effects
        cancelButton.addEventListener('mouseenter', () => {
          cancelButton.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        cancelButton.addEventListener('mouseleave', () => {
          cancelButton.style.background = 'rgba(255, 255, 255, 0.2)';
        });

        goNowButton.addEventListener('mouseenter', () => {
          goNowButton.style.background = 'white';
          goNowButton.style.transform = 'translateY(-1px)';
        });
        goNowButton.addEventListener('mouseleave', () => {
          goNowButton.style.background = 'rgba(255, 255, 255, 0.9)';
          goNowButton.style.transform = 'translateY(0)';
        });

        // Cancel button functionality
        cancelButton.addEventListener('click', () => {
          console.log('Community Signup Redirect Handler: User cancelled redirect');
          ctaContainer.remove();
          // Clear the redirect URL from localStorage to prevent future redirects
          localStorage.removeItem('auth0_original_redirect_url');
          // Clear URL parameters
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('return_url');
          newUrl.searchParams.delete('oauth2_redirect');
          newUrl.searchParams.delete('origin');
          newUrl.searchParams.delete('saml_redirect');
          newUrl.searchParams.delete('original_redirect');
          window.history.replaceState({}, '', newUrl.toString());
        });

        // Go now button functionality
        goNowButton.addEventListener('click', () => {
          console.log(`Community Signup Redirect Handler: User clicked "Go Now" - redirecting to ${redirectUrl}`);
          window.location.href = redirectUrl;
        });

        // Update countdown
        function updateCountdown() {
          countdownElement.textContent = `${countdown}s`;
          messageElement.textContent = `Redirecting you back to ${destinationName} in ${countdown} seconds...`;
          
          if (countdown <= 0) {
            console.log(`Community Signup Redirect Handler: Countdown finished - redirecting to ${redirectUrl}`);
            window.location.href = redirectUrl;
            return;
          }
          
          countdown--;
          setTimeout(updateCountdown, 1000);
        }

        // Assemble the CTA
        ctaContainer.appendChild(countdownElement);
        ctaContainer.appendChild(messageElement);
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(goNowButton);
        ctaContainer.appendChild(buttonContainer);

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `;
        document.head.appendChild(style);

        // Add to page and start countdown
        document.body.appendChild(ctaContainer);
        console.log(`Community Signup Redirect Handler: CTA added to page, starting countdown`);
        updateCountdown();
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
        if (!currentUser) {
          console.log('Community Signup Redirect Handler: No current user available - registration status unknown');
          return false;
        }
        
        // User must have a username
        if (!currentUser.username) {
          console.log('Community Signup Redirect Handler: User has no username - registration incomplete');
          return false;
        }
        
        // User must not be on a registration page
        if (isOnRegistrationPage()) {
          console.log('Community Signup Redirect Handler: User is on registration page - waiting for completion');
          return false;
        }
        
        // For direct signup flow, we can be more lenient with timing since registration is manual
        // Check if user has been active for at least 5 minutes (reduced from 15 minutes)
        if (!currentUser.created_at) {
          console.log('Community Signup Redirect Handler: User has no created_at timestamp - assuming registration is complete for testing');
          return true; // For testing, assume registration is complete
        }
        
        const userCreatedTime = new Date(currentUser.created_at).getTime();
        const currentTime = new Date().getTime();
        const timeSinceCreation = currentTime - userCreatedTime;
        
        // Check if the timestamp is valid (not NaN)
        if (isNaN(timeSinceCreation)) {
          console.log('Community Signup Redirect Handler: Invalid created_at timestamp - assuming registration is complete for testing');
          return true; // For testing, assume registration is complete
        }
        
        if (timeSinceCreation < 300000) { // 5 minutes
          console.log(`Community Signup Redirect Handler: User created recently (${timeSinceCreation}ms ago) - but proceeding anyway for testing`);
          return true; // For testing, proceed anyway
        }
        
        // Additional check: user should have some basic profile information
        if (!currentUser.name || currentUser.name.trim() === '') {
          console.log('Community Signup Redirect Handler: User has no name - registration may be incomplete');
          return false;
        }
        
        // Additional check: user should not be on any signup/registration related pages
        const currentPath = window.location.pathname;
        if (currentPath.includes('/signup') || currentPath.includes('/register') || currentPath.includes('/create-account')) {
          console.log('Community Signup Redirect Handler: User is still on signup/registration page - waiting for completion');
          return false;
        }
        
        // Additional check: look for signup forms or registration elements
        const signupForms = document.querySelectorAll('.signup-form, .registration-form, .create-account-form, form[action*="signup"], form[action*="register"]');
        if (signupForms.length > 0) {
          console.log('Community Signup Redirect Handler: Signup forms detected - waiting for completion');
          return false;
        }
        
        console.log(`Community Signup Redirect Handler: User appears to have completed registration (username: ${currentUser.username}, name: ${currentUser.name}, created ${timeSinceCreation}ms ago)`);
        return true;
      }

      // Main redirect handler function
      function handleRedirect() {
        console.log('Community Signup Redirect Handler: === REDIRECT CHECK STARTED ===');
        console.log('Community Signup Redirect Handler: Checking for redirect conditions...');
        console.log('Community Signup Redirect Handler: Current URL parameters:', Object.fromEntries(new URLSearchParams(window.location.search)));
        console.log('Community Signup Redirect Handler: Current URL:', window.location.href);
        
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
        console.log('Community Signup Redirect Handler: Current user:', currentUser ? {
          username: currentUser.username,
          email: currentUser.email,
          name: currentUser.name,
          created_at: currentUser.created_at
        } : 'No user');
        
        if (!currentUser) {
          console.log('Community Signup Redirect Handler: No current user found, skipping redirect');
          console.log('Community Signup Redirect Handler: This is normal if user is not logged in or user data is still loading');
          return;
        }

        console.log(`Community Signup Redirect Handler: User logged in: ${currentUser.email || 'No email'}`);
        console.log(`Community Signup Redirect Handler: User created at: ${currentUser.created_at || 'No timestamp'}`);
        console.log(`Community Signup Redirect Handler: User username: ${currentUser.username || 'No username'}`);
        console.log(`Community Signup Redirect Handler: User name: ${currentUser.name || 'No name'}`);
        console.log(`Community Signup Redirect Handler: Current URL: ${window.location.href}`);

        // Validate that we have basic user data before proceeding
        if (!currentUser.username) {
          console.log('Community Signup Redirect Handler: No username - waiting for user profile to load');
          return;
        }
        
        // For testing purposes, be more lenient with email and created_at
        if (!currentUser.email) {
          console.log('Community Signup Redirect Handler: No email - but proceeding anyway for testing');
        }
        
        if (!currentUser.created_at) {
          console.log('Community Signup Redirect Handler: No created_at - but proceeding anyway for testing');
        }

        // Check if countdown CTA is already showing
        if (document.getElementById('redirect-countdown-cta')) {
          console.log('Community Signup Redirect Handler: Countdown CTA already showing, skipping');
          return;
        }

        // PRIORITY 1: Check for return_url parameter (from direct signup flow)
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrlParam = urlParams.get('return_url');
        
        console.log(`Community Signup Redirect Handler: Checking return_url parameter: ${returnUrlParam}`);
        
        if (returnUrlParam && isAllowedDomain(returnUrlParam)) {
          console.log(`Community Signup Redirect Handler: Found return_url parameter: ${returnUrlParam}`);
          // Only redirect if user has completed registration
          console.log('Community Signup Redirect Handler: Checking if user has completed registration...');
          const registrationComplete = hasCompletedRegistration(currentUser);
          console.log(`Community Signup Redirect Handler: Registration complete: ${registrationComplete}`);
          if (!registrationComplete) {
            console.log('Community Signup Redirect Handler: User has not completed registration yet, waiting...');
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('return_url');
          newUrl.searchParams.delete('oauth2_redirect');
          newUrl.searchParams.delete('origin');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Show countdown CTA instead of immediate redirect
          const destinationName = getDestinationSiteName(returnUrlParam);
          console.log(`Community Signup Redirect Handler: Showing countdown CTA for ${destinationName}`);
          createCountdownCTA(returnUrlParam, destinationName);
          return;
        }

        // PRIORITY 2: Check for oauth2_redirect parameter (from direct signup flow)
        const oauth2RedirectParam = urlParams.get('oauth2_redirect');
        
        console.log(`Community Signup Redirect Handler: Checking oauth2_redirect parameter: ${oauth2RedirectParam}`);
        
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
          
          // Show countdown CTA instead of immediate redirect
          const destinationName = getDestinationSiteName(oauth2RedirectParam);
          console.log(`Community Signup Redirect Handler: Showing countdown CTA for ${destinationName}`);
          createCountdownCTA(oauth2RedirectParam, destinationName);
          return;
        }

        // PRIORITY 3: Check for origin parameter (from direct signup flow)
        const originParam = urlParams.get('origin');
        
        console.log(`Community Signup Redirect Handler: Checking origin parameter: ${originParam}`);
        
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
          
          // Show countdown CTA instead of immediate redirect
          const destinationName = getDestinationSiteName(originParam);
          console.log(`Community Signup Redirect Handler: Showing countdown CTA for ${destinationName}`);
          createCountdownCTA(originParam, destinationName);
          return;
        }

        // PRIORITY 4: Check for original_redirect URL parameter (from OAuth2 flow)
        const originalRedirectParam = urlParams.get('original_redirect');
        
        console.log(`Community Signup Redirect Handler: Checking original_redirect parameter: ${originalRedirectParam}`);
        
        if (originalRedirectParam && isAllowedDomain(originalRedirectParam)) {
          console.log(`OAuth2 Redirect Handler: Found original_redirect parameter: ${originalRedirectParam}`);
          
          // For OAuth2 flows, we need to be more patient since registration happens automatically
          // Check if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('OAuth2 Redirect Handler: User has not completed registration yet, waiting...');
            console.log(`OAuth2 Redirect Handler: User details - username: ${currentUser.username}, name: ${currentUser.name}, created: ${currentUser.created_at}`);
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('original_redirect');
          newUrl.searchParams.delete('redirect_count');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Show countdown CTA instead of immediate redirect
          const destinationName = getDestinationSiteName(originalRedirectParam);
          console.log(`OAuth2 Redirect Handler: User registration complete, showing countdown CTA for ${destinationName}`);
          createCountdownCTA(originalRedirectParam, destinationName);
          return;
        }

        // PRIORITY 4.5: Check for saml_redirect parameter (from updated Auth0 action)
        const samlRedirectParam = urlParams.get('saml_redirect');
        
        console.log(`Community Signup Redirect Handler: Checking saml_redirect parameter: ${samlRedirectParam}`);
        
        if (samlRedirectParam && isAllowedDomain(samlRedirectParam)) {
          console.log(`OAuth2 Redirect Handler: Found saml_redirect parameter: ${samlRedirectParam}`);
          
          // Check if user has completed registration
          if (!hasCompletedRegistration(currentUser)) {
            console.log('OAuth2 Redirect Handler: User has not completed registration yet, waiting...');
            return;
          }
          
          // Clear the parameter from URL to prevent loops
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('saml_redirect');
          newUrl.searchParams.delete('original_redirect');
          newUrl.searchParams.delete('redirect_count');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Show countdown CTA instead of immediate redirect
          const destinationName = getDestinationSiteName(samlRedirectParam);
          console.log(`OAuth2 Redirect Handler: User registration complete, showing countdown CTA for ${destinationName}`);
          createCountdownCTA(samlRedirectParam, destinationName);
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
          
          // Show countdown CTA instead of immediate redirect
          const destinationName = getDestinationSiteName(storedRedirectUrl);
          console.log(`OAuth2 Redirect Handler: Showing countdown CTA for ${destinationName}`);
          createCountdownCTA(storedRedirectUrl, destinationName);
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
            // Prioritize Auth0 SAML callback URL for Mindtickle users
            const fallbackRedirectUrl = 'https://thecosmosai-community.us.auth0.com/samlp/Mf20autdp5U8lXI7FUh0ciD2Z2Xj0d7d';
            console.log(`OAuth2 Redirect Handler: Using Auth0 SAML callback URL as fallback: ${fallbackRedirectUrl}`);
            
            // Show countdown CTA instead of immediate redirect
            const destinationName = getDestinationSiteName(fallbackRedirectUrl);
            console.log(`OAuth2 Redirect Handler: Showing countdown CTA for ${destinationName}`);
            createCountdownCTA(fallbackRedirectUrl, destinationName);
            return;
          }
        }

        console.log('OAuth2 Redirect Handler: No redirect conditions met');
      }

      // Run redirect check with appropriate delays for direct signup flow
      api.onPageChange(() => {
        // Reasonable delay to ensure user has time to complete registration
        setTimeout(handleRedirect, 10000); // 10 seconds for testing
      });

      // Also run on initial load with reasonable delay
      setTimeout(handleRedirect, 15000); // 15 seconds for testing

      // Listen for user login events
      api.onAppEvent('user:logged-in', () => {
        console.log('Community Signup Redirect Handler: User logged in event detected');
        // Don't redirect immediately on login - wait for registration completion
        setTimeout(handleRedirect, 10000); // 10 seconds for testing
      });

      // Listen for user registration events
      api.onAppEvent('user:registered', () => {
        console.log('Community Signup Redirect Handler: User registered event detected');
        // Wait after registration to ensure completion
        setTimeout(handleRedirect, 15000); // 15 seconds for testing
      });

      // Listen for user profile updates to ensure we have complete data
      api.onAppEvent('user:updated', () => {
        console.log('Community Signup Redirect Handler: User updated event detected');
        // Wait a bit for the update to complete
        setTimeout(handleRedirect, 30000); // 30 seconds
      });

      // Additional check after a longer delay to ensure user data is fully loaded
      setTimeout(() => {
        console.log('Community Signup Redirect Handler: Running delayed user data check');
        handleRedirect();
      }, 180000); // 3 minutes

      // Store redirect URL when user is redirected to Discourse
      // This is a backup mechanism in case the Auth0 Action doesn't work
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      console.log(`Community Signup Redirect Handler: Initial page load - URL: ${currentUrl}`);
      console.log(`Community Signup Redirect Handler: URL parameters:`, Object.fromEntries(urlParams.entries()));
      
      // Check if this is a signup flow or OAuth callback with redirect information
      // Updated to prioritize return_url parameter (from direct signup) and original_redirect parameter (from Action)
      // Also includes saml_redirect parameter from updated Auth0 action
      const originalUrl = urlParams.get('return_url') ||
                         urlParams.get('original_redirect') ||
                         urlParams.get('saml_redirect') ||
                         urlParams.get('original_url') || 
                         urlParams.get('return_to') ||
                         urlParams.get('returnTo');
      
      if (originalUrl && isAllowedDomain(originalUrl)) {
        console.log(`Community Signup Redirect Handler: Storing original redirect URL: ${originalUrl}`);
        localStorage.setItem('auth0_original_redirect_url', originalUrl);
      } else if (originalUrl) {
        console.log(`Community Signup Redirect Handler: Found redirect URL but domain not allowed: ${originalUrl}`);
      }

      console.log('Community Signup Redirect Handler: Initialization complete');
      
      // Add test function to global scope for debugging
      window.testRedirectCTA = function() {
        console.log('Community Signup Redirect Handler: Testing CTA manually');
        createCountdownCTA('https://vastdatacustomers.mindtickle.com', 'Mindtickle');
      };
      
      // Add test function that simulates a redirect scenario
      window.simulateRedirectScenario = function() {
        console.log('Community Signup Redirect Handler: Simulating redirect scenario');
        // Add a test URL parameter
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('saml_redirect', 'https://vastdatacustomers.mindtickle.com');
        window.history.replaceState({}, '', currentUrl.toString());
        
        // Trigger the redirect check
        setTimeout(handleRedirect, 1000);
      };
      
      console.log('Community Signup Redirect Handler: Test functions available:');
      console.log('  - window.testRedirectCTA() - Test CTA directly');
      console.log('  - window.simulateRedirectScenario() - Simulate full redirect scenario');
    });
  }
}; 