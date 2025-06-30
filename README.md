# OAuth2 Redirect Handler Theme Component

This Discourse theme component handles redirects after OAuth2 registration for Auth0 integration, with admin-configurable settings.

## Features
- Captures redirect URLs from URL parameters during OAuth2 flow
- Stores redirect information in browser localStorage
- Automatically redirects users back to their original site after registration
- Security validation of redirect URLs
- User-friendly messages during the redirect process
- Admin-configurable settings for allowed domains, delay, and debug mode

## Installation
1. Fork or clone this repository.
2. In Discourse Admin → Customize → Themes → Install → "From a git repository", paste the repo URL.
3. Add the component to your active theme.
4. Configure settings in Admin → Customize → Your Theme → Settings tab.

## Settings
- **whitelisted_domains**: List of allowed redirect domains
- **redirect_delay**: Delay in milliseconds before redirect
- **debug_mode**: Enable debug logging in browser console

## How It Works
1. Auth0 Action redirects to Discourse with redirect parameters.
2. Component captures these parameters and stores them in localStorage.
3. After registration, component detects successful login and redirects user back.

## Security
- Only allows HTTPS redirects
- Only allows specified domains
- Prevents malicious redirects

## License
MIT 