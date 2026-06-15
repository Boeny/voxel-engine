import math

from .const import LY_TO_KM


def get_diameter_km(distance_km, diameter_mas):
    return distance_km * diameter_mas * math.pi / 648000000.0


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


def get_star_output(simbad_data: list[dict], radius: float):
    if (len(simbad_data) > 1):
        simbad_data.sort(key=lambda d: d['mespos'])

    return {
        **simbad_data[0],
        'radius': radius or get_radius(simbad_data),
    }


def merge_star(existing_star: dict, new_star: dict | None):
    if not new_star:
        return existing_star

    # Merge existing star with new star, prioritizing new star's data
    merged_star = {**existing_star, **new_star}

    # number params
    for param in ['radius', 'temperature', 'distance_ly', 'ascension', 'declination']:
        if merged_star.get(param) is None:
            print(merged_star)
        if not merged_star.get(param) or merged_star[param] == 0.0:
            merged_star[param] = existing_star.get(param, 0.0)

    # text params

    for param in ['name', 'spectral_type']:
        if not merged_star[param]:
            merged_star[param] = existing_star.get(param, '')

    return merged_star
