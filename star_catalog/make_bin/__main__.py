#!/usr/bin/env python3
from ..const import DEST_BIN_PATH, DEST_JSON_PATH, TMP_JSON_PATH
from ..utils import loadJSON, saveJSON

from .utils import convert_star_to_decart, save_to_binary


existing_data = loadJSON(TMP_JSON_PATH)
if existing_data is None:
    print(f"File {TMP_JSON_PATH} not found!")
    exit(1)
else:
    print(f"Загружено существующих звезд из файла: {len(existing_data)}")

save_to_binary(
    convert_star_to_decart(existing_data),
    DEST_BIN_PATH,
    ['x', 'y', 'z', 'r', 'g', 'b', 'luminosity', 'radius']
)

json_data = {}
for i in range(len(existing_data)):
    star = existing_data[i]

    json_data[i] = {
        'name': star['name'],
        'spectral_type': star['spectral_type'],
    }

saveJSON(DEST_JSON_PATH, json_data)
