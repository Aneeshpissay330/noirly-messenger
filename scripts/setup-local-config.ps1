# Local Development Setup Script
# This script helps set up configuration files for local development

Write-Host "Setting up local development configuration..." -ForegroundColor Green

# Check if google-services.json exists
if (-not (Test-Path "android/app/google-services.json")) {
    Write-Host "⚠️  google-services.json not found" -ForegroundColor Yellow
    Write-Host "For local development, you need to:" -ForegroundColor White
    Write-Host "1. Download google-services.json from Firebase Console" -ForegroundColor White
    Write-Host "2. Place it in android/app/google-services.json" -ForegroundColor White
    Write-Host "3. The file is in .gitignore so it won't be committed" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Firebase Console: https://console.firebase.google.com/project/chat-app-e1129/settings/general/android:com.aneesh.noirly.messenger" -ForegroundColor Blue
} else {
    Write-Host "✅ google-services.json found" -ForegroundColor Green
}

# Check if firelane.json exists (if needed for local testing)
if (-not (Test-Path "android/firelane.json")) {
    Write-Host "ℹ️  firelane.json not found (normal for local development)" -ForegroundColor Blue
    Write-Host "This file is only needed for Play Store deployment in CI/CD" -ForegroundColor White
} else {
    Write-Host "✅ firelane.json found" -ForegroundColor Green
}

Write-Host ""
Write-Host "✨ Local setup check complete!" -ForegroundColor Green