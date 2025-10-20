# Development Scripts

This folder contains helpful scripts for local development.

## setup-local-config.ps1

Checks if required configuration files exist for local development.

**Usage:**
```powershell
./scripts/setup-local-config.ps1
```

**What it checks:**
- `android/app/google-services.json` - Required for Firebase functionality
- `android/firelane.json` - Only needed for Play Store deployment (CI/CD)

**Note:** Configuration files are stored in GitHub secrets for CI/CD and should be downloaded manually for local development.