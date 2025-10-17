"""
Create a simple placeholder Windows .ico file for EcoSysX GUI
This creates a basic icon that can be replaced with a better version later
"""

from PIL import Image, ImageDraw, ImageFont
import os
from pathlib import Path

def create_placeholder_ico():
    """Create a simple colored icon with 'X' text"""
    
    script_dir = Path(__file__).parent
    icons_dir = script_dir.parent / "resources" / "icons"
    ico_path = icons_dir / "app.ico"
    
    # Create images at multiple sizes for ICO format
    sizes = [16, 32, 48, 64, 128, 256]
    images = []
    
    for size in sizes:
        # Create new image with transparency
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Draw green circular background
        margin = size // 16
        draw.ellipse(
            [margin, margin, size - margin, size - margin],
            fill=(46, 125, 50, 255),  # Green color
            outline=(27, 94, 32, 255),
            width=max(1, size // 64)
        )
        
        # Draw white 'X' in the center
        font_size = size // 2
        try:
            # Try to use a nice font if available
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
        
        # Draw the 'X'
        text = "X"
        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - bbox[1]
        
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
        
        images.append(img)
    
    # Save as ICO with all sizes
    images[0].save(
        ico_path,
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=images[1:]
    )
    
    print(f"✓ Successfully created {ico_path}")
    print("\nThis is a placeholder icon. For a better quality icon:")
    print("  1. Open qt-gui/resources/icons/app.svg in a vector graphics editor")
    print("  2. Export as .ico with multiple sizes (16, 32, 48, 64, 128, 256)")
    print("  3. Or use an online converter like https://convertio.co/svg-ico/")
    return True

if __name__ == "__main__":
    try:
        create_placeholder_ico()
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
