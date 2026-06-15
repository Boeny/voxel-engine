#!/usr/bin/env python3
from ..const import TMP_JSON_PATH
from ..utils import loadJSON, saveJSON

from .catalog_utils import get_gaia_data, get_simbad_data
from .const import MANUAL_STARS, PARALLAX_DIAPAZONES
from .utils import get_star_output, merge_star


def main(parallax_threshold: list[int]):
    existing_data = loadJSON(TMP_JSON_PATH)
    if existing_data is None:
        print(f"File {TMP_JSON_PATH} will be created")
    else:
        print(f"Загружено существующих звезд из файла: {len(existing_data)}")

    gaia_output = get_gaia_data(parallax_threshold)
    simbad_output = get_simbad_data(parallax_threshold)

    unique = {}
    for gaia_id, gaia_data in gaia_output.items():
        item = gaia_data
        simbad_data = simbad_output.get(gaia_id)
        if simbad_data:
            item = {
                **get_star_output(simbad_data, gaia_data['radius']),
                'distance_ly': gaia_data['distance_ly'],
                'temperature': gaia_data['temperature'],
            }
        unique[gaia_id] = item

    # rewrite existing data
    for existing_star in existing_data:
        unique[existing_star['gaia_id']] = merge_star(existing_star, unique.get(existing_star['gaia_id']))

    # rewrite manual bright stars
    for bright_star in MANUAL_STARS:
        unique[bright_star['gaia_id']] = merge_star(bright_star, unique.get(bright_star['gaia_id']))

    result = sorted(unique.values(), key=lambda x: x['distance_ly'])
    print(f'Total: {len(result)}')

    saveJSON(TMP_JSON_PATH, result)


# -------------------------

for parallax_threshold in PARALLAX_DIAPAZONES:
    print(f'\nFetching stars with parallax > {parallax_threshold[0]} mas...')
    main(parallax_threshold)
