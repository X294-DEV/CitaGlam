$ErrorActionPreference = 'Stop'

$distro = 'Ubuntu-24.04'
$drive = $PSScriptRoot.Substring(0, 1).ToLowerInvariant()
$path = $PSScriptRoot.Substring(3).Replace('\', '/')
$workspace = "/mnt/$drive/$path"

# Keep WSL alive while the native Docker engine serves the development stack.
Start-Process -FilePath 'wsl.exe' `
  -ArgumentList @('-d', $distro, '--exec', 'sleep', 'infinity') `
  -WindowStyle Hidden

wsl.exe -d $distro -u root -- bash -lc `
  "systemctl start docker && cd '$workspace' && docker compose up -d"

Write-Host 'CGBG listo:'
Write-Host '  Cliente:  http://localhost:3000'
Write-Host '  API:      http://localhost:3001'
Write-Host '  Admin:    http://localhost:4200'
Write-Host '  RabbitMQ: http://localhost:15672'
