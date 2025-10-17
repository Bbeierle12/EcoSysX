"""
Generate Windows .ico file from SVG icon for EcoSysX GUI
This script converts the app.svg to app.ico with multiple resolutions
"""

import os
import sys
from pathlib import Path

def generate_ico_from_svg():
    """Generate .ico file from SVG using various methods"""
    
    script_dir = Path(__file__).parent
    icons_dir = script_dir.parent / "resources" / "icons"
    svg_path = icons_dir / "app.svg"
    ico_path = icons_dir / "app.ico"
    
    if not svg_path.exists():
        print(f"Error: SVG file not found at {svg_path}")
        return False
    
    print(f"Converting {svg_path} to {ico_path}")
    
    # Try using Pillow with cairosvg
    try:
        from PIL import Image
        import cairosvg
        import io
        
        # Generate PNG at various sizes and combine into ICO
        sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        images = []
        
        for size in sizes:
            png_data = cairosvg.svg2png(
                url=str(svg_path),
                output_width=size[0],
                output_height=size[1]
            )
            img = Image.open(io.BytesIO(png_data))
            images.append(img)
        
        # Save as ICO with all sizes
        images[0].save(
            ico_path,
            format='ICO',
            sizes=sizes,
            append_images=images[1:]
        )
        
        print(f"✓ Successfully created {ico_path}")
        return True
        
    except ImportError as e:
        print(f"Warning: Could not import required libraries: {e}")
        print("\nTo generate the .ico file, install dependencies:")
        print("  pip install pillow cairosvg")
        print("\nAlternatively, you can:")
        print("  1. Open resources/icons/app.svg in GIMP, Inkscape, or online converter")
        print("  2. Export as .ico with sizes: 16, 32, 48, 64, 128, 256")
        print("  3. Save as resources/icons/app.ico")
        return False
    
    except Exception as e:
        print(f"Error during conversion: {e}")
        return False

if __name__ == "__main__":
    success = generate_ico_from_svg()
    sys.exit(0 if success else 1)
