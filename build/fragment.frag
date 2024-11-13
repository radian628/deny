#version 300 es

precision highp float;

in vec2 texcoord;
in float image_index;
flat in uint effect_index;
in vec4 params;
in vec4 params2;

out vec4 fragColor;

uniform lowp sampler2DArray images;
uniform sampler2D environment;





#define IMAGE_COLOR params;

void drawImage(void) {
  vec4 pixel = texture(images, vec3(texcoord, image_index));
  if (pixel.a == 0.) discard;
  fragColor = pixel * IMAGE_COLOR;
}






#define CIRCLE_FACTOR params.x
#define CIRCLE_WIDTH params.y
#define CIRCLE_COLOR params2

void circle(void) {
  float x = length(texcoord * 2.0 - 1.0);
  if (x > 1.0) discard;
  float alpha = -1.0 / CIRCLE_WIDTH * abs(x - CIRCLE_FACTOR) + 1.0; 
  fragColor = CIRCLE_COLOR * vec4(1.0, 1.0, 1.0, alpha);
}


#define DUCKS_OFFSET params.xy
#define DUCKS_ITERCOUNT params.z
#define DUCKS_SCALE params.w
#define DUCKS_COLOR_MUL params2

vec2 iteration(vec2 z, vec2 p) {
  vec2 temp = vec2(z.x, abs(z.y)) + p;
  return vec2(log(length(temp)), atan(temp.y, temp.x));
}

vec4 doFractalQuery(vec2 z) {
  for (float i = 0.0; i < DUCKS_ITERCOUNT; i++) {
    z = iteration(z, DUCKS_OFFSET);
  }

  // z = vec2(atan(z.y, z.x), length(z) * 3.0);
  return texture(images, vec3(z.yx, image_index)) * DUCKS_COLOR_MUL;
}

void ducksFractal() {
  fragColor = doFractalQuery((texcoord - vec2(0.5, 0.5)) * DUCKS_SCALE + vec2(0.0, 1.5));
}



#define RECT_COLOR params

void rect(void) {
  fragColor = RECT_COLOR;
}




#define ROTATE_OFFSET params.xy
#define ROTATE_ANGLE params.z
#define ROTATE_ITERCOUNT params.w

#define ROTATE_CORNER1 params2.xy
#define ROTATE_CORNER2 params2.zw

#define softabs(x, factor) sqrt(x * x + factor )

vec2 rotateIteration(vec2 z) {
  return (2.0 * mat2(
    cos(ROTATE_ANGLE), -sin(ROTATE_ANGLE),
    sin(ROTATE_ANGLE), cos(ROTATE_ANGLE)
  ) * (softabs(z, 0.001) + ROTATE_OFFSET));
}

vec4 doRotateFractalQuery(vec2 z) {
  for (float i = 0.0; i < ROTATE_ITERCOUNT; i++) {
    z = rotateIteration(z);
  }

  z = clamp(z, -1.0, 1.0);

  return texture(images, vec3(z.xy * 0.5 + 0.5, image_index));
}

void rotateFractal() {
  vec4 col = doRotateFractalQuery(texcoord * (ROTATE_CORNER2 - ROTATE_CORNER1) + ROTATE_CORNER1);
  // if (col.a < 0.5) discard;
  fragColor = col;
}






void main(void) {

  // effect 0: just draw the image
  if (effect_index == 0u) {
    drawImage();
  
  // // do later
  } else if (effect_index == 1u) {
    circle();
  } else if (effect_index == 2u) {
    ducksFractal();
  } else if (effect_index == 3u) {
    rotateFractal();
  } else if (effect_index == 4u) {
    rect();
  } else {
    discard;
  }
}