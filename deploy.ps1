# Quick deployment script for GenesisX
Write-Host "Deploying EcoSysX to GenesisX..." -ForegroundColor Green

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Staging and committing changes..." -ForegroundColor Yellow
    git add .
    $commitMessage = Read-Host "Enter commit message (or press Enter for auto-message)"
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $commitMessage = "Update EcoSysX - $timestamp"
    }
    git commit -m $commitMessage
} else {
    Write-Host "No changes to commit" -ForegroundColor Cyan
}

# Push to both remotes
Write-Host "Pushing to GitHub..." -ForegroundColor Blue
git push origin main

Write-Host "Deploying to Hugging Face Spaces..." -ForegroundColor Magenta
git push hf main

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Visit: https://huggingface.co/spaces/Bbeierle21/GenesisX" -ForegroundColor Cyan