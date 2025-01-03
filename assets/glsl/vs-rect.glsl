#version 300 es

precision highp float;

in vec2 a_position;

out vec2 v_texcoord;

void main() {
  v_texcoord = a_position;

  gl_Position = vec4(a_position, 0.0, 1.0);
}
