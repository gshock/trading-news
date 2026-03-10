#!/usr/bin/env pwsh
# deploy.ps1 — Build and deploy the backend to Azure Container Apps
#
# Usage:
#   .\deploy.ps1
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Access to the TraderRG resource group

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Registry     = "ca9575ab0fccacr"
$Image        = "trading-news-backend:latest"
$FullImage    = "$Registry.azurecr.io/$Image"
$AppName      = "trading-news-backend"
$ResourceGroup = "TraderRG"

$BackendDir = $PSScriptRoot

Write-Host "`n==> Verifying Azure CLI login..." -ForegroundColor Cyan
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not logged in to Azure. Run 'az login' first."
}

Write-Host "==> Building and pushing image to ACR..." -ForegroundColor Cyan
Write-Host "    Registry : $Registry"
Write-Host "    Image    : $Image"
Push-Location $BackendDir
try {
    az acr build --registry $Registry --image $Image .
    if ($LASTEXITCODE -ne 0) { throw "ACR build failed" }
}
finally {
    Pop-Location
}

Write-Host "`n==> Updating Container App..." -ForegroundColor Cyan
Write-Host "    App      : $AppName"
Write-Host "    Image    : $FullImage"
az containerapp update `
    --name $AppName `
    --resource-group $ResourceGroup `
    --image $FullImage
if ($LASTEXITCODE -ne 0) { throw "Container App update failed" }

Write-Host "`n==> Verifying deployment..." -ForegroundColor Cyan
$healthUrl = "https://trading-news-backend.salmonflower-e01ae160.eastus2.azurecontainerapps.io/"
try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 15
    Write-Host "    Health check: $response" -ForegroundColor Green
} catch {
    Write-Warning "Health check request failed — the app may still be starting up. Check manually: $healthUrl"
}

Write-Host "`n==> Deployment complete!" -ForegroundColor Green
