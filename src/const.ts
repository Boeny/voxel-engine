/* eslint-disable import/no-unused-modules */
export const LY_TO_KM = 9.461e12;

// G * M_sun in km³/s² — for Kepler's third law (orbital angular velocity ω = sqrt(GM / r³))
export const SUN_GM = 1.32712e11;
export const SUN_TEMPERATURE = 5778;

// Accelerate orbital motion so orbits are visible. Earth period at scale 1e6 ≈ 30s of game time.
export const ORBIT_TIME_SCALE = 1e6;

export const NEAR_CULLING = 0.1;
export const FAR_CULLING = 1;
