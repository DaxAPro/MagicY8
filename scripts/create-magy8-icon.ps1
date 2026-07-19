$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $projectRoot "public"
$pngPath = Join-Path $publicDir "magy8-icon.png"
$icoPath = Join-Path $publicDir "magy8-icon.ico"

Add-Type -AssemblyName System.Drawing

$size = 256
$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(3, 7, 18))

$rect = New-Object System.Drawing.Rectangle 16, 16, 224, 224
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $rect,
  [System.Drawing.Color]::FromArgb(124, 58, 237),
  [System.Drawing.Color]::FromArgb(8, 145, 178),
  45
)
$graphics.FillEllipse($brush, $rect)

$spark = New-Object System.Drawing.Drawing2D.GraphicsPath
$points = @(
  [System.Drawing.Point]::new(133, 31),
  [System.Drawing.Point]::new(95, 111),
  [System.Drawing.Point]::new(50, 111),
  [System.Drawing.Point]::new(110, 148),
  [System.Drawing.Point]::new(85, 221),
  [System.Drawing.Point]::new(151, 132),
  [System.Drawing.Point]::new(199, 132),
  [System.Drawing.Point]::new(145, 96),
  [System.Drawing.Point]::new(174, 31)
)
$spark.AddPolygon($points)
$sparkBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle 50, 31, 149, 190),
  [System.Drawing.Color]::FromArgb(255, 247, 237),
  [System.Drawing.Color]::FromArgb(103, 232, 249),
  80
)
$graphics.FillPath($sparkBrush, $spark)

$font = New-Object System.Drawing.Font "Segoe UI", 54, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString("Y8", $font, $textBrush, (New-Object System.Drawing.RectangleF 0, 154, 256, 72), $format)

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create($icoPath)
$icon.Save($stream)
$stream.Close()

$graphics.Dispose()
$bitmap.Dispose()
$icon.Dispose()

Write-Output $icoPath
