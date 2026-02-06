
Add-Type -AssemblyName System.Drawing

function Fix-Icon {
    param (
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        Write-Host "File not found: $Path"
        return
    }

    try {
        # Load the image (even if extension is wrong, .NET usually handles it)
        $originalImage = [System.Drawing.Image]::FromFile($Path)
        
        # Calculate new dimensions (Square 1024x1024)
        $targetSize = 1024
        $newBitmap = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
        $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
        
        # High quality settings
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        # Calculate scaling to fit within 1024x1024 while maintaining aspect ratio
        $ratioX = $targetSize / $originalImage.Width
        $ratioY = $targetSize / $originalImage.Height
        $ratio = [Math]::Min($ratioX, $ratioY)

        $newWidth = [int]($originalImage.Width * $ratio)
        $newHeight = [int]($originalImage.Height * $ratio)

        # Center the image
        $posX = [int](($targetSize - $newWidth) / 2)
        $posY = [int](($targetSize - $newHeight) / 2)

        # Fill background with white (optional, or transparent)
        # Expo icons usually have no transparency if they are adaptive background? 
        # But foreground should have transparency?
        # If the original was a JPG, it has no transparency. 
        # Let's fill with white to be safe, or leave transparent?
        # If we leave transparent, the empty areas will be transparent.
        # But since the original is JPG, it has a background.
        # Let's just draw it.
        
        $graphics.DrawImage($originalImage, $posX, $posY, $newWidth, $newHeight)

        $originalImage.Dispose()
        $graphics.Dispose()

        # Save as PNG
        $newBitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
        $newBitmap.Dispose()

        Write-Host "Successfully fixed icon: $Path"
    }
    catch {
        Write-Host "Error fixing icon: $_"
    }
}

Fix-Icon -Path "c:\Users\USER\Desktop\hanmotors\driver-app\assets\icon.png"
Fix-Icon -Path "c:\Users\USER\Desktop\hanmotors\customer-app\assets\icon.png"
