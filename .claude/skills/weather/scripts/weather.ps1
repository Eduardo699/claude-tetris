# Fetches weather data from wttr.in (no API key required).
#
# Usage:
#   powershell -File weather.ps1 -Location "Madrid" -Mode quick -Units m
#
#   Location: city name, airport code, or "" to use the default (San Salvador, El Salvador)
#   Mode:     quick (default) | full | json
#   Units:    m = metric (default), u = imperial, "" = wttr.in default for the location

param(
    [string]$Location = "San Salvador",
    [ValidateSet("quick", "full", "json")]
    [string]$Mode = "quick",
    [string]$Units = "m"
)

$unitsParam = ""
if ($Units -ne "") {
    $unitsParam = "&$Units"
}

$encodedLocation = $Location -replace ' ', '+'

switch ($Mode) {
    "quick" { $url = "https://wttr.in/$encodedLocation`?format=4$unitsParam" }
    "full"  { $url = "https://wttr.in/$encodedLocation`?$($unitsParam.TrimStart('&'))" }
    "json"  { $url = "https://wttr.in/$encodedLocation`?format=j1$unitsParam" }
}

try {
    $resp = Invoke-WebRequest -Uri $url -Headers @{ "User-Agent" = "curl/8.0" } -UseBasicParsing -ErrorAction Stop
    Write-Output $resp.Content
} catch {
    Write-Error "No se pudo obtener el clima: $_"
    exit 1
}
