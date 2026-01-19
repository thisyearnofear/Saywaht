import { FrameRenderer } from "./frame-renderer";
import { TimelineTrack } from "@/stores/timeline-store";
import { MediaItem } from "@/stores/media-store";
import { ExportOptions } from "../canvas-export-utils";

export class WebGLRenderer implements FrameRenderer {
  public name: string = 'webgl';
  public priority: number = 100;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  canRender(params: { tracks: TimelineTrack[]; mediaItems: MediaItem[]; timestamp: number; options: ExportOptions; }): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  async initialize(width: number, height: number): Promise<void> {
    console.log("WebGLRenderer: Initializing...");

    const canvas = new OffscreenCanvas(width, height);
    const gl = canvas.getContext('webgl2');

    if (!gl) {
      throw new Error("WebGL2 not supported in this OffscreenCanvas context.");
    }
    this.gl = gl;

    // Vertex shader source
    const vsSource = `#version 300 es
      in vec4 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      void main() {
        gl_Position = a_position;
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader source
    const fsSource = `#version 300 es
      precision highp float;
      in vec2 v_texCoord;
      uniform sampler2D u_image;
      out vec4 outColor;
      void main() {
        outColor = texture(u_image, v_texCoord);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create and link program
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program.");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Unable to initialize the shader program: ${info}`);
    }
    this.program = program;

    // Create buffers for a full-screen quad
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0, // bottom-left
      1.0, -1.0, // bottom-right
      -1.0, 1.0, // top-left
      -1.0, 1.0, // top-left
      1.0, -1.0, // bottom-right
      1.0, 1.0, // top-right
    ]), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0, 0.0, // bottom-left
      1.0, 0.0, // bottom-right
      0.0, 1.0, // top-left
      0.0, 1.0, // top-left
      1.0, 0.0, // bottom-right
      1.0, 1.0, // top-right
    ]), gl.STATIC_DRAW);

    // Create a texture to render image data to
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    console.log("WebGLRenderer: Initialized successfully.");
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`An error occurred compiling the shaders: ${info}`);
    }
    return shader;
  }

  async renderFrame(params: {
    tracks: TimelineTrack[];
    mediaItems: MediaItem[];
    timestamp: number;
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
    videoFrames: ImageData[];
    options: ExportOptions;
  }): Promise<boolean> {
    const { gl, program } = this;
    if (!gl || !program) throw new Error("WebGL not initialized.");

    const { videoFrames, timestamp, options } = params;
    const frameIndex = Math.floor(timestamp * (options.frameRate || 30));
    const imageData = videoFrames[frameIndex];

    if (!imageData) {
      // If no image data for this frame, clear the canvas
      gl.clearColor(0.0, 0.0, 0.0, 0.0); // Clear to transparent black
      gl.clear(gl.COLOR_BUFFER_BIT);
      return false;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    // Set up position attribute
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Set up texture coordinate attribute
    const texCoordAttributeLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordAttributeLocation);

    // Bind the texture and upload image data
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);

    // Set the uniform for the texture sampler
    const imageLocation = gl.getUniformLocation(program, 'u_image');
    gl.uniform1i(imageLocation, 0); // Tell the shader to use texture unit 0

    // Draw the quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    return true;
  }

  cleanup(): void {
    console.log("WebGLRenderer: Cleaning up.");
    const gl = this.gl;
    if (gl) {
      if (this.program) gl.deleteProgram(this.program);
      if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
      if (this.texture) gl.deleteTexture(this.texture);
    }
    this.gl = null;
    this.program = null;
    this.positionBuffer = null;
    this.texCoordBuffer = null;
    this.texture = null;
  }
}