Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   AdvD - Digital Court Diary & Advocate System" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan

# Check MongoDB service
$mongo = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongo -and $mongo.Status -ne 'Running') {
    Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
    Start-Service -Name MongoDB
}

Write-Host "Starting Backend API on Port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

Write-Host "Starting Frontend Client on Port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "Opening AdvD in your default browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

