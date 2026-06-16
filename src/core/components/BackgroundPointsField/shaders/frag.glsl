precision highp float;

varying vec3 vColor;

void main() {
    float dist = length(gl_PointCoord - 0.5);
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor * alpha, 1.0);
}
