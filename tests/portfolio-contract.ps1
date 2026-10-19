$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'portfolio-contract.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Portfolio contract failed.' }
