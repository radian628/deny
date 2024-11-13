#version 300 es

precision highp float;

in mat3 transform;
in vec2 vertex_position;
in float v_image_index;
in uint v_effect_index;
in vec4 v_params;
in vec4 v_params2;

out vec2 texcoord;
out float image_index;
flat out uint effect_index;
out vec4 params;
out vec4 params2;

void main(void) {
    // gl_Position = vec4(vertex_position + (transform * vec3(0.0)).xy, 0.5, 1.0);
    gl_Position = vec4((transform * vec3(vertex_position, 1.0)).xy, 0.5, 1.0);
    texcoord = vertex_position * vec2(0.5, -0.5) + 0.5;
    image_index = v_image_index;
    effect_index = v_effect_index;
    params = v_params;
    params2 = v_params2;
}