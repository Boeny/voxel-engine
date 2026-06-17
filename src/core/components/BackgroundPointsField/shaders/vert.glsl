attribute vec3 color;
attribute float luminosity;
attribute float radius;

uniform vec3 uCameraBackgroundPosition;
uniform float uPixelAngularSize;
uniform float uBrightnessMultiplier;
uniform float uRadiusMultiplier;
uniform float uMinRadius;
uniform float uMinBrightness;
uniform float uMaxBrightness;
uniform float uBackgroundToLocalScale;

varying vec3 vColor;

void main() {
    vec3 toPoint = position - uCameraBackgroundPosition;
    float distance = length(toPoint);

    vec3 worldDirection = toPoint / distance;
    vec4 viewDirection = viewMatrix * vec4(worldDirection, 0.0);

    // Place at far plane (clip-space z = w → NDC z = 1)
    vec4 clipPosition = projectionMatrix * vec4(viewDirection.xyz, 1.0);
    clipPosition.z = clipPosition.w;
    gl_Position = clipPosition;

    float localDistance = distance * uBackgroundToLocalScale;
    float angularRadius = atan(radius / localDistance);
    float pixelRadius = (angularRadius / uPixelAngularSize) * uRadiusMultiplier;
    gl_PointSize = max(pixelRadius, uMinRadius);

    // Per-pixel brightness: surface brightness times (star area / rendered disc area), capped at 1
    float fillRatio = min(1.0, 4.0 * pixelRadius * pixelRadius / (gl_PointSize * gl_PointSize));
    float perPixel = luminosity * fillRatio;
    vColor = color * clamp(perPixel * uBrightnessMultiplier, uMinBrightness, uMaxBrightness);
}
