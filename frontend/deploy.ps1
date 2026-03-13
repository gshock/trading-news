#!/usr/bin/env pwsh
# deploy.ps1 — Build and deploy the frontend to Azure Static Web Apps
#
# Usage:
#   .\deploy.ps1 -DeploymentToken <token>
#
# The deployment token is found in the Azure Portal under:
#   trading-news-frontend → Manage deployment token

param(
    [Parameter(Mandatory = $true)]
    [string]$DeploymentToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$FrontendDir = $PSScriptRoot

Write-Host "`n==> Checking for .env.production file..." -ForegroundColor Cyan
$EnvFile = Join-Path $FrontendDir ".env.production"
if (-not (Test-Path $EnvFile)) {
    Write-Error ".env.production file not found at $EnvFile. Copy the PRODUCTION block from .env.example into .env.production and fill in VITE_API_URL and VITE_API_KEY before deploying."
}

Write-Host "==> Installing dependencies..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    npm ci --prefer-offline
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

    Write-Host "`n==> Building frontend..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

    $DistDir = Join-Path $FrontendDir "dist"
    if (-not (Test-Path $DistDir)) {
        throw "dist/ folder not found after build"
    }

    Write-Host "`n==> Deploying to Azure Static Web Apps..." -ForegroundColor Cyan
    npx --yes @azure/static-web-apps-cli deploy $DistDir `
        --deployment-token $DeploymentToken `
        --env production
    if ($LASTEXITCODE -ne 0) { throw "SWA CLI deploy failed" }

    Write-Host "`n==> Deployment complete!" -ForegroundColor Green
    Write-Host "    URL: https://polite-pond-0a06a4e0f.1.azurestaticapps.net" -ForegroundColor Green
}
finally {
    Pop-Location
}
