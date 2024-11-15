export function createShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum
): WebGLShader | undefined {
  // see if we can create the shader
  const shader = gl.createShader(type);
  if (!shader) return undefined;

  // see if we can compile it
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(shader));
    return;
  }

  // return the program
  return shader;
}

export type CreateProgramError =
  | {
      type: "failed-to-create-program";
    }
  | {
      type: "failed-to-link-program";
      infoLog?: string;
    };

export function createProgram(
  gl: WebGL2RenderingContext,
  vertex: WebGLShader,
  fragment: WebGLShader
): WebGLProgram | undefined {
  // can we make the program?
  const prog = gl.createProgram();
  if (!prog) return undefined;

  // can we attach the shaders and link it?
  gl.attachShader(prog, vertex);
  gl.attachShader(prog, fragment);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.getProgramInfoLog(prog);
    return undefined;
  }

  // return the program
  return prog;
}

export function createProgramFromShaderSources(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string
): WebGLProgram | undefined {
  // create shaders from sources
  const maybeVShader = createShader(gl, vertex, gl.VERTEX_SHADER);
  const maybeFShader = createShader(gl, fragment, gl.FRAGMENT_SHADER);
  if (!maybeVShader || !maybeFShader) return undefined;

  // compile the program and return the result of that
  return createProgram(gl, maybeVShader, maybeFShader);
}

export type UniformDimensionality = "1" | "2" | "3" | "4";
export type UDimToArray<N extends UniformDimensionality, T> = N extends "1"
  ? [T]
  : N extends "2"
  ? [T, T]
  : N extends "3"
  ? [T, T, T]
  : [T, T, T, T];

export function makeUniformSetter(
  gl: WebGL2RenderingContext,
  prog: WebGLProgram
) {
  return <N extends UniformDimensionality>(
    type: `${N}${"f" | "i" | "ui"}`,
    ...data: UDimToArray<N, number>
  ) => {
    // @ts-expect-error yeah theres no way im typechecking this
    gl["uniform" + type](data);
  };
}

export async function loadImage(link: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.src = link;
  });
}
