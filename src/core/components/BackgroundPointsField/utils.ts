import { Vector3 } from 'three';

import { SUN_TEMPERATURE } from '@/const';
import starsData from '@/data/stars.json';
import { pow4 } from '@/utils/math';

import { BackgroundPoint } from './types';

// Tanner Helland's approximation: blackbody temperature → sRGB chromaticity (normalized so brightest channel = 1)
// Это эмпирический полиномиальный/логарифмический фит Tanner Helland (2012). Алгоритм такой:

//   1. По закону Планка B(λ,T) = (2hc²/λ⁵) / (exp(hc/(λkT)) - 1) посчитать спектральную светимость
//   2. Свернуть с функциями цветового сложения CIE 1931 → XYZ
//   3. XYZ → sRGB через стандартную матрицу + gamma
//   4. Стабулировать для T от 1000K до 40000K
//   5. Натянуть простые функции (степенные, логарифмические) на каждый канал методом наименьших квадратов

// Все длинные числа 329.698..., 99.470... и т.д. — коэффициенты регрессии.
// Отдельного физического смысла нет, вместе они аппроксимируют дорогой интеграл.

//   Разбор по числам

//   const t = kelvin / 100;
//   Нормировка масштаба: 5800K → 58. Фит был натянут в этой шкале, иначе экспоненты были бы другими.

//   Граничные точки

//   - t = 66 (= 6600K) — главный перелом.
// Спектр пика излучения переходит из красно-зелёной области в сине-фиолетовую. Ниже — красный канал упёрт в 255, выше — красный
//    начинает падать.
//   Физика: закон Вина даёт пик при λ = 2898/T мкм·K. При T=6600K λ_max ≈ 440 нм (синий). Выше — пик уходит дальше в УФ.
//   - t = 19 (= 1900K) — ниже этой температуры синяя компонента уже неотличима от нуля (М-карлики, коричневые карлики). Захардкожено b = 0.

//   Красный

//   t ≤ 66: r = 255            // насыщен
//   t > 66: r = 329.698... * pow(t - 60, -0.1332...)
//   - -60 — сдвиг (фит точнее работает не от точки 66, а от 60).
//   - Отрицательная степень → r убывает с ростом T.
//   - При t=100 (10000K): r = 329.7 · 40^(-0.1332) ≈ 200 → синевато-белая звезда.

//   Зелёный

//   t ≤ 66: g = 99.470... * log(t) - 161.119...   // логарифмический рост
//   t > 66: g = 288.122... * pow(t - 60, -0.0755...) // лёгкое снижение
//   - В диапазоне 1000K (t=10): g ≈ 99.47·ln(10) − 161 ≈ 67 → мало зелёного, доминирует красный
//   - При t=58 (~Sun): g ≈ 99.47·ln(58) − 161 ≈ 243 → почти полный зелёный, белый цвет с лёгкой желтизной
//   - Выше 6600K — зелёный медленно проседает (очень малая отрицательная степень -0.0755)

//   Синий

//   t < 19:  b = 0
//   19 < t < 66: b = 138.517... * log(t - 10) - 305.044...
//   t ≥ 66:  b = 255            // насыщен
//   - -10 — сдвиг, чтобы избежать log(0) около нижней границы и аккуратно зафитить начало кривой.
//   - При t=30 (3000K, M-class): b ≈ 138.5·ln(20) − 305 ≈ 110 → почти весь синий вырезан, цвет красно-оранжевый.
//   - При t=58 (Sun): b ≈ 138.5·ln(48) − 305 ≈ 232 → почти насыщен, делает Солнце белым.

//   Конвертация в линейный RGB

//   return new Vector3(Math.pow(sR, 2.2), ...);
// Степень 2.2 — gamma approximation для sRGB → linear.
// Точная формула сложнее (с линейным участком возле нуля), но 2.2 — стандартное приближение в graphics для
//   blackbody-цветов где значения далеки от нуля.

//   Ограничения

//   - Точность ~1% от истинной линии Планка на CIE-диаграмме (для практического применения сильно избыточно)
//   - За пределами 1000K…40000K фит начинает врать (но реальных звёзд там почти нет)
//   - Альтернативы: таблица Mitchell Charity (точнее, но громоздко), прямой интеграл по Планку (медленно),
// полиномиальный фит Krystek (другие коэффициенты)

//   В графике/симуляциях (KSP, Universe Sandbox, NASA visualizations) обычно используют именно Helland —
// компромисс между точностью и стоимостью.
function temperatureToLinearRGB(kelvin: number): Vector3 {
  const t = kelvin / 100;

  let r: number;
  if (t <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }

  let g: number;
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  let b: number;
  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  const sR = Math.max(0, Math.min(255, r)) / 255;
  const sG = Math.max(0, Math.min(255, g)) / 255;
  const sB = Math.max(0, Math.min(255, b)) / 255;

  // sRGB → linear (gamma 2.2 approximation)
  return new Vector3(Math.pow(sR, 2.2), Math.pow(sG, 2.2), Math.pow(sB, 2.2));
}

// Catalog units: rightAscension in hours [0, 24), declination in degrees [-90, 90].
// Convert to radians before trig.
function sphericalToCartesian(rightAscensionHours: number, declinationDegrees: number, distance: number): Vector3 {
  const rightAscension = (rightAscensionHours * Math.PI) / 12; // 24h = 2π
  const declination = (declinationDegrees * Math.PI) / 180;

  const cosDeclination = Math.cos(declination);

  return new Vector3(
    distance * cosDeclination * Math.cos(rightAscension),
    distance * cosDeclination * Math.sin(rightAscension),
    distance * Math.sin(declination),
  );
}

export function parseStarCatalog(offset = new Vector3()): BackgroundPoint[] {
  return starsData.map((star, index) => {
    const temperature = star.temperature || SUN_TEMPERATURE;
    const temperatureRatio = temperature / SUN_TEMPERATURE;

    return {
      id: index,
      type: 'background',
      name: star.name,
      position: sphericalToCartesian(star.ascension, star.declination, star.distance_ly).add(offset),
      color: temperatureToLinearRGB(temperature),
      luminosity: pow4(temperatureRatio),
      radius: star.radius,
    };
  });
}
