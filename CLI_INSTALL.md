# CLI installation (gcloud, Firebase, Gemini)

## Firebase CLI

```powershell
npm install -g firebase-tools
```

- **Check:** `firebase --version`
- **Login:** `firebase login`
- **Use project:** `firebase use dutch-bros-site-selector`

---

## Gemini CLI

```powershell
npm install -g @google/gemini-cli
```

- **Check:** `gemini --version`
- **Run:** `gemini` (then sign in in the browser when prompted)

---

## Google Cloud CLI (gcloud)

### Option A: Installer (recommended on Windows)

1. Download the installer:  
   [GoogleCloudSDKInstaller.exe](https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe)  
   Or run in PowerShell:
   ```powershell
   Invoke-WebRequest -Uri "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" -OutFile "$env:USERPROFILE\Desktop\GoogleCloudSDKInstaller.exe" -UseBasicParsing
   ```
2. Double-click **GoogleCloudSDKInstaller.exe** (on Desktop or your download folder).
3. Complete the wizard (install location, add to PATH).
4. Open a **new** terminal and run:
   ```powershell
   gcloud init
   ```
   Sign in with your Google account and select project `dutch-bros-site-selector`.

### Option B: Versioned archive (no GUI)

1. Download the Windows 64-bit zip:  
   [google-cloud-cli-windows-x86_64.zip](https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-windows-x86_64.zip)
2. Extract to a folder (e.g. `C:\Users\YourName\google-cloud-sdk`).
3. From that folder run:
   ```powershell
   .\google-cloud-sdk\install.bat
   ```
   Use `.\google-cloud-sdk\install.bat --help` for non-interactive options.
4. Add the SDK `bin` folder to your PATH, or run:
   ```powershell
   .\google-cloud-sdk\bin\gcloud init
   ```

### Verify

```powershell
gcloud --version
gcloud config get-value project
```

---

## Quick reference

| CLI     | Install                    | Verify            |
|--------|----------------------------|-------------------|
| Firebase | `npm install -g firebase-tools` | `firebase --version` |
| Gemini   | `npm install -g @google/gemini-cli` | `gemini --version`   |
| gcloud   | Run installer or extract zip + `install.bat` | `gcloud --version`   |
