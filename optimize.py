import os
import glob
from PIL import Image

image_dir = 'images'
html_file = 'index.html'

with open(html_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

for root, dirs, files in os.walk(image_dir):
    for file in files:
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            full_path = os.path.join(root, file)
            # Create webp equivalent
            webp_path = os.path.splitext(full_path)[0] + '.webp'
            try:
                img = Image.open(full_path)
                img.save(webp_path, 'webp', quality=80)
                
                # Replace in HTML
                # Handle path formatting (convert \\ to /)
                old_html_path = full_path.replace('\\', '/')
                new_html_path = webp_path.replace('\\', '/')
                
                # Because HTML uses relative paths, we need to match exactly
                # Just replacing the extension is safer
                old_ext = os.path.splitext(file)[1]
                
                print(f"Converted {full_path} to {webp_path}")
            except Exception as e:
                print(f"Failed to convert {full_path}: {e}")

# Simple HTML replacement for specific known paths
html_content = html_content.replace('.JPG', '.webp').replace('.jpg', '.webp').replace('.png', '.webp')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

print("HTML updated.")
