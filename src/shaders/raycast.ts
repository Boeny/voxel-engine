export const raycastVert = `
varying vec2 vNdc;
void main() {
    vNdc = position.xy;
    gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const raycastFrag = `
precision highp float;

#define PI 3.14159265359

varying vec2 vNdc;
uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;

uniform vec3  uSunDirection;
uniform float uSunIntensity;
uniform float uSunAngularRadius;

uniform vec3  uPlanetCenter;
uniform float uPlanetRadius;
uniform float uAtmosphereRadius;
uniform float uPlanetAngle;
uniform vec3  uPlanetAxis;
uniform sampler2D uEarthTexture;

uniform int   atmSteps;
uniform float uSkyBrightness;

uniform vec3  uRayleighBeta;
uniform float uRayleighScaleHeight;
uniform float uRayleighOpticalDepthDistance;

uniform vec3  uMieBetaScattering;
uniform float uMieBetaAbsorption;
uniform float uMieScaleHeight;
uniform float uMiePreferredScatteringDirection;

// ── Feature toggles (controlled at runtime via UI checkboxes) ─────
uniform bool uUseMie;
uniform bool uUseStars;
// ─────────────────────────────────────────────────────────────────

// ── Geometry ──────────────────────────────────────────────────────

// Precision-stable sphere intersection (camera-relative: camera = origin)
vec2 intersectSphere(vec3 ro, vec3 rd, float sr) {
    vec3 oc = ro - uPlanetCenter;
    float b = dot(oc, rd);
    float len = length(oc);
    float c = (len + sr) * (len - sr);
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

float getAltitude(vec3 p) {
    return length(p - uPlanetCenter) - uPlanetRadius;
}

// Rodrigues rotation: rotate v around unit axis by angle
vec3 rotateAround(vec3 v, vec3 axis, float angle) {
    float c = cos(angle), s = sin(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

// Equirectangular UV for arbitrary rotation axis
vec2 getPlanetUV(vec3 hitPos) {
    vec3 n = normalize(rotateAround(hitPos - uPlanetCenter, uPlanetAxis, uPlanetAngle));
    float cosLat = dot(n, uPlanetAxis);
    float texV = acos(clamp(cosLat, -1.0, 1.0)) / PI;
    vec3 ref = abs(uPlanetAxis.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 prime = normalize(ref - uPlanetAxis * dot(ref, uPlanetAxis));
    vec3 east = cross(prime, uPlanetAxis);
    vec3 perp = n - uPlanetAxis * cosLat;
    float texU = 0.5 + atan(dot(perp, east), dot(perp, prime)) / (2.0 * PI);
    return vec2(texU, texV);
}

// ── Density profiles ──────────────────────────────────────────────

float rayleighDensity(float h) { return exp(-h / uRayleighScaleHeight); }
float mieDensity(float h)      { return exp(-h / uMieScaleHeight); }

// ── Transmittance ─────────────────────────────────────────────────

// Beer-Lambert extinction from optical depth components (r, m)
vec3 transmittance(float rOD, float mOD) {
    vec3 tau = uRayleighBeta * rOD;
    if (uUseMie) tau += uMieBetaScattering * (1.0 + uMieBetaAbsorption) * mOD;
    return exp(-max(vec3(0.0), tau));
}

// Optical depths along the sun ray from startPos (4 fixed light steps)
vec3 sunOpticalDepth(vec3 startPos, float stepSize) {
    float rOD = 0.0, mOD = 0.0;
    vec3 pos = startPos;
    for (int j = 0; j < 4; j++) {
        float h = max(0.0, getAltitude(pos));
        rOD += rayleighDensity(h) * stepSize;
        if (uUseMie   ) mOD += mieDensity(h)   * stepSize;
        pos += uSunDirection * stepSize;
    }
    return vec3(rOD, mOD, 0.0);
}

// ── Atmosphere raymarch ───────────────────────────────────────────

void sampleAtmosphere(
    vec3 rayPos, vec3 rayDir,
    float distToAtm, float distThrough,
    out vec3 outRayleigh, out vec3 outMie,
    out float outRayleighOD, out float outMieOD
) {
    outRayleigh = vec3(0.0);
    outMie = vec3(0.0);
    outRayleighOD = 0.0;
    outMieOD = 0.0;

    float stepSize = distThrough / float(atmSteps);
    vec3 pos = rayPos + rayDir * (distToAtm + stepSize * 0.5);

    for (int i = 0; i < 32; i++) {
        if (i >= atmSteps) break;

        float h = max(0.0, getAltitude(pos));
        float hr = rayleighDensity(h) * stepSize;
        float hm = uUseMie    ? mieDensity(h)   * stepSize : 0.0;

        outRayleighOD += hr;
        outMieOD      += hm;

        // How much sunlight reaches this sample point
        vec2 lightAtmHit = intersectSphere(pos, uSunDirection, uAtmosphereRadius);
        float lightStep = max(0.0, lightAtmHit.y) / 4.0;
        vec3 sunOD = sunOpticalDepth(pos + uSunDirection * lightStep * 0.5, lightStep);

        vec3 atten = transmittance(
            outRayleighOD + sunOD.x,
            outMieOD      + sunOD.y
        );
        outRayleigh += hr * atten;
        if (uUseMie ) outMie += hm * atten;

        pos += rayDir * stepSize;
    }
}

// ── Stars ─────────────────────────────────────────────────────────

float getStars(vec3 rd) {
    vec3 a = abs(rd);
    vec2 uv; float faceId;
    if      (a.x >= a.y && a.x >= a.z) { uv = rd.yz / a.x; faceId = rd.x > 0.0 ? 1.0 : 2.0; }
    else if (a.y >= a.x && a.y >= a.z) { uv = rd.xz / a.y; faceId = rd.y > 0.0 ? 3.0 : 4.0; }
    else                                { uv = rd.xy / a.z; faceId = rd.z > 0.0 ? 5.0 : 6.0; }

    vec2 grid = uv * 75.0;
    vec2 cellUv = fract(grid);
    float seed = dot(vec3(floor(grid), faceId), vec3(12.9898, 78.233, 45.164));
    float val = fract(sin(seed) * 43758.5453);
    if (val > 0.978) {
        vec2 sp = vec2(fract(sin(seed * 1.1) * 43758.5), fract(sin(seed * 1.2) * 43758.5));
        return smoothstep(0.12, 0.0, length(cellUv - sp)) * (val - 0.978) * 80.0;
    }
    return 0.0;
}

// ── Sun disk ──────────────────────────────────────────────────────
// Sharp physical disk only — glow/corona comes from Mie forward scattering in atmColor.

vec3 getSunDisk(float cosTheta) {
    float a = acos(clamp(cosTheta, -1.0, 1.0));
    // Limb darkening: solar limb is ~40% dimmer than center
    float mu = max(0.0, 1.0 - a / uSunAngularRadius);
    float limb = 0.4 + 0.6 * sqrt(mu);
    float disk = smoothstep(uSunAngularRadius * 1.001, uSunAngularRadius * 0.999, a);
    return vec3(1.0, 0.97, 0.88) * disk * limb * uSunIntensity * 40.0;
}

// ── Main ──────────────────────────────────────────────────────────

void main() {
    // Ray from camera (camera-relative rendering: camera = origin)
    vec4 vp = projectionMatrixInverse * vec4(vNdc, -1.0, 1.0);
    vp /= vp.w;
    vec3 rayDir = normalize((viewMatrixInverse * vec4(vp.xyz, 0.0)).xyz);
    vec3 rayPos = vec3(0.0);

    // Ground intersection
    bool hitGround = false;
    float tGround = -1.0;
    vec2 planetHit = intersectSphere(rayPos, rayDir, uPlanetRadius);
    if (planetHit.x > 0.0) {
        hitGround = true;
        tGround = planetHit.x;
    } else if (planetHit.y > 0.0 && getAltitude(rayPos) < 0.0) {
        hitGround = true;
        tGround = planetHit.y;
    }

    // Atmosphere segment along ray
    float distToAtm = 0.0, distThrough = 0.0;
    vec2 atmHit = intersectSphere(rayPos, rayDir, uAtmosphereRadius);
    if (atmHit.y > 0.0) {
        distToAtm = max(0.0, atmHit.x);
        distThrough = atmHit.y - distToAtm;
        if (hitGround) distThrough = min(distThrough, tGround - distToAtm);
        distThrough = max(0.0, distThrough);
    }

    // Atmosphere scatter
    vec3 totalR = vec3(0.0), totalM = vec3(0.0);
    float rOD = 0.0;
    float mOD = 0.0;

    if (distThrough > 0.0) {
        sampleAtmosphere(rayPos, rayDir, distToAtm, distThrough, totalR, totalM, rOD, mOD);
    }

    // Phase functions
    float cosTheta = dot(rayDir, uSunDirection);
    float phaseR = 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
    float phaseM = 1.0;
    if (uUseMie ) {
        float g = uMiePreferredScatteringDirection, g2 = g * g;
        phaseM = 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + cosTheta * cosTheta))
               / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
    }

    vec3 atmColor = totalR * uRayleighBeta * phaseR;
    if (uUseMie ) atmColor += totalM * uMieBetaScattering * phaseM;
    atmColor *= uSunIntensity * uSkyBrightness;

    vec3 viewTr = transmittance(rOD, mOD);
    vec3 finalColor = atmColor;

    if (hitGround) {
        vec3 hitPos = rayPos + rayDir * tGround;
        vec3 normal = normalize(hitPos - uPlanetCenter);
        if (getAltitude(rayPos) < 0.0) normal = -normal;

        vec3 groundColor = texture2D(uEarthTexture, getPlanetUV(hitPos)).rgb;

        // Sun transmittance to this ground point
        vec3 sunTr = vec3(0.0);
        vec2 gPlanetHit = intersectSphere(hitPos + normal * 0.01, uSunDirection, uPlanetRadius * 0.999);
        if (gPlanetHit.x <= 0.0) {
            vec2 gAtmHit = intersectSphere(hitPos, uSunDirection, uAtmosphereRadius);
            float glStep = max(0.0, gAtmHit.y) / 4.0;
            if (glStep > 0.0) {
                vec3 glOD = sunOpticalDepth(hitPos + uSunDirection * glStep * 0.5, glStep);
                sunTr = transmittance(glOD.x, glOD.y);
            }
        }

        float sunDotN = dot(normal, uSunDirection);
        sunTr *= smoothstep(-0.08, 0.12, sunDotN); // soft terminator

        vec3 litGround = atmColor * 0.6                                            // sky ambient
            + groundColor * sunTr * max(sunDotN, 0.0) * uSunIntensity * 0.8;     // direct sun

        finalColor = litGround * viewTr + atmColor;
    } else {
        if (uUseStars ) {
            float stars = getStars(rayDir) * smoothstep(0.1, 0.01, dot(atmColor, vec3(0.333)));
            finalColor += vec3(stars);
        }

        // sqrt(viewTr): preserves red tint at sunset while keeping disk visible
        vec3 sunDiskTr = max(sqrt(viewTr), vec3(0.04, 0.01, 0.002));
        finalColor += getSunDisk(cosTheta) * sunDiskTr;
    }

    finalColor = 1.0 - exp(-finalColor);
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
