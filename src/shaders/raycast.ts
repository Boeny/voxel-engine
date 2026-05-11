export const raycastVert = `
uniform vec3 position;
uniform float radius;
uniform float uAtmosphereHeight;

varying vec2 vNdc;

void main() {
    float boundingRadius = radius + uAtmosphereHeight;
    // position is camera-relative (camera at origin), so apply only rotation (w=0)
    vec3 centerView = (viewMatrix * vec4(position, 0.0)).xyz;

    // Camera inside bounding sphere → fullscreen quad fallback
    if (length(centerView) < boundingRadius) {
        gl_Position = vec4(position.xy, 1.0, 1.0);
        vNdc = position.xy;
        return;
    }

    // Camera-aligned billboard at planet center, size = 2 * boundingRadius
    vec3 cornerView = centerView + vec3(position.xy * boundingRadius, 0.0);
    vec4 clipPosition = projectionMatrix * vec4(cornerView, 1.0);
    // Pin to far plane to bypass camera.far clipping (depthTest is off anyway)
    clipPosition.z = clipPosition.w;
    gl_Position = clipPosition;
    vNdc = clipPosition.xy / clipPosition.w;
}
`;

export const raycastFrag = `
precision highp float;

#define PI 3.14159265359

varying vec2 vNdc;
uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;

uniform vec3  sunDirection; // from planet to star (for atmosphere scattering)
uniform float sunLuminosity;

uniform vec3  position;
uniform float radius;
uniform float angle;
uniform vec3  axis;
uniform sampler2D uEarthTexture;

uniform float uAtmosphereHeight;
uniform int atmSteps;
uniform int secondAtmSteps;
uniform vec3  uRayleighBeta;
uniform float uRayleighScaleHeight;
uniform float uMieBetaScattering;
uniform float uMieBetaAbsorption;
uniform float uMieScaleHeight;
uniform float uMiePreferredScatteringDirection;

// ── Feature toggles (controlled at runtime via UI checkboxes) ─────
uniform bool useAtmosphere;
uniform bool uUseMie;
uniform bool useTransmittance;

// ── Geometry ──────────────────────────────────────────────────────

// Precision-stable sphere intersection (camera-relative: camera = origin)
vec2 intersectSphere(vec3 ro, vec3 rd, float sr) {
    vec3 oc = ro - position;
    float b = dot(oc, rd);
    float len = length(oc);
    float c = (len + sr) * (len - sr);
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

float getAltitude(vec3 p) {
    return length(p - position) - radius;
}

// Rodrigues rotation: rotate v around unit axis by angle
vec3 rotateAround(vec3 v, vec3 axis, float angle) {
    float c = cos(angle), s = sin(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

// Equirectangular UV for arbitrary rotation axis
vec2 getPlanetUV(vec3 hitPos) {
    vec3 n = normalize(rotateAround(hitPos - position, axis, -angle));
    float cosLat = dot(n, axis);
    float texV = acos(clamp(cosLat, -1.0, 1.0)) / PI;
    vec3 ref = abs(axis.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 prime = normalize(ref - axis * dot(ref, axis));
    vec3 east = cross(prime, axis);
    vec3 perp = n - axis * cosLat;
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

// Optical depths along the sun ray from startPos
vec3 sunOpticalDepth(vec3 startPos, float stepSize) {
    float rOD = 0.0, mOD = 0.0;
    vec3 pos = startPos;

    for (int j = 0; j < secondAtmSteps; j++) {
        float h = max(0.0, getAltitude(pos));
        rOD += rayleighDensity(h) * stepSize;
        if (uUseMie) mOD += mieDensity(h) * stepSize;
        pos += sunDirection * stepSize;
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
    float uAtmosphereRadius = uAtmosphereHeight + radius;

    float stepSize = distThrough / float(atmSteps);
    vec3 pos = rayPos + rayDir * (distToAtm + stepSize * 0.5);

    for (int i = 0; i < atmSteps; i++) {
        float h = max(0.0, getAltitude(pos));
        float hr = rayleighDensity(h) * stepSize;
        float hm = uUseMie ? mieDensity(h) * stepSize : 0.0;

        outRayleighOD += hr;
        outMieOD      += hm;

        // How much sunlight reaches this sample point
        vec3 sunOD;
        vec2 shadowHit = intersectSphere(pos, sunDirection, radius);
        if (shadowHit.x <= 0.0) {
            vec2 lightAtmHit = intersectSphere(pos, sunDirection, uAtmosphereRadius);
            float lightStep = max(0.0, lightAtmHit.y) / float(secondAtmSteps);
            sunOD = sunOpticalDepth(pos + sunDirection * lightStep * 0.5, lightStep);

            vec3 atten = useTransmittance ? transmittance(
                outRayleighOD + sunOD.x,
                outMieOD      + sunOD.y
            ) : vec3(1.0);

            outRayleigh += hr * atten;
            if (uUseMie) outMie += hm * atten;
        }

        pos += rayDir * stepSize;
    }
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
    vec2 planetHit = intersectSphere(rayPos, rayDir, radius);
    if (planetHit.x > 0.0) {
        hitGround = true;
        tGround = planetHit.x;
    } else if (planetHit.y > 0.0 && getAltitude(rayPos) < 0.0) {
        hitGround = true;
        tGround = planetHit.y;
    }

    // Atmosphere segment along ray
    float distToAtm = 0.0, distThrough = 0.0;
    float uAtmosphereRadius = uAtmosphereHeight + radius;
    vec2 atmHit = intersectSphere(rayPos, rayDir, uAtmosphereRadius);

    if (atmHit.y > 0.0) {
        distToAtm = max(0.0, atmHit.x);
        distThrough = atmHit.y - distToAtm;
        if (hitGround) distThrough = min(distThrough, tGround - distToAtm);
        distThrough = max(0.0, distThrough);
    }

    // Ray missed bounding sphere → no planet, no atmosphere → let stars show through
    if (!hitGround && distThrough <= 0.0) discard;

    vec3 totalR = vec3(0.0), totalM = vec3(0.0);
    float rOD = 0.0;
    float mOD = 0.0;

    if (useAtmosphere && distThrough > 0.0) {
        sampleAtmosphere(rayPos, rayDir, distToAtm, distThrough, totalR, totalM, rOD, mOD);
    }

    // Phase functions
    float cosTheta = dot(rayDir, sunDirection);
    float phaseR = 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
    float phaseM = 1.0;
    if (uUseMie) {
        float g = uMiePreferredScatteringDirection, g2 = g * g;
        phaseM = 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + cosTheta * cosTheta))
               / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
    }

    vec3 atmColor = totalR * uRayleighBeta * phaseR;
    if (uUseMie) atmColor += totalM * uMieBetaScattering * phaseM;
    atmColor *= sunLuminosity;

    vec3 viewTr = useTransmittance ? transmittance(rOD, mOD) : vec3(1.0);
    vec3 finalColor = vec3(0.0);

    if (hitGround) {
        vec3 hitPos = rayPos + rayDir * tGround;
        vec3 normal = normalize(hitPos - position);
        if (getAltitude(rayPos) < 0.0) normal = -normal;

        vec3 groundColor = texture2D(uEarthTexture, getPlanetUV(hitPos)).rgb;

        // Sun transmittance to this ground point
        vec3 sunTr = useAtmosphere ? vec3(0.0) : vec3(1.0);
        vec2 gPlanetHit = intersectSphere(hitPos + normal * 0.01, sunDirection, radius);
        if (useAtmosphere && gPlanetHit.x <= 0.0) {
            vec2 gAtmHit = intersectSphere(hitPos, sunDirection, uAtmosphereRadius);
            float glStep = max(0.0, gAtmHit.y) / 4.0;
            if (glStep > 0.0) {
                vec3 glOD = sunOpticalDepth(hitPos + sunDirection * glStep * 0.5, glStep);
                sunTr = useTransmittance ? transmittance(glOD.x, glOD.y) : vec3(1.0);
            }
        }

        float sunDotN = dot(normal, sunDirection);
        sunTr *= smoothstep(-0.08, 0.12, sunDotN); // soft terminator

        finalColor += viewTr * (groundColor * sunTr * max(sunDotN, 0.0) * sunLuminosity);
    }
    if (useAtmosphere) {
        finalColor += atmColor;
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
