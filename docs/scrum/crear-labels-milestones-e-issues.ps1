<#
  Carga labels, milestones e issues del Sprint 0 en GitHub con GitHub CLI.
  Uso (desde cualquier carpeta, con gh autenticado: gh auth status):
    ./docs/scrum/crear-labels-milestones-e-issues.ps1 -DryRun   # solo muestra lo que haría
    ./docs/scrum/crear-labels-milestones-e-issues.ps1           # lo ejecuta
  Es seguro repetirlo: omite issues cuyo título ya existe y avisa si un label o milestone ya está creado.
#>
param([switch]$DryRun)

$repo = "X294-DEV/CitaGlam"
$issuesDir = Join-Path $PSScriptRoot "issues"

function Invoke-Gh {
  param([string[]]$GhArgs)
  if ($DryRun) { Write-Host ("[simulacro] gh " + ($GhArgs -join ' ')) }
  else { & gh @GhArgs }
}

if (-not $DryRun) {
  gh auth status
  if ($LASTEXITCODE -ne 0) { throw "GitHub CLI no esta autenticado. Ejecuta: gh auth login" }
}

# --- Labels ---
$labels = @(
  @("sprint-0","0E8A16","Trabajo del Sprint 0"),
  @("sprint-1","0E8A16","Trabajo del Sprint 1"),
  @("sprint-2","0E8A16","Trabajo del Sprint 2"),
  @("sprint-3","0E8A16","Trabajo del Sprint 3"),
  @("sprint-4","0E8A16","Trabajo del Sprint 4"),
  @("pareja-1","D4C5F9","Aioria - backend de citas, clientes, auth y Prisma"),
  @("pareja-2","D4C5F9","Angel - pagos, mensajeria, worker y comprobantes"),
  @("pareja-3","D4C5F9","Marjorie - panel Angular"),
  @("pareja-4","D4C5F9","Adrian - cliente publico, calidad, despliegue y docs"),
  @("backend","5319E7","Cambios en API, servicios o logica backend"),
  @("frontend","1D76DB","Cambios en interfaz"),
  @("database","FBCA04","Cambios en base de datos"),
  @("docs","0075CA","Documentacion, planes o guias"),
  @("seguridad","B60205","Correccion o revision de seguridad"),
  @("bug","D73A4A","Algo no funciona como se espera"),
  @("deuda","C5DEF5","Deuda tecnica y mantenimiento"),
  @("bloqueado","E99695","Bloqueado por dependencia o decision"),
  @("deseable","FEF2C0","Fuera del minimo; se recorta si hay retraso"),
  @("orquestador-review","BFDADC","Requiere revision del orquestador")
)
foreach ($l in $labels) {
  Invoke-Gh @("label","create",$l[0],"--color",$l[1],"--description",$l[2],"--repo",$repo,"--force")
}

# --- Milestones ---
$milestones = @(
  @("Sprint 0","2026-11-13"), @("Sprint 1","2026-11-18"), @("Sprint 2","2026-11-22"),
  @("Sprint 3","2026-11-26"), @("Sprint 4","2026-11-30")
)
foreach ($m in $milestones) {
  Invoke-Gh @("api","-X","POST","repos/$repo/milestones","-f","title=$($m[0])","-f","due_on=$($m[1])T23:59:59Z")
  if (-not $DryRun -and $LASTEXITCODE -ne 0) { Write-Warning "Milestone '$($m[0])' ya existe o no se pudo crear." }
}

# --- Issues ---
$existing = @()
if (-not $DryRun) {
  $existing = (gh issue list --repo $repo --state all --limit 300 --json title | ConvertFrom-Json) | ForEach-Object { $_.title }
}

Get-ChildItem $issuesDir -Filter "S0-*.md" | Sort-Object Name | ForEach-Object {
  $raw = Get-Content $_.FullName -Raw -Encoding UTF8
  if ($raw -notmatch '(?s)^---\r?\n(.*?)\r?\n---\r?\n(.*)$') { Write-Warning "Sin encabezado: $($_.Name)"; return }
  $meta = $Matches[1]; $body = $Matches[2]
  $title    = [regex]::Match($meta, 'title:\s*"(.*)"').Groups[1].Value
  $lbls     = [regex]::Match($meta, 'labels:\s*(.*)').Groups[1].Value.Trim()
  $assignee = [regex]::Match($meta, 'assignee:\s*(.*)').Groups[1].Value.Trim()
  $sprint   = [regex]::Match($lbls, 'sprint-(\d)').Groups[1].Value
  $milestone = "Sprint $sprint"

  if ($existing -contains $title) { Write-Host "Ya existe, se omite: $title"; return }

  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmp, $body, (New-Object System.Text.UTF8Encoding($false)))

  Invoke-Gh @("issue","create","--repo",$repo,"--title",$title,"--body-file",$tmp,"--label",$lbls,"--assignee",$assignee,"--milestone",$milestone)
  if (-not $DryRun -and $LASTEXITCODE -ne 0) {
    Write-Warning "No se pudo asignar a $assignee (quiza no ha aceptado la invitacion). Se crea sin responsable."
    Invoke-Gh @("issue","create","--repo",$repo,"--title",$title,"--body-file",$tmp,"--label",$lbls,"--milestone",$milestone)
  }
  Remove-Item $tmp -ErrorAction SilentlyContinue
}
Write-Host "Listo."
