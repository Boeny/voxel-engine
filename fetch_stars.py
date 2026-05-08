#!/usr/bin/env python3

import json
import math
from astroquery.simbad import Simbad
from astroquery.gaia import Gaia


OUTPUT = 'src/data/stars.json'

PARALLAX_TRESHOLD = 60  # in mas, corresponds to ~54 light years
SUN_RADIUS_KM = 695700
LY_TO_KM = 9.461e+12

SUN = {
    'name': 'Sun',
    'right_ascension': 0,
    'declination': 0,
    'distance_ly': 0,
    'spectral_type': 'G2V',
    'temperature': 5778,
    'radius': SUN_RADIUS_KM,
    'parallax': 0.0,
}
bright_stars_manual = [
    {
        'name': 'Alpha Centauri A',
        'gaia_id': 'manual',
        'ascension': 14.6601,
        'declination': -60.8339,
        'distance_ly': 4.37,
        'temperature': 5790,
        'radius': 1.217 * SUN_RADIUS_KM,
        'spectral_type': 'G2V'
    },
    {
        'name': 'Alpha Centauri B',
        'gaia_id': 'manual',
        'ascension': 14.6597,
        'declination': -60.8375,
        'distance_ly': 4.37,
        'temperature': 5260,
        'radius': 0.863 * SUN_RADIUS_KM,
        'spectral_type': 'K1V'
    },
    {
        'name': 'Luhman 16 A (WISE 1049−5319)',
        'gaia_id': 'manual',
        'ascension': 10.8219,
        'declination': -53.3154,
        'distance_ly': 6.53,
        'temperature': 1350,
        'radius': 0.084 * SUN_RADIUS_KM,  # Brown dwarfs are about the size of Jupiter, which is ~0.1 Sun radius
        'spectral_type': 'L7.5',
        'object_type': 'BD*'
    },
    {
        'name': 'Luhman 16 B (WISE 1049−5319)',
        'gaia_id': 'manual',
        'ascension': 10.8219,
        'declination': -53.3195,  # The shift is minimal since they are a binary system
        'distance_ly': 6.50,
        'temperature': 1210,
        'radius': 0.082 * SUN_RADIUS_KM,
        'spectral_type': 'T0.5',
        'object_type': 'BD*'
    },
    {
        'name': 'WISE 0855-0714',
        'gaia_id': 'manual',
        'ascension': 8.9212,
        'declination': -7.2471,
        'distance_ly': 7.43,
        'temperature': 250,  # This is -23 degrees Celsius!
        'radius': 0.095 * SUN_RADIUS_KM,  # Approximately the size of Jupiter
        'spectral_type': 'Y2',
        'object_type': 'BrD'  # Brown Dwarf
    },
    {
        'name': 'Sirius A',
        'gaia_id': 'manual',
        'ascension': 6.7525,
        'declination': -16.7161,
        'distance_ly': 8.6,
        'temperature': 9940,
        'radius': 1.711 * SUN_RADIUS_KM,
        'spectral_type': 'A0V'
    },
    {
        'name': 'Sirius B',
        'gaia_id': 'manual',
        'ascension': 6.7525,
        'declination': -16.7161,
        'distance_ly': 8.6,
        'temperature': 25000,
        'radius': 0.0084 * SUN_RADIUS_KM,  # White dwarf, size of Earth
        'spectral_type': 'DA2'
    },
    {
        'name': 'Vega',
        'gaia_id': 'manual',
        'ascension': 18.6156,
        'declination': 38.7836,
        'distance_ly': 25.04,
        'temperature': 9602,
        'radius': 2.362 * SUN_RADIUS_KM,
        'spectral_type': 'A0V'
    },
    {
        'name': 'Arcturus',
        'gaia_id': 'manual',
        'ascension': 14.2611,
        'declination': 19.1824,
        'distance_ly': 36.7,
        'temperature': 4286,
        'radius': 25.4 * SUN_RADIUS_KM,  # Orange giant!
        'spectral_type': 'K1.5III'
    },
    {
        'name': 'Rigel',
        'gaia_id': 'manual',
        'ascension': 5.2423,
        'declination': -8.2016,
        'distance_ly': 860.0,
        'temperature': 12100,
        'radius': 78.9 * SUN_RADIUS_KM,  # Blue supergiant
        'spectral_type': 'B8Ia'
    },
    {
        'name': 'Betelgeuse',
        'gaia_id': 'manual',
        'ascension': 5.9195,
        'declination': 7.4070,
        'distance_ly': 642.0,
        'temperature': 3500,
        'radius': 887.0 * SUN_RADIUS_KM,  # Monsterous red supergiant
        'spectral_type': 'M1-M2Ia-ab'
    },
    {
        'name': 'Canopus',
        'gaia_id': 'manual',
        'ascension': 6.3992,
        'declination': -52.6957,
        'distance_ly': 310.0,
        'temperature': 7350,
        'radius': 71.0 * SUN_RADIUS_KM,
        'spectral_type': 'A9II'
    },
    {
        'name': 'Capella',
        'gaia_id': 'manual',
        'ascension': 5.2781,
        'declination': 45.9979,
        'distance_ly': 42.9,
        'temperature': 4970,
        'radius': 11.98 * SUN_RADIUS_KM,
        'spectral_type': 'G3III'
    }
]


# 1 parsec = 3.26156 light years; parallax in mas → distance = 1000/plx parsecs
def parallax_to_light_years(parallax_mas):
    if parallax_mas and parallax_mas > 0:
        return 1000.0 / parallax_mas * 3.26156
    return 0.0


