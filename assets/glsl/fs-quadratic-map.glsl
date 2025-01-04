#version 300 es
#define PI 3.1415926538

precision highp float;
//precision highp sampler2D;

uniform sampler2D u_input;
uniform float u_time;
uniform float u_step;
uniform float u_iter;
uniform vec2 u_scale;

// arbitrarily chosen to be controlled from the UI
uniform float u_alpha;
uniform float u_beta;
uniform float u_freq0;
uniform float u_freq1;
uniform float u_growth;

in vec2 v_texcoord;

out vec4 fragColor;

vec2 mul_complex(vec2 a, vec2 b) {
  return vec2(a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]);
}

vec2 phase_vec(float a) {
  return vec2(cos(a), sin(a));
}

vec4 data;
vec2 c;
vec2 z;
float n;
float p;

void main() {
  data = texture(u_input, v_texcoord * 0.5 + 0.5);
  z = data.xy;
  p = data.z;
  n = data.w;

  if (length(pow(abs(z), vec2(u_step / u_iter + u_alpha))) > u_beta) {
    n = n + 1.0;
  }

  p += 1.0 / u_iter / 2.0 * PI;
  p += 2.0 * u_time * PI;
  c = mul_complex(
                  u_scale * 1.0 * v_texcoord * (0.5 * sin(u_freq0 * u_time * PI) + 1.0),
                  phase_vec(p)
                  ) * pow(u_growth, u_step);
  c = mul_complex(c, phase_vec(-sin(u_time * PI) * u_freq1 * PI));
  fragColor = vec4(mul_complex(z, z) + c, mod(p, 2.0 * PI), n);
}
