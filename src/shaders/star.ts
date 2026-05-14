// Camera-aligned billboard quad rendering a luminous sphere (star).
// Vertex: same approach as planet billboard — quad spans 2*radius in view-space at the star's view-space center.
// Fragment: ray-sphere intersection + Eddington limb darkening for realistic disk falloff.

export const starVert = `
uniform vec3 center;
uniform float radius;

varying vec2 vNdc;

void main() {
    // Star center is camera-relative (camera at origin), so apply only rotation (w=0)
    vec3 centerView = (viewMatrix * vec4(center, 0.0)).xyz;

    // Camera inside the sphere → fullscreen fallback (you've been eaten by a star)
    if (length(centerView) < radius) {
        gl_Position = vec4(position.xy, 1.0, 1.0);
        vNdc = position.xy;
        return;
    }

    vec3 cornerView = centerView + vec3(position.xy * radius, 0.0);
    vec4 clipPosition = projectionMatrix * vec4(cornerView, 1.0);
    // Pin to far plane to bypass camera.far clipping (depthTest is off anyway)
    clipPosition.z = clipPosition.w;
    gl_Position = clipPosition;
    vNdc = clipPosition.xy / clipPosition.w;
}
`;

export const starFrag = `
precision highp float;

varying vec2 vNdc;
uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;

uniform vec3 center;     // camera-relative, world axes
uniform float radius;
uniform vec3 color;
uniform float luminosity;
uniform float brightnessMultiplier;

// Precision-stable ray-sphere (camera at origin = camera-relative frame)
vec2 intersectSphere(vec3 ro, vec3 rd) {
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float len = length(oc);
    float c = (len + radius) * (len - radius);
    float h = b * b - c;
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

void main() {
    // Reconstruct world-space (camera-relative) ray direction
    vec4 vp = projectionMatrixInverse * vec4(vNdc, -1.0, 1.0);
    vp /= vp.w;
    vec3 rayDir = normalize((viewMatrixInverse * vec4(vp.xyz, 0.0)).xyz);
    vec3 rayPos = vec3(0.0);

    vec2 hit = intersectSphere(rayPos, rayDir);
    if (hit.y < 0.0) discard;

    // Use far intersection if camera is inside the star; near otherwise
    float t = hit.x > 0.0 ? hit.x : hit.y;
    vec3 hitPos = rayPos + rayDir * t;
    vec3 normal = normalize(hitPos - center);

    // mu = cosine between view direction and surface normal
    float mu = max(0.0, -dot(rayDir, normal));

    // Eddington limb darkening: I(mu) ≈ 0.4 + 0.6 * sqrt(mu).
    // Center of disk (mu=1) → 1.0, limb (mu=0) → 0.4 of central intensity.
    float limb = 0.4 + 0.6 * sqrt(mu);

    vec3 finalColor = color * luminosity * limb * brightnessMultiplier;
    gl_FragColor = vec4(finalColor, 1.0);
}
`;
