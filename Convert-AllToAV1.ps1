
<# 
    Convert-AllToAV1.ps1
    Batch-convert every MP4 in the current folder to AV1 using your winning ffmpeg command.

    Usage:
      - Right-click the folder where the videos are, “Open PowerShell here,” then:
        .\Convert-AllToAV1.ps1

      - Optional switches:
        .\Convert-AllToAV1.ps1 -TargetDirectory "C:\Videos\MyFolder"  # specify target directory
        .\Convert-AllToAV1.ps1 -BitrateKbps 225       # change target avg video bitrate (kbps)
        .\Convert-AllToAV1.ps1 -DryRun               # show what would run, without encoding
        .\Convert-AllToAV1.ps1 -Overwrite            # overwrite existing _AV1.mp4 outputs

    Requirements:
      - ffmpeg must be in PATH (or set $FFMpegPath below).
#>

param(
    [string]$TargetDirectory = (Get-Location).Path,
    [int]$BitrateKbps = 225,
    [switch]$DryRun,
    [switch]$Overwrite
)

# --- CONFIG ---------------------------------------------------------------
# If ffmpeg isn’t in PATH, set the full path here, e.g.:
# $FFMpegPath = "C:\Tools\ffmpeg\bin\ffmpeg.exe"
$FFMpegPath = "ffmpeg"

# Core options from your winning command
$VideoMap = "-map 0:v:0"
$AudioMap = "-map 0:a:0"
$VideoCodecLibAOM = "-c:v libaom-av1"      # kept to match your working cmd
$VideoCodecAMF    = "-c:v av1_amf"
$RowMT            = "-row-mt 1"
$AudioCopy        = "-c:a copy"
$QualityMode      = "-quality quality"
$FastStart        = "-movflags +faststart"

# --- SCRIPT ---------------------------------------------------------------
# Validate target directory
if (-not (Test-Path -Path $TargetDirectory -PathType Container)) {
    Write-Error "Target directory not found: $TargetDirectory"
    exit 1
}

Write-Host "Target directory: $TargetDirectory" -ForegroundColor Cyan

# Collect MP4 files (non-recursive; change to Get-ChildItem -Recurse if needed)
$files = Get-ChildItem -Path $TargetDirectory -File -Filter *.mp4

if ($files.Count -eq 0) {
    Write-Host "No .mp4 files found in '$TargetDirectory'. Nothing to do." -ForegroundColor Yellow
    exit 0
}

# Check ffmpeg presence
try {
    $ffv = & $FFMpegPath -version 2>$null
} catch {
    Write-Error "ffmpeg not found. Update `$FFMpegPath or add ffmpeg to PATH."
    exit 1
}

Write-Host "Found $($files.Count) MP4 file(s). Target average video bitrate: $BitrateKbps kbps" -ForegroundColor Cyan
Write-Host ("DryRun: {0} | Overwrite: {1}" -f $DryRun, $Overwrite) -ForegroundColor DarkGray

$stopwatchTotal = [System.Diagnostics.Stopwatch]::StartNew()
$converted = 0
$skipped   = 0
$failed    = 0

foreach ($file in $files) {
    $inPath  = $file.FullName
    $base    = [System.IO.Path]::GetFileNameWithoutExtension($inPath)
    $outPath = Join-Path $file.DirectoryName ("{0}_AV1.mp4" -f $base)

    if (-not $Overwrite -and (Test-Path $outPath)) {
        Write-Host "Skip (exists): $outPath" -ForegroundColor Yellow
        $skipped++
        continue
    }

    # Build the exact command you shared, parameterizing bitrate
    $cmd = @(
        '-i', "`"$inPath`"",
        $VideoMap, $AudioMap,
        $VideoCodecLibAOM,       # kept (FFmpeg will use the last -c:v)
        $VideoCodecAMF,
        '-b:v', ("{0}k" -f $BitrateKbps),
        $RowMT,
        $AudioCopy,
        $QualityMode,
        $FastStart,
        "`"$outPath`""
    )

    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Input : $inPath"  -ForegroundColor White
    Write-Host "Output: $outPath" -ForegroundColor White
    Write-Host "Command:" -ForegroundColor DarkGray
    Write-Host "$FFMpegPath $($cmd -join ' ')" -ForegroundColor Gray

    if ($DryRun) { continue }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $process = Start-Process -FilePath $FFMpegPath -ArgumentList $cmd -NoNewWindow -Wait -PassThru
    $sw.Stop()

    if ($process.ExitCode -eq 0 -and (Test-Path $outPath)) {
        Write-Host ("✅ Done in {0:mm\:ss} → {1}" -f $sw.Elapsed, $outPath) -ForegroundColor Green
        $converted++
    }
    else {
        Write-Host ("❌ Failed (exit {0}) after {1:mm\:ss}: {2}" -f $process.ExitCode, $sw.Elapsed, $inPath) -ForegroundColor Red
        $failed++
    }
}

$stopwatchTotal.Stop()
Write-Host "============================================================" -ForegroundColor DarkGray
Write-Host ("Finished in {0:mm\:ss}. Converted: {1}, Skipped: {2}, Failed: {3}" -f $stopwatchTotal.Elapsed, $converted, $skipped, $failed) -ForegroundColor Cyan
