#!/usr/bin/env python3
"""
Convertir img/relogo.jpeg a favicon.ico con múltiples tamaños.
Uso:
  python3 convert_favicon.py
Requisitos: Pillow
  python3 -m pip install --user Pillow

Genera: favicon.ico en la raíz del proyecto.
"""
from PIL import Image
import sys

SRC = 'img/relogo.jpeg'
OUT = 'favicon.ico'
SIZES = [(16,16),(32,32),(48,48),(64,64)]

try:
    im = Image.open(SRC).convert('RGBA')
except FileNotFoundError:
    print(f"Error: no se encontró {SRC}. Asegúrate de estar en la carpeta del proyecto.")
    sys.exit(1)

# Pillow guarda múltiples tamaños si se pasa la opción sizes
im.save(OUT, format='ICO', sizes=SIZES)
print(f'Generado {OUT} con tamaños: {SIZES}')
