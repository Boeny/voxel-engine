SUN_RADIUS_KM = 695700
LY_TO_KM = 9.461e+12
SUN_TEMPERATURE = 5778

# 1 parsec = 3.26156 light years; parallax in mas → distance = 1000/plx parsecs
# more parallax = nearer star
PARALLAX_DIAPAZONES: list[list[int]] = [
    [60],
    [50, 60],
    [45, 50],
    [40, 45],
    [37, 40],
    [35, 37],
    [33, 35],
    [32, 33],
    [31, 32],
    [30, 31],
    [29, 30],
    [28, 29],
    [27.5, 28],
    [27, 27.5],
    [26.5, 27],
    [26, 26.5],
    [25.5, 26],
    [25, 25.5],
    [24.5, 25],
    [24, 24.5],
    [23.75, 24],
    [23.5, 23.75],
    [23.25, 23.5],
    [23, 23.25],
    [22.75, 23],
    [22.5, 22.75],
    [22.25, 22.5],
    [22, 22.25],
    [21.75, 22],
    [21.5, 21.75],
    [21.25, 21.5],
    [21, 21.25],
    [20.75, 21],
    [20.5, 20.75],
]

MANUAL_STARS = [
    {
        'name': 'Sun',
        'gaia_id': 'manual_sun',
        'ascension': 0,
        'declination': 0,
        'distance_ly': 0,
        'spectral_type': 'G2V',
        'temperature': 5778,
        'radius': SUN_RADIUS_KM,
    },
    {
        'name': 'Alpha Centauri A',
        'gaia_id': 'manual_alpha_centauri_a',
        'ascension': 14.6601,
        'declination': -60.8339,
        'distance_ly': 4.37,
        'temperature': 5790,
        'radius': 1.217 * SUN_RADIUS_KM,
        'spectral_type': 'G2V'
    },
    {
        'name': 'Alpha Centauri B',
        'gaia_id': 'manual_alpha_centauri_b',
        'ascension': 14.6597,
        'declination': -60.8375,
        'distance_ly': 4.37,
        'temperature': 5260,
        'radius': 0.863 * SUN_RADIUS_KM,
        'spectral_type': 'K1V'
    },
    {
        'name': 'Luhman 16 A (WISE 1049−5319)',
        'gaia_id': 'manual_luhman_16_a',
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
        'gaia_id': 'manual_luhman_16_b',
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
        'gaia_id': 'manual_wise_0855-0714',
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
        'gaia_id': 'manual_sirius_a',
        'ascension': 6.7525,
        'declination': -16.7161,
        'distance_ly': 8.6,
        'temperature': 9940,
        'radius': 1.711 * SUN_RADIUS_KM,
        'spectral_type': 'A0V'
    },
    {
        'name': 'Sirius B',
        'gaia_id': 'manual_sirius_b',
        'ascension': 6.7525,
        'declination': -16.7161,
        'distance_ly': 8.6,
        'temperature': 25000,
        'radius': 0.0084 * SUN_RADIUS_KM,  # White dwarf, size of Earth
        'spectral_type': 'DA2'
    },
    {
        'name': 'Vega',
        'gaia_id': 'manual_vega',
        'ascension': 18.6156,
        'declination': 38.7836,
        'distance_ly': 25.04,
        'temperature': 9602,
        'radius': 2.362 * SUN_RADIUS_KM,
        'spectral_type': 'A0V'
    },
    {
        'name': 'Arcturus',
        'gaia_id': 'manual_arcturus',
        'ascension': 14.2611,
        'declination': 19.1824,
        'distance_ly': 36.7,
        'temperature': 4286,
        'radius': 25.4 * SUN_RADIUS_KM,  # Orange giant!
        'spectral_type': 'K1.5III'
    },
    {
        'name': 'Rigel',
        'gaia_id': 'manual_rigel',
        'ascension': 5.2423,
        'declination': -8.2016,
        'distance_ly': 860.0,
        'temperature': 12100,
        'radius': 78.9 * SUN_RADIUS_KM,  # Blue supergiant
        'spectral_type': 'B8Ia'
    },
    {
        'name': 'Betelgeuse',
        'gaia_id': 'manual_betelgeuse',
        'ascension': 5.9195,
        'declination': 7.4070,
        'distance_ly': 642.0,
        'temperature': 3500,
        'radius': 887.0 * SUN_RADIUS_KM,  # Monsterous red supergiant
        'spectral_type': 'M1-M2Ia-ab'
    },
    {
        'name': 'Canopus',
        'gaia_id': 'manual_canopus',
        'ascension': 6.3992,
        'declination': -52.6957,
        'distance_ly': 310.0,
        'temperature': 7350,
        'radius': 71.0 * SUN_RADIUS_KM,
        'spectral_type': 'A9II'
    },
    {
        'name': 'Capella',
        'gaia_id': 'manual_capella',
        'ascension': 5.2781,
        'declination': 45.9979,
        'distance_ly': 42.9,
        'temperature': 4970,
        'radius': 11.98 * SUN_RADIUS_KM,
        'spectral_type': 'G3III'
    }
]
