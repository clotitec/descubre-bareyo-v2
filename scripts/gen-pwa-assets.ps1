# Genera los iconos PWA (cuadrados + maskable) y la portada Open Graph 1200x630
# a partir de assets/logo.png. Reejecutable si cambia el logo.
#   Uso:  pwsh scripts/gen-pwa-assets.ps1   (o powershell.exe en Windows)
# Nota PS 5.1: lee el .ps1 como ANSI -> los símbolos van por [char]0xXX para evitar mojibake.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$root = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets'   # <repo>/assets
$logoPath = Join-Path $root 'logo.png'
$green = [System.Drawing.Color]::FromArgb(26, 77, 46)      # #1A4D2E
$greenDark = [System.Drawing.Color]::FromArgb(15, 46, 27)  # #0F2E1B
$glow = [System.Drawing.Color]::FromArgb(168, 196, 147)    # #A8C493

function New-Icon([int]$size, [double]$fit, [string]$out) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear($green)
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $tw = [int]($size * $fit)
    $th = [int]($tw * $logo.Height / $logo.Width)
    $x = [int](($size - $tw) / 2)
    $y = [int](($size - $th) / 2)
    $g.DrawImage($logo, $x, $y, $tw, $th)
    $logo.Dispose(); $g.Dispose()
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    "  $out ($size x $size, fit $fit)"
}

# Iconos cuadrados: normal (logo al 80% del ancho) y maskable (55%, zona segura ~20%).
New-Icon 192 0.80 (Join-Path $root 'icon-192.png')
New-Icon 512 0.80 (Join-Path $root 'icon-512.png')
New-Icon 512 0.55 (Join-Path $root 'icon-512-maskable.png')

# Portada Open Graph 1200x630: degradado verde + título serif + subtítulo + logo.
$W = 1200; $H = 630
$og = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($og)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $greenDark, $green, 35.0)
$g.FillRectangle($brush, $rect)
$accentBrush = New-Object System.Drawing.SolidBrush($glow)
$g.FillRectangle($accentBrush, 0, ($H - 12), $W, 12)
$logo = [System.Drawing.Image]::FromFile($logoPath)
$lw = 300; $lh = [int]($lw * $logo.Height / $logo.Width)
$g.DrawImage($logo, 80, 70, $lw, $lh)
$logo.Dispose()
$titleFont = New-Object System.Drawing.Font('Georgia', 76, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Regular)
$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$glowBrush = New-Object System.Drawing.SolidBrush($glow)
# Símbolos por código (mojibake si van literales en PS 5.1 ANSI).
$dot = [char]0x00B7; $dash = [char]0x2014; $u = [char]0x00FC
$g.DrawString('Descubre Bareyo', $titleFont, $white, 76, 300)
$g.DrawString("Rutas $dot Patrimonio $dot Playas $dot Tours 360 $dash Cantabria", $subFont, $glowBrush, 82, 430)
$subFont2 = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Regular)
$g.DrawString("Ajo $dot Bareyo $dot G$($u)emes", $subFont2, $white, 82, 490)
$g.Dispose()
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 88L)
$og.Save((Join-Path $root 'og-cover.jpg'), $enc, $params)
$og.Dispose()
"  $(Join-Path $root 'og-cover.jpg') (1200 x 630)"
"DONE"
