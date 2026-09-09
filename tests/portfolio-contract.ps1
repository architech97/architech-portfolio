$ErrorActionPreference = 'Stop'

$site = Split-Path -Parent $PSScriptRoot
$requiredFiles = @('index.html', 'styles.css', 'script.js', 'README.md')

foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $site $file))) {
        throw "Missing required site file: $file"
    }
}

$html = Get-Content -LiteralPath (Join-Path $site 'index.html') -Raw
$css = Get-Content -LiteralPath (Join-Path $site 'styles.css') -Raw
$script = Get-Content -LiteralPath (Join-Path $site 'script.js') -Raw
$readme = Get-Content -LiteralPath (Join-Path $site 'README.md') -Raw
$liveSource = $html + "`n" + $css + "`n" + $script + "`n" + $readme

foreach ($forbiddenName in 'Burj Khalifa', 'Fallingwater') {
    if ($liveSource -match [regex]::Escape($forbiddenName)) {
        throw "Named landmark remains in live source: $forbiddenName"
    }
}

foreach ($solidContract in 'solidPrism', 'SOLID_MATERIALS', 'MODEL.solids') {
    if ($script -notmatch [regex]::Escape($solidContract)) {
        throw "Missing solid model contract: $solidContract"
    }
}

$htmlContracts = @(
    @{ Name = 'LinkedIn'; Value = 'https://www.linkedin.com/in/architech-india/' },
    @{ Name = 'GitHub'; Value = 'https://github.com/architech97' },
    @{ Name = 'Instagram'; Value = 'https://www.instagram.com/ar.navneet.97/' },
    @{ Name = 'Email'; Value = 'mailto:Ar.navneet97@gmail.com' },
    @{ Name = 'Sound opt-in'; Value = 'Enable sound' },
    @{ Name = 'Skip link'; Value = 'Skip to content' },
    @{ Name = 'Hero canvas'; Value = 'id="signal-canvas"' },
    @{ Name = 'Twin canvas'; Value = 'id="twin-canvas"' },
    @{ Name = 'Gates section'; Value = 'id="gates"' },
    @{ Name = 'Mobile nav toggle'; Value = 'data-nav-toggle' }
)

foreach ($contract in $htmlContracts) {
    if ($html -notmatch [regex]::Escape($contract.Value)) {
        throw "Missing HTML contract: $($contract.Name)"
    }
}

foreach ($sectionId in 'signal', 'twin') {
    $sectionPattern = '<section\b[^>]*\bid="' + [regex]::Escape($sectionId) + '"'
    if ($html -notmatch $sectionPattern) {
        throw "Missing exact section ID: $sectionId"
    }
}

foreach ($navTarget in 'signal', 'twin') {
    $href = 'href="#' + $navTarget + '"'
    if ($html -notmatch [regex]::Escape($href)) {
        throw "Missing navigation anchor: #$navTarget"
    }
}

foreach ($twinId in 'twin-build-status', 'twin-level', 'twin-elev', 'twin-layer') {
    $idFragment = 'id="' + $twinId + '"'
    if ($html -notmatch [regex]::Escape($idFragment)) {
        throw "Missing twin hook ID: $twinId"
    }
}

$twinStageCount = [regex]::Matches($html, 'class="twin-stage(?:\s|")').Count
if ($twinStageCount -ne 5) {
    throw "Expected exactly five twin stages; found $twinStageCount"
}

foreach ($value in 'GENERIC BIM MODEL', 'data-twin-stages') {
    if ($html -notmatch [regex]::Escape($value)) {
        throw "Missing redesigned slide contract: $value"
    }
}

if ($css -notmatch 'prefers-reduced-motion') {
    throw 'Missing reduced-motion fallback'
}

$cssContracts = @('.brand-img', '.hero-inner', '.stat-grid', '.marquee', '.gates-grid', '.cards', '.vision', '.titleblock', '.stat-hero', '.case-cinema', '.nav-toggle')
foreach ($selector in $cssContracts) {
    if ($css -notmatch [regex]::Escape($selector)) {
        throw "Missing CSS contract: $selector"
    }
}

foreach ($selector in '.twin-stage', '.model-plate') {
    if ($css -notmatch [regex]::Escape($selector)) {
        throw "Missing redesigned slide selector: $selector"
    }
}

foreach ($requiredApi in 'AudioContext', 'IntersectionObserver', 'requestAnimationFrame') {
    if ($script -notmatch [regex]::Escape($requiredApi)) {
        throw "Missing interaction contract: $requiredApi"
    }
}

foreach ($contract in '1000 / 30', 'mobileFill', 'document.documentElement.classList.toggle', "style.transform = 'scaleX('") {
    if ($script -notmatch [regex]::Escape($contract)) {
        throw "Missing mobile performance contract: $contract"
    }
}

foreach ($contract in 'html.nav-lock', 'grid-template-columns: repeat(2, minmax(0, 1fr))', 'height: calc(100dvh - var(--topbar-h))') {
    if ($css -notmatch [regex]::Escape($contract)) {
        throw "Missing mobile layout contract: $contract"
    }
}

if ($html -match 'https?://(?!www\.linkedin\.com/in/architech-india/|github\.com/architech97|www\.instagram\.com/ar\.navneet\.97/|architech97\.github\.io/architech-command-center/|architech97\.github\.io/architech-portfolio/)') {
    throw 'Unexpected remote dependency found in index.html'
}

Write-Host 'Portfolio contract passed.' -ForegroundColor Green
