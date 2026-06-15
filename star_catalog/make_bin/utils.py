import math
import struct

from star_catalog.fetch_stars.const import SUN_TEMPERATURE


def save_to_binary(data, file_path, fields):
    # Формат 'f' означает 32-bit float (4 байта) на поле
    star_format = ''.join(['f' for _ in fields])

    with open(file_path, 'wb') as file:  # Важно: режим 'wb' (запись байт)
        for star in data:
            data_bytes = struct.pack(
                star_format,
                *[float(star[field]) for field in fields]
            )
            file.write(data_bytes)

    print(f"Бинарный файл сохранен. Размер: {len(data) * len(fields) * 4 / 1024 / 1024:.2f} МБ")


# Catalog units: rightAscension in hours[0, 24), declination in degrees[-90, 90]
# Convert to radians before trig
def spherical_to_cartesian(ra_hours, dec_degrees, distance):
    # 24h = 2π, 360° = 2π, так что делим на 12 и 180 соответственно
    right_ascension = (ra_hours * math.pi) / 12.0
    declination = (dec_degrees * math.pi) / 180.0
    cos_declination = math.cos(declination)

    x = distance * cos_declination * math.cos(right_ascension)
    y = distance * cos_declination * math.sin(right_ascension)
    z = distance * math.sin(declination)

    return x, y, z


# // Tanner Helland's approximation: blackbody temperature → sRGB chromaticity (normalized so brightest channel = 1)
# // Это эмпирический полиномиальный/логарифмический фит Tanner Helland (2012). Алгоритм такой:

# //   1. По закону Планка B(λ,T) = (2hc²/λ⁵) / (exp(hc/(λkT)) - 1) посчитать спектральную светимость
# //   2. Свернуть с функциями цветового сложения CIE 1931 → XYZ
# //   3. XYZ → sRGB через стандартную матрицу + gamma
# //   4. Стабулировать для T от 1000K до 40000K
# //   5. Натянуть простые функции (степенные, логарифмические) на каждый канал методом наименьших квадратов

# // Все длинные числа 329.698..., 99.470... и т.д. — коэффициенты регрессии.
# // Отдельного физического смысла нет, вместе они аппроксимируют дорогой интеграл.

# //   Разбор по числам

# //   const t = kelvin / 100;
# //   Нормировка масштаба: 5800K → 58. Фит был натянут в этой шкале, иначе экспоненты были бы другими.

# //   Граничные точки

# //   - t = 66 (= 6600K) — главный перелом.
# // Спектр пика излучения переходит из красно-зелёной области в сине-фиолетовую. Ниже — красный канал упёрт в 255, выше — красный
# //    начинает падать.
# //   Физика: закон Вина даёт пик при λ = 2898/T мкм·K. При T=6600K λ_max ≈ 440 нм (синий). Выше — пик уходит дальше в УФ.
# //   - t = 19 (= 1900K) — ниже этой температуры синяя компонента уже неотличима от нуля (М-карлики, коричневые карлики). Захардкожено b = 0.

# //   Красный

# //   t ≤ 66: r = 255            // насыщен
# //   t > 66: r = 329.698... * pow(t - 60, -0.1332...)
# //   - -60 — сдвиг (фит точнее работает не от точки 66, а от 60).
# //   - Отрицательная степень → r убывает с ростом T.
# //   - При t=100 (10000K): r = 329.7 · 40^(-0.1332) ≈ 200 → синевато-белая звезда.

# //   Зелёный

# //   t ≤ 66: g = 99.470... * log(t) - 161.119...   // логарифмический рост
# //   t > 66: g = 288.122... * pow(t - 60, -0.0755...) // лёгкое снижение
# //   - В диапазоне 1000K (t=10): g ≈ 99.47·ln(10) − 161 ≈ 67 → мало зелёного, доминирует красный
# //   - При t=58 (~Sun): g ≈ 99.47·ln(58) − 161 ≈ 243 → почти полный зелёный, белый цвет с лёгкой желтизной
# //   - Выше 6600K — зелёный медленно проседает (очень малая отрицательная степень -0.0755)

# //   Синий

# //   t < 19:  b = 0
# //   19 < t < 66: b = 138.517... * log(t - 10) - 305.044...
# //   t ≥ 66:  b = 255            // насыщен
# //   - -10 — сдвиг, чтобы избежать log(0) около нижней границы и аккуратно зафитить начало кривой.
# //   - При t=30 (3000K, M-class): b ≈ 138.5·ln(20) − 305 ≈ 110 → почти весь синий вырезан, цвет красно-оранжевый.
# //   - При t=58 (Sun): b ≈ 138.5·ln(48) − 305 ≈ 232 → почти насыщен, делает Солнце белым.

# //   Конвертация в линейный RGB

# //   return new Vector3(Math.pow(sR, 2.2), ...);
# // Степень 2.2 — gamma approximation для sRGB → linear.
# // Точная формула сложнее (с линейным участком возле нуля), но 2.2 — стандартное приближение в graphics для
# //   blackbody-цветов где значения далеки от нуля.

# //   Ограничения

# //   - Точность ~1% от истинной линии Планка на CIE-диаграмме (для практического применения сильно избыточно)
# //   - За пределами 1000K…40000K фит начинает врать (но реальных звёзд там почти нет)
# //   - Альтернативы: таблица Mitchell Charity (точнее, но громоздко), прямой интеграл по Планку (медленно),
# // полиномиальный фит Krystek (другие коэффициенты)

# //   В графике/симуляциях (KSP, Universe Sandbox, NASA visualizations) обычно используют именно Helland —
# // компромисс между точностью и стоимостью.
def temperature_to_linear_rgb(kelvin):
    t = kelvin / 100.0
    # Расчет R
    r = 255.0 if t <= 66 else 329.698727446 * ((t - 60.0) ** -0.1332047592)
    # Расчет G
    if t <= 66:
        g = 99.4708025861 * math.log(t) - 161.1195681661 if t > 0 else 0
    else:
        g = 288.1221695283 * ((t - 60.0) ** -0.0755148492)
    # Расчет B
    if t >= 66:
        b = 255.0
    elif t <= 19:
        b = 0.0
    else:
        b = 138.5177312231 * math.log(t - 10.0) - 305.0447927307

    sr = max(0.0, min(255.0, r)) / 255.0
    sg = max(0.0, min(255.0, g)) / 255.0
    sb = max(0.0, min(255.0, b)) / 255.0

    # sRGB -> linear (gamma 2.2)
    return sr ** 2.2, sg ** 2.2, sb ** 2.2


def convert_star_to_decart(stars):
    converted = []
    for star in stars:
        x, y, z = spherical_to_cartesian(star['ascension'], star['declination'], star['distance_ly'])
        r, g, b = temperature_to_linear_rgb(star['temperature'])
        print(r, g, b)

        luminosity = pow(star['temperature'] / SUN_TEMPERATURE, 4)  # Относительно Солнца
        converted.append({
            'x': x,
            'y': y,
            'z': z,
            'r': r,
            'g': g,
            'b': b,
            'luminosity': luminosity,
            'radius': star['radius'],
        })
    return converted
