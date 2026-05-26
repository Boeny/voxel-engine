attribute vec3 color;
attribute float luminosity;
attribute float radius;

uniform vec3 uCameraPositionLy;
uniform float uPixelAngularSize;
uniform float uBrightnessMultiplier;
uniform float uRadiusMultiplier;
uniform float uMinRadius;
uniform float uMinBrightness;
uniform float uMaxBrightness;

uniform float LY_TO_KM;
const float PI = 3.14159265359;

varying vec3 vColor;

void main() {
    vec3 toStarLy = position - uCameraPositionLy;
    float distanceLy = length(toStarLy);

    vec3 worldDirection = toStarLy / distanceLy;
    vec4 viewDirection = viewMatrix * vec4(worldDirection, 0.0);

    // Place at far plane (clip-space z = w → NDC z = 1)
    vec4 clipPosition = projectionMatrix * vec4(viewDirection.xyz, 1.0);
    clipPosition.z = clipPosition.w;
    gl_Position = clipPosition;

    float distanceKm = distanceLy * LY_TO_KM;
    float angularRadius = atan(radius / distanceKm);
    float pixelRadius = (angularRadius / uPixelAngularSize) * uRadiusMultiplier;

    // Sprite size: 2 * pixelRadius (diameter), but clamped to user-configurable range
    gl_PointSize = max(pixelRadius, uMinRadius);

    // Per-pixel brightness: surface brightness times (star area / rendered disc area), capped at 1
    float fillRatio = min(1.0, 4.0 * pixelRadius * pixelRadius / (gl_PointSize * gl_PointSize));
    float perPixel = luminosity * fillRatio;
    vColor = color * clamp(perPixel * uBrightnessMultiplier, uMinBrightness, uMaxBrightness);
}
