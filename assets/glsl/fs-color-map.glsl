#version 300 es

precision highp float;
//precision highp sampler2D;

uniform sampler2D u_cmap;
uniform sampler2D u_input;
uniform float u_time;
uniform float u_iter;
uniform float u_mix;

in vec2 v_texcoord;

out vec4 fragColor;

float n;
vec2 u;

void main() {
  u = v_texcoord * 0.5 + 0.5;
  n = texture(u_input, u).w / u_iter;
  n = mix(n, 1.0 - n, u_mix);
  fragColor = vec4(texture(u_cmap, vec2(n, 1.0)));
}
