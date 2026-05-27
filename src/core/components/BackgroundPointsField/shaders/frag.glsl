precision highp float;

varying vec3 vColor;

void main() {
    vec2 offset = gl_PointCoord - 0.5;
    float radius = length(offset);
    float alpha = 1.0 - smoothstep(0.4, 0.5, radius);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor * alpha, 1.0);
}
