export const raycastVert = `
varying vec2 vNdc;
void main() {
    vNdc = position.xy;
    gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const raycastFrag = `
precision highp float;

varying vec2 vNdc;
uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;

uniform vec3 uSunDirection;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform float uAtmosphereRadius;
uniform float uSkyBrightness;
uniform float uPlanetAngle;
uniform int atmSteps;

uniform vec3 uOzoneBeta;
uniform float uOzoneCenterHeight;
uniform float uOzoneThickness;
uniform float uOzoneIntensity;

uniform vec3 uRayleighBeta;
uniform vec3 uMieBeta;
uniform float uRayleighScaleHeight;
uniform float uMieScaleHeight;
uniform float uMiePreferredScatteringDirection;
uniform float uSunIntensity;
uniform float uAtmosphereRaymarchDistance;

// A highly precise intersection for the planet to avoid float32 catastrophic cancellation
vec2 intersectPlanetSphere(vec3 r0, vec3 rd, float sr) {
    vec3 oc = r0 - uPlanetCenter;
    float b = dot(oc, rd);
    float srSqDiff = uPlanetRadius * uPlanetRadius - sr * sr;
    float c = oc.x * oc.x + oc.z * oc.z + r0.y * r0.y + 2.0 * r0.y * uPlanetRadius + srSqDiff;
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

float getAltitude(vec3 p) {
    vec3 oc = p - uPlanetCenter;
    float c = oc.x * oc.x + oc.z * oc.z + p.y * p.y + 2.0 * p.y * uPlanetRadius;
    return c / (length(oc) + uPlanetRadius);
}

// Procedural Stars (Stable Cubemap Grid)
// Convert world ray direction to a cubemap face UV to make a fixed grid
float getGeneratedStars(vec3 rayDir) {
    vec3 absDir = abs(rayDir);
    vec2 starUv = vec2(0.0);
    float faceId = 0.0;

    if (absDir.x >= absDir.y && absDir.x >= absDir.z) {
        starUv = rayDir.yz / absDir.x;
        faceId = rayDir.x > 0.0 ? 1.0 : 2.0;
    } else if (absDir.y >= absDir.x && absDir.y >= absDir.z) {
        starUv = rayDir.xz / absDir.y;
        faceId = rayDir.y > 0.0 ? 3.0 : 4.0;
    } else {
        starUv = rayDir.xy / absDir.z;
        faceId = rayDir.z > 0.0 ? 5.0 : 6.0;
    }

    // Grid setup: 150x150 cells per face. Total 6 faces * 150^2 = 135,000 cells.
    vec2 starGrid = starUv * 75.0; // (-1 to 1) * 75 = range 150
    vec2 cellId = floor(starGrid);
    vec2 cellUv = fract(starGrid);

    // Seed based on cell ID and face ID
    float seed = dot(vec3(cellId, faceId), vec3(12.9898, 78.233, 45.164));
    float starVal = fract(sin(seed) * 43758.5453);

    float stars = 0.0;
    // 3000 stars / 135000 cells = 0.022 probability -> top 2.2%
    if (starVal > 0.978) {
        // Random point inside the cell
        vec2 starPos = vec2(
            fract(sin(seed * 1.1) * 43758.5),
            fract(sin(seed * 1.2) * 43758.5)
        );
        float dist = length(cellUv - starPos);
        // smoothstep gives the star anti-aliased edges and a soft glow
        stars = smoothstep(0.12, 0.0, dist) * (starVal - 0.978) * 80.0;
    }

    return stars;
}

// Realistic Small Sun & Corona
// Real sun angular radius is ~0.265 degrees (0.0046 radians)
vec3 getSunDisk(float cosTheta) {
    float angularDist = acos(clamp(cosTheta, -1.0, 1.0));
    float sunAngularRadius = 0.0046;

    // Sharp core of the sun
    float core = smoothstep(sunAngularRadius + 0.0002, sunAngularRadius, angularDist);

    // Physical corona (glows just outside the sun, visible during eclipses / in space)
    // Uses an inverse square falloff for realistic light scattering
    float distToSun = max(0.0, angularDist - sunAngularRadius);

    // Inner intense corona
    float innerCorona = 0.00005 / (distToSun * distToSun + 0.00005);

    // Outer softer glow
    float outerCorona = 0.0005 / (distToSun * distToSun + 0.005);

    // Combine lighting elements (core is extremely bright)
    float totalSunLight = (core * 30.0) + (innerCorona * 1.5) + (outerCorona * 0.5);

    // Slightly warm tint for the sun
    vec3 sunBaseColor = vec3(1.0, 0.98, 0.95);
    vec3 sunRays = sunBaseColor * totalSunLight * uSunIntensity;

    return sunRays;
}

void main() {
    // Calculate precise ray direction per pixel to avoid interpolation distortion
    vec4 viewPos = projectionMatrixInverse * vec4(vNdc, -1.0, 1.0);
    viewPos /= viewPos.w;
    vec3 rayDir = normalize((viewMatrixInverse * vec4(viewPos.xyz, 0.0)).xyz);
    vec3 rayPos = cameraPosition;

    // 1. Ground Intersection (Spherical Planet)
    bool hitGround = false;
    float tGround = -1.0;

    vec2 planetHit = intersectPlanetSphere(rayPos, rayDir, uPlanetRadius);
    if (planetHit.x > 0.0) {
        hitGround = true;
        tGround = planetHit.x;
    } else if (planetHit.y > 0.0 && getAltitude(rayPos) < 0.0) {
        // Camera is underground
        hitGround = true;
        tGround = planetHit.y;
    }

    // 2. Atmosphere Bounds
    vec2 atmHit = intersectPlanetSphere(rayPos, rayDir, uAtmosphereRadius);

    float distToAtmosphere = 0.0;
    float distThroughAtmosphere = 0.0;

    if (atmHit.y > 0.0) {
        distToAtmosphere = max(0.0, atmHit.x);
        distThroughAtmosphere = atmHit.y - distToAtmosphere;
        if (hitGround) {
            distThroughAtmosphere = min(distThroughAtmosphere, tGround - distToAtmosphere);
        }
        distThroughAtmosphere = max(0.0, distThroughAtmosphere);
    }

    // 3. Raymarch Atmosphere
    vec3 totalRayleigh = vec3(0.0);
    vec3 totalMie = vec3(0.0);
    float rayleighOpticalDepth = 0.0;
    float mieOpticalDepth = 0.0;
    float ozoneOpticalDepth = 0.0;

    // Optimization: Skip full raymarch if distance is very short (e.g. looking straight down)
    if (distThroughAtmosphere > uAtmosphereRaymarchDistance) {
        int numSteps = 16;
        int numLightSteps = 4;
        float stepSize = distThroughAtmosphere / float(numSteps);
        vec3 samplePoint = rayPos + rayDir * (distToAtmosphere + stepSize * 0.5);

        for (int i = 0; i < atmSteps; i++) {
            float height = getAltitude(samplePoint);
            if (height < 0.0) height = 0.0;

            float hr = exp(-height / uRayleighScaleHeight) * stepSize;
            float hm = exp(-height / uMieScaleHeight) * stepSize;
            float ho = max(0.0, 1.0 - abs(height - uOzoneCenterHeight) / (uOzoneThickness * 0.5)) * stepSize;

            rayleighOpticalDepth += hr;
            mieOpticalDepth += hm;
            ozoneOpticalDepth += ho;

            vec2 lightAtmHit = intersectPlanetSphere(samplePoint, uSunDirection, uAtmosphereRadius);
            float lightStepSize = max(0.0, lightAtmHit.y) / float(numLightSteps);
            vec3 lightSamplePoint = samplePoint + uSunDirection * (lightStepSize * 0.5);
            float lightRayleighOpticalDepth = 0.0;
            float lightMieOpticalDepth = 0.0;
            float lightOzoneOpticalDepth = 0.0;

            bool inShadow = false;
            // Use 0.999 radius to prevent self-shadowing artifacts (black bands)
            vec2 lightPlanetHit = intersectPlanetSphere(samplePoint, uSunDirection, uPlanetRadius * 0.999);
            if (lightPlanetHit.x > 0.0) inShadow = true;

            if (!inShadow && lightStepSize > 0.0) {
                for (int j = 0; j < 4; j++) {
                    float lightHeight = getAltitude(lightSamplePoint);
                    if (lightHeight < 0.0) lightHeight = 0.0;
                    lightRayleighOpticalDepth += exp(-lightHeight / uRayleighScaleHeight) * lightStepSize;
                    lightMieOpticalDepth += exp(-lightHeight / uMieScaleHeight) * lightStepSize;
                    lightSamplePoint += uSunDirection * lightStepSize;
                    lightOzoneOpticalDepth += max(0.0, 1.0 - abs(lightHeight - uOzoneCenterHeight) / (uOzoneThickness * 0.5)) * lightStepSize;
                }

                vec3 tau = uRayleighBeta * (rayleighOpticalDepth + lightRayleighOpticalDepth)
                    + uMieBeta * (mieOpticalDepth + lightMieOpticalDepth)
                    + uOzoneBeta * (ozoneOpticalDepth + lightOzoneOpticalDepth) * uOzoneIntensity;

                tau = max(vec3(0.0), tau);
                vec3 attenuation = exp(-tau);
                totalRayleigh += hr * attenuation;
                totalMie += hm * attenuation;
            }
            samplePoint += rayDir * stepSize;
        }
    }

    float cosTheta = dot(rayDir, uSunDirection);
    float cosTheta2 = cosTheta * cosTheta;
    float phaseRayleigh = 3.0 / (16.0 * 3.14159) * (1.0 + cosTheta2);
    float mieD = uMiePreferredScatteringDirection;
    float mieD2 = mieD * mieD;
    float phaseMie = 3.0 / (8.0 * 3.14159) * ((1.0 - mieD2) * (1.0 + cosTheta2)) / ((2.0 + mieD2) * pow(1.0 + mieD2 - 2.0 * mieD * cosTheta, 1.5));

    // Calculate sun visibility at the middle of the ray through the atmosphere
    vec3 midPoint = rayPos + rayDir * (distToAtmosphere + distThroughAtmosphere * 0.5);
    float midSunVisibility = smoothstep(-0.15, 0.05, dot(normalize(midPoint - uPlanetCenter), uSunDirection));

    vec3 atmosphereColor = (totalRayleigh * uRayleighBeta * phaseRayleigh + totalMie * uMieBeta * phaseMie) * uSunIntensity;
    atmosphereColor *= uSkyBrightness;

    // Fake multiple scattering to prevent completely black horizon
    // It adds blueish ambient light where there's dense atmosphere
    float fakeAmbient = clamp(rayleighOpticalDepth / 100000.0, 0.0, 1.0) * midSunVisibility;
    atmosphereColor += vec3(0.02, 0.05, 0.1) * fakeAmbient * uSunIntensity * uSkyBrightness;

    vec3 viewTransmittance = exp(-(uRayleighBeta * rayleighOpticalDepth + uMieBeta * mieOpticalDepth + uOzoneBeta * ozoneOpticalDepth * uOzoneIntensity));
    vec3 finalColor = atmosphereColor;

    if (hitGround) {
        vec3 hitPos = rayPos + rayDir * tGround;

        // Spherical normal
        vec3 normal = normalize(hitPos - uPlanetCenter);
        bool isUnderground = getAltitude(rayPos) < 0.0;
        if (isUnderground) {
            normal = -normal;
        }

        float distanceFade = clamp(tGround / 500.0, 0.0, 1.0);

        // rotation
        vec3 localPos = hitPos - uPlanetCenter;
        float cA = cos(-uPlanetAngle);
        float sA = sin(-uPlanetAngle);
        vec2 rotXZ = vec2(
            localPos.x * cA - localPos.z * sA,
            localPos.x * sA + localPos.z * cA
        );

        float rawChecker = mod(floor(rotXZ.x) + floor(rotXZ.y), 2.0);
        float checker = mix(rawChecker, 0.5, distanceFade);

        vec3 baseColor = !isUnderground ? vec3(0.25, 0.6, 0.15) : vec3(0.4, 0.25, 0.15); // Brighter green
        vec3 groundColor = baseColor * (0.8 + 0.2 * checker);

        float groundLightRayleigh = 0.0;
        float groundLightMie = 0.0;
        vec2 groundLightAtmHit = intersectPlanetSphere(hitPos, uSunDirection, uAtmosphereRadius);
        float groundLightOzone = 0.0;

        float glStepSize = max(0.0, groundLightAtmHit.y) / 4.0;
        vec3 glSample = hitPos + uSunDirection * (glStepSize * 0.5);

        bool groundInShadow = false;
        // Use 0.999 radius to prevent self-shadowing artifacts
        vec2 groundPlanetHit = intersectPlanetSphere(hitPos + normal * 0.01, uSunDirection, uPlanetRadius * 0.999);
        if (groundPlanetHit.x > 0.0) groundInShadow = true;

        vec3 sunTransmittance = vec3(0.0);
        if (!groundInShadow && glStepSize > 0.0) {
            for (int j = 0; j < 4; j++) {
                float lh = getAltitude(glSample);
                if (lh < 0.0) lh = 0.0;
                groundLightRayleigh += exp(-lh / uRayleighScaleHeight) * glStepSize;
                groundLightMie += exp(-lh / uMieScaleHeight) * glStepSize;
                groundLightOzone += max(0.0, 1.0 - abs(lh - uOzoneCenterHeight) / (uOzoneThickness * 0.5)) * glStepSize;
                glSample += uSunDirection * glStepSize;
            }

            vec3 gTau = uRayleighBeta * groundLightRayleigh + uMieBeta * groundLightMie + uOzoneBeta * groundLightOzone * uOzoneIntensity;
            sunTransmittance = exp(-max(vec3(0.0), gTau));
        }

        float diff = max(dot(normal, uSunDirection), 0.0);
        vec3 ambient = atmosphereColor * 0.4; // Ambient from sky
        vec3 directLight = groundColor * sunTransmittance * diff * uSunIntensity * 0.8;
        vec3 litGround = ambient + directLight;

        finalColor = litGround * viewTransmittance + atmosphereColor;
    } else {
        float stars = getGeneratedStars(rayDir);
        // Hide stars if the atmosphere is bright (daytime) or if we are looking at the sun
        float atmosphereBrightness = dot(atmosphereColor, vec3(0.333));
        stars *= smoothstep(0.5, 0.0, max(0.0, cosTheta));
        stars *= smoothstep(0.1, 0.01, atmosphereBrightness);
        finalColor += vec3(stars);

        // Multiply by transmittance so the atmosphere naturally affects the sun
        finalColor += getSunDisk(cosTheta) * viewTransmittance;
    }

    // Tone mapping (exposure)
    finalColor = 1.0 - exp(-finalColor * 1.0);
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
