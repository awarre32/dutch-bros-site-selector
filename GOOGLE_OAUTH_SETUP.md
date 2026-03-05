# Use your OAuth client for "Sign in with Google"

The app now has a **Sign in with Google** button. To make it work, add your OAuth client to Firebase:

1. Open **Firebase Console** → your project **dutch-bros-site-selector**  
   https://console.firebase.google.com/project/dutch-bros-site-selector/authentication/providers

2. Under **Sign-in method**, click **Google** → **Enable** (if not already).

3. In **Web SDK configuration**:
   - **Web client ID:** paste your Client ID  
     `760395145160-3oe0bgsg2hcojc0nl4ib182g2gus8ls8.apps.googleusercontent.com`
   - **Web client secret:** paste the Client secret from the OAuth dialog (store it securely; you can’t view it again after closing).

4. Save. The **Sign in with Google** button in the app will then use this OAuth client.

**Note:** The dialog said OAuth is restricted to **test users** on the OAuth consent screen. Until you publish the app or add users as test users in [Google Cloud Console → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent?project=dutch-bros-site-selector), only those test users can sign in with Google. Add your email (and any others) under “Test users” so you can sign in.
