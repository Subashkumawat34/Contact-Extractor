from PIL import Image, ImageDraw, ImageFont
import sys

img = Image.new('RGB', (400, 100), color=(255, 255, 255))
d = ImageDraw.Draw(img)

try:
    font = ImageFont.truetype("arial.ttf", 24)
except IOError:
    font = ImageFont.load_default()

d.text((20, 30), "+91 9876543210", fill=(0, 0, 0), font=font)

img.save('test.png')
print("test.png generated successfully.")
