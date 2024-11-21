import { createProgramFromShaderSources, loadImage } from "./gl-lib";
import { glMatrix, mat3, vec2, vec4 } from "gl-matrix";

const FULLSCREEN_QUAD = new Float32Array([
  -1, 1, 1, 1, 1, -1, -1, 1, 1, -1, -1, -1,
]);

const PERINSTANCE_STRIDE = 76;

export async function makeDrawSystem(gl: WebGL2RenderingContext) {
  const vertexSource = await (await fetch("./vertex.vert")).text();
  const fragmentSource = await (await fetch("./fragment.frag")).text();
  const prog = createProgramFromShaderSources(gl, vertexSource, fragmentSource);
  if (!prog) {
    return;
  }

  // setup vao
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // setup source texture
  const imagePaths = [
    "some_random_asshole.png",
    "eyeball.png",
    "wasd.png",
    "attack.png",
    "arrow.png",
    "inverted-eyeball.png",
    "fist.png",
    "middlefinger.png",
    "keyboard.png",
    "m.png",
  ];
  const images = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, images);
  gl.texStorage3D(
    gl.TEXTURE_2D_ARRAY,
    2,
    gl.RGBA8,
    512,
    512,
    imagePaths.length
  );
  await Promise.all(
    imagePaths.map(async (url, i) => {
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        i,
        512,
        512,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        await loadImage(url)
      );
    })
  );

  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);

  // setup quad buffer
  const fullscreenQuadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD, gl.STATIC_DRAW);

  gl.useProgram(prog);

  // per-vertex attribs
  const vertexPositionLocation = gl.getAttribLocation(prog, "vertex_position");
  gl.enableVertexAttribArray(vertexPositionLocation);
  gl.vertexAttribPointer(vertexPositionLocation, 2, gl.FLOAT, false, 8, 0);

  const instanceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);

  // per-instance attribs
  const transformLocation = gl.getAttribLocation(prog, "transform");
  gl.vertexAttribPointer(
    transformLocation + 0,
    3,
    gl.FLOAT,
    false,
    PERINSTANCE_STRIDE,
    0
  );
  gl.vertexAttribPointer(
    transformLocation + 1,
    3,
    gl.FLOAT,
    false,
    PERINSTANCE_STRIDE,
    12
  );
  gl.vertexAttribPointer(
    transformLocation + 2,
    3,
    gl.FLOAT,
    false,
    PERINSTANCE_STRIDE,
    24
  );
  const imageIndexLocation = gl.getAttribLocation(prog, "v_image_index");
  gl.vertexAttribPointer(
    imageIndexLocation,
    1,
    gl.FLOAT,
    false,
    PERINSTANCE_STRIDE,
    36
  );
  const effectIndexLocation = gl.getAttribLocation(prog, "v_effect_index");
  gl.vertexAttribIPointer(
    effectIndexLocation,
    1,
    gl.UNSIGNED_INT,
    PERINSTANCE_STRIDE,
    40
  );
  const paramsLocation = gl.getAttribLocation(prog, "v_params");
  gl.vertexAttribPointer(
    paramsLocation,
    4,
    gl.FLOAT,
    false,
    PERINSTANCE_STRIDE,
    44
  );
  const params2Location = gl.getAttribLocation(prog, "v_params2");
  gl.vertexAttribPointer(
    params2Location,
    4,
    gl.FLOAT,
    false,
    PERINSTANCE_STRIDE,
    60
  );

  gl.enableVertexAttribArray(transformLocation);
  gl.enableVertexAttribArray(transformLocation + 1);
  gl.enableVertexAttribArray(transformLocation + 2);
  gl.enableVertexAttribArray(imageIndexLocation);
  gl.enableVertexAttribArray(effectIndexLocation);
  gl.enableVertexAttribArray(paramsLocation);
  gl.enableVertexAttribArray(params2Location);

  gl.vertexAttribDivisor(transformLocation, 1);
  gl.vertexAttribDivisor(transformLocation + 1, 1);
  gl.vertexAttribDivisor(transformLocation + 2, 1);
  gl.vertexAttribDivisor(imageIndexLocation, 1);
  gl.vertexAttribDivisor(effectIndexLocation, 1);
  gl.vertexAttribDivisor(paramsLocation, 1);
  gl.vertexAttribDivisor(params2Location, 1);

  let drawList: {
    imageIndex: number;
    effectIndex: number;
    transform: number[];
    params?: number[];
    params2?: number[];
  }[] = [];

  function draw(
    imageIndex: number,
    effectIndex: number,
    transform: mat3,
    params?: [number, number, number, number],
    params2?: [number, number, number, number]
  ) {
    if (transform.length != 9)
      throw new Error(`A 3x3 matrix is expected for the transform.`);
    drawList.push({
      imageIndex,
      effectIndex,
      transform: (transform as number[]).concat(),
      params,
      params2,
    });
  }

  return {
    draw,
    circle(
      pos: vec2,
      radius: number,
      color: vec4,
      width?: number,
      size?: number
    ) {
      const trans = mat3.create();
      mat3.translate(trans, trans, pos);
      mat3.scale(trans, trans, vec2.fromValues(radius, radius));
      draw(
        0,
        1,
        trans,
        [size ?? 0.5, width ?? 100, 0, 0],
        color as [number, number, number, number]
      );
    },

    img(index: number, trans: mat3, color?: vec4) {
      draw(
        index,
        0,
        trans,
        (color as [number, number, number, number]) ?? [1, 1, 1, 1]
      );
    },

    rect(pos1: vec2, pos2: vec2, color: vec4) {
      const trans = mat3.create();
      mat3.translate(trans, trans, pos1);
      mat3.scale(trans, trans, [pos2[0] - pos1[0], pos2[1] - pos1[1]]);
      draw(0, 4, trans, color as [number, number, number, number]);
    },

    dispatch() {
      const newBufferData = new ArrayBuffer(
        PERINSTANCE_STRIDE * drawList.length
      );
      let i = 0;
      const asFloatBuffer = new Float32Array(newBufferData);
      const asIntBuffer = new Uint32Array(newBufferData);
      for (const {
        params2,
        params,
        imageIndex,
        effectIndex,
        transform,
      } of drawList) {
        const base = (i * PERINSTANCE_STRIDE) / 4;
        for (let j = 0; j < 9; j++) {
          asFloatBuffer[base + j] = transform[j];
        }
        asFloatBuffer[base + 9] = imageIndex;
        asIntBuffer[base + 10] = effectIndex;
        for (let j = 0; j < 4; j++) {
          if (params) asFloatBuffer[base + 11 + j] = params[j];
          if (params2) asFloatBuffer[base + 15 + j] = params2[j];
        }
        i++;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, newBufferData, gl.STREAM_DRAW);

      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, drawList.length);

      drawList = [];
    },
  };
}

export type DrawSystem = Exclude<
  Awaited<ReturnType<typeof makeDrawSystem>>,
  undefined
>;
