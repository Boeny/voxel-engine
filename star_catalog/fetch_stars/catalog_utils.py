import math
import urllib.request
import requests
import ssl

from astroquery.gaia import Gaia
from astroquery.simbad import Simbad

from .const import SUN_RADIUS_KM

# 1. Отключаем проверку для стандартного ssl контекста (помогло для Gaia)
ssl._create_default_https_context = ssl._create_unverified_context

# 2. Отключаем проверку для urllib (нужно для pyvo / Simbad)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
urllib.request.install_opener(urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx)))

# 3. На всякий случай отключаем верификацию в requests и скрываем предупреждения
requests.packages.urllib3.disable_warnings()
original_request = requests.Session.request


def patched_request(self, method, url, *args, **kwargs):
    kwargs['verify'] = False
    return original_request(self, method, url, *args, **kwargs)


requests.Session.request = patched_request

# -------------------------------------------


def get_gaia_data(parallax_threshold: list[int]):
    results = []
    condition = get_condition('gs.parallax', parallax_threshold)

    try:
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
            WHERE {condition}
            ORDER BY gs.parallax DESC
        """)
        results = job.get_results()
    except Exception as e:
        print(f'Error fetching Gaia data: {e}')
        return {}

    print(f'Gaia query returned {len(results)} rows')

    output = {}
    for star in results:
        gaia_id = f'Gaia DR3 {star["source_id"]}'
        data = get_star_item(star, gaia_id)

        # gaia has only unique data per star
        output[gaia_id] = data

    return output


def get_simbad_data(parallax_threshold: list[int]):
    results = []
    condition = get_condition('b.plx_value', parallax_threshold)

    try:
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
            WHERE {condition} AND b.otype NOT IN ('Pl', 'Pl?') -- exclude planets
            ORDER BY parallax DESC
        """)
    except Exception as e:
        print(f'Error fetching Simbad data: {e}')
        return {}

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


def get_condition(field, parallax_threshold: list[int]):
    if len(parallax_threshold) == 1:
        return f'{field} > {parallax_threshold[0]}'
    else:
        return f'{field} > {parallax_threshold[0]} AND {field} <= {parallax_threshold[1]}'


def get_star_item(star: dict, gaia_id: str):
    parallax = safe_float(star.get('parallax'))

    return {
        'gaia_id': gaia_id,
        'name': star.get('name', gaia_id).replace('NAME ', '').replace('* ', '').replace('  ', ' ').strip(),
        # Convert RA from degrees to hours (15° = 1h, 360/24 = 15), keep Dec in degrees
        'ascension': safe_float(star['right_ascension']) / 15.0,
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


def safe_float(value):
    try:
        result = float(value)
        return 0.0 if math.isnan(result) else result
    except (TypeError, ValueError):
        return 0.0


def parallax_to_light_years(parallax_mas):
    if parallax_mas and parallax_mas > 0:
        return 1000.0 / parallax_mas * 3.26156
    return 0.0