def get_diameter_km(distance_km, diameter_mas):
    return distance_km * diameter_mas * math.pi / 648000000.0


def safe_float(value):
    try:
        result = float(value)
        return 0.0 if math.isnan(result) else result
    except (TypeError, ValueError):
        return 0.0


def get_right_ascention_h(ascension):
    return safe_float(ascension) / 15.0


def get_gaia_id(source_id):
    return f'Gaia DR3 {source_id}'


def get_radius(data: list[dict]):
    stars_with_diameter = list(filter(lambda d: d['diameter'] > 0, data))
    if len(stars_with_diameter) == 0:
        return 0.0

    star = stars_with_diameter[0]
    unit = star['unit']
    distance_km = star['distance_ly'] * LY_TO_KM
    diameter = star['diameter']

    if (unit == 'mas'):
        diameter = get_diameter_km(distance_km, diameter)

    return diameter / 2.0


def get_star_item(star: dict, gaia_id: str):
    parallax = safe_float(star.get('parallax'))

    return {
        'gaia_id': gaia_id,
        'name': star.get('name', '').replace('NAME ', '').replace('* ', '').replace('  ', ' ').strip(),
        # Convert RA from degrees to hours (15° = 1h, 360/24 = 15), keep Dec in degrees
        'ascension': get_right_ascention_h(star['right_ascension']),
        'declination': safe_float(star['declination']),
        'distance_ly': parallax_to_light_years(parallax),
        'temperature': safe_float(star.get('temperature')),
        'spectral_type': star.get('spectral_type', ''),
        'object_type': star.get('object_type', ''),
        'radius': safe_float(star.get('sun_radiuses')) * SUN_RADIUS_KM,
        'diameter': safe_float(star.get('diameter')),
        'unit': str(star.get('unit', '')).strip(),
        'parallax': parallax,
        'mespos': safe_float(star.get('mespos')),
    }


def get_star_output(simbad_data: list[dict], radius: float):
    if (len(simbad_data) > 1):
        simbad_data.sort(key=lambda d: d['mespos'])

    return {
        **simbad_data[0],
        'radius': radius or get_radius(simbad_data),
    }


def get_gaia_data(parallax_threshold):
    job = Gaia.launch_job(f"""
        SELECT TOP 2000
            gs.source_id,
            gs.ra as right_ascension,
            gs.dec as declination,
            gs.parallax,
            ap.radius_gspphot as sun_radiuses,
            ap.teff_gspphot as temperature,
            gs.pmra as self_motion_ra,
            gs.pmdec as self_motion_dec,
            gs.visibility_periods_used as visibility_periods_count,
            gs.astrometric_matched_transits as transits_count,
            gs.phot_g_mean_mag as star_magnitude_g, -- main 564nm
            gs.phot_bp_mean_mag as star_magnitude_bp, -- blue 445nm
            gs.phot_rp_mean_mag as star_magnitude_rp, -- red 658nm
            gs.bp_rp as color_index,
            gs.azero_gspphot as interstellar_extinction
        FROM gaiadr3.gaia_source AS gs
        LEFT JOIN gaiadr3.astrophysical_parameters AS ap ON gs.source_id = ap.source_id
        WHERE gs.parallax > {parallax_threshold}
        ORDER BY gs.parallax DESC
    """)
    results = job.get_results()
    print(f'Gaia query returned {len(results)} rows')

    output = {}
    for star in results:
        gaia_id = get_gaia_id(star['source_id'])
        data = get_star_item(star, gaia_id)

        # gaia has only unique data per star
        output[gaia_id] = data

    return output


def get_simbad_data(parallax_threshold):
    results = Simbad.query_tap(f"""
        SELECT
            i.id AS gaia_id,
            b.main_id as name,
            b.ra as right_ascension,
            b.dec as declination,
            b.sp_type as spectral_type,
            b.otype as object_type,
            b.plx_value as parallax,
            m.diameter,
            m.unit,
            m.mespos -- 0 is the only one, 1 is the best measured, >= 2 are less reliable
        FROM basic AS b
        JOIN ident AS i ON b.oid = i.oidref
        LEFT JOIN mesDiameter AS m ON b.oid = m.oidref
        WHERE b.plx_value > {parallax_threshold} AND b.otype NOT IN ('Pl', 'Pl?') -- exclude planets
        ORDER BY parallax DESC
    """)
    print(f'Simbad query returned {len(results)} rows')
    # fe.teff as temperature
    # LEFT JOIN mesFe_h AS fe ON b.oid = fe.oidref
    output = {}
    for star in results:
        gaia_id = star['gaia_id']
        data = get_star_item(star, gaia_id)

        if (output.get(gaia_id)):
            output[gaia_id].append(data)
        else:
            output[gaia_id] = [data]

    return output


def get_unique_key(star):
    return str(round(star['distance_ly'], 6))


def main():
    gaia_output = get_gaia_data(PARALLAX_TRESHOLD)
    simbad_output = get_simbad_data(PARALLAX_TRESHOLD)

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

    output = [SUN]
    bright_stars_manual.extend(unique.values())
    output.extend(sorted(bright_stars_manual, key=lambda x: x['distance_ly']))

    # --- output

    print(f'Total: {len(output)}')

    with open(OUTPUT, 'w') as file:
        json.dump(output, file, indent=2, ensure_ascii=False)

    print(f'\nWritten to {OUTPUT}')


main()
