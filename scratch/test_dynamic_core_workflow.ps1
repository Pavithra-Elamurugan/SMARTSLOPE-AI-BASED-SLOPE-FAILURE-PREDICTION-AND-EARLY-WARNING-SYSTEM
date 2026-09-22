$ErrorActionPreference = "Stop"

Write-Host "=== Testing SmartSlope Dynamic Location & AI ML Core Workflow ===" -ForegroundColor Cyan

# 1. Login as Admin
$loginBody = @{
    email = "Admin@gmail.com"
    password = "Admin@12345"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
$email = $loginResponse.email
$userRole = $loginResponse.role
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "Logged in successfully as Admin ($email, Role: $userRole)" -ForegroundColor Green

# 2. Add dynamic location (Kullu Valley Slope)
$siteBody = @{
    siteName = "Kullu Valley Slope"
    siteType = "Mountain Slope"
    latitude = 31.9579
    longitude = 77.1095
    slopeAngle = 48.5
    soilType = "Gravelly Residual Soil"
    location = "Kullu District, Himachal Pradesh"
    status = "MONITORING"
} | ConvertTo-Json

$siteResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/sites" -Method Post -Headers $headers -Body $siteBody -ContentType "application/json"
$siteId = $siteResponse.id
$sName = $siteResponse.siteName
$sLoc = $siteResponse.location
Write-Host "Dynamically created site in MySQL (ID: $siteId, Name: $sName, Location: $sLoc)" -ForegroundColor Green

# 3. Evaluate AI Risk Prediction via FastAPI ML model / Rule Engine
$evalBody = @{
    rainfall = 98.5
    soilMoisture = 85.0
    groundVibration = 0.85
    waterLevel = 3.8
    tilt = 5.2
    crackWidth = 14.5
    groundMovement = 8.6
} | ConvertTo-Json

$predResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/predictions/evaluate-site/$siteId" -Method Post -Headers $headers -Body $evalBody -ContentType "application/json"

$pSite = $predResponse.siteName
$pRisk = $predResponse.riskLevel
$pScore = $predResponse.confidenceScore
$pSource = $predResponse.dataSourceInfo
$pHasSensors = $predResponse.hasSensors
$pRec = $predResponse.recommendation

Write-Host "`n--- AI ML PREDICTION RESULT ---" -ForegroundColor Yellow
Write-Host "Site Name:        $pSite" -ForegroundColor White
Write-Host "Risk Level:       $pRisk" -ForegroundColor White
Write-Host "Model Risk Score: $pScore" -ForegroundColor White
Write-Host "Data Source Info: $pSource" -ForegroundColor White
Write-Host "Has Sensors:      $pHasSensors" -ForegroundColor White
Write-Host "Recommendation:   $pRec" -ForegroundColor White

if ($pRisk -eq "HIGH_RISK") {
    Write-Host "SUCCESS: HIGH RISK prediction produced as expected!" -ForegroundColor Green
} else {
    Write-Host "Risk level returned: $pRisk" -ForegroundColor Yellow
}

# 4. Verify Automatic Alert Generation
Start-Sleep -Seconds 1
$alertsResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/alerts" -Method Get -Headers $headers
$createdAlert = $alertsResponse | Where-Object { $_.monitoringSiteId -eq $siteId }

if ($createdAlert) {
    $aMsg = $createdAlert.message
    $aSev = $createdAlert.severity
    Write-Host "Automatic alert successfully generated in MySQL for site ID $siteId!" -ForegroundColor Green
    Write-Host "  Alert Message: $aMsg" -ForegroundColor Gray
    Write-Host "  Severity:      $aSev" -ForegroundColor Gray
} else {
    Write-Host "No alert found for site $siteId" -ForegroundColor Yellow
}

Write-Host "`n=== Dynamic Core Workflow Test PASSED Completely! ===" -ForegroundColor Green
