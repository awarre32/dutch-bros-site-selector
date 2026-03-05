# Firebase sign-in required

The website **requires sign-in**. There is no "Continue as guest" option. Users must sign in with **Email/Password** or **Sign in with Google** to access the map and AI-qualified sites.

- If they’re already signed in (same browser), the login popup closes and the app loads.
- If not, they stay on the login screen until they sign in.

---

# Allow any Google user (not just test users)

By default, your OAuth client only allows **test users** listed on the OAuth consent screen. To let **anyone with a Google account** sign in:

1. Open **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**  
   https://console.cloud.google.com/apis/credentials/consent?project=dutch-bros-site-selector

2. Under **Publishing status** you’ll see **Testing** (only test users can sign in).

3. Click **PUBLISH APP** (or **Make public** / equivalent).
   - Confirm. The status will change to **In production**.
   - **External** apps: Google may show a warning that the app isn’t verified. For internal use you can still use “Continue” so any Google user can sign in; for wide public use you may need to complete verification later.
   - **Internal** (Google Workspace): Only users in your organization can sign in; no “test users” list.

4. After publishing, any user with a Google account can use **Sign in with Google** on your site (no need to add them as test users).

**Summary:**  
- **Testing** = only the test users you add can sign in with Google.  
- **In production** (published) = any Google user can sign in (or any user in your org if the app is Internal).
