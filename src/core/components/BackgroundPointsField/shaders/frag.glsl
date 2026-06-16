precision highp float;

varying vec3 vColor;
varying float vIsSelected;

void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float dist = length(offset);

    if (vIsSelected > 0.5) {
        float disc = 1.0 - smoothstep(0.3, 0.35, dist);
        float ring = smoothstep(0.38, 0.42, dist) * (1.0 - smoothstep(0.46, 0.5, dist));
        if (disc + ring <= 0.0) discard;
        gl_FragColor = vec4(vColor * disc + vec3(3.0) * ring, 1.0);
        return;
    }

    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor * alpha, 1.0);
}
