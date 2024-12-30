import {
    createFramebuffer,
    createProgram,
    createTexture,
    setUniforms,
    loadShaderSources,
    ParameterGroup,
} from "./webglutils.js";

import {
    identity,
    perspectiveProjection,
    lookAt,
    deg2rad,
    rotateX,
    rotationX,
    rotateY,
    rotationY,
    rotateZ,
    rotationZ,
    translation,
} from "./webglmath.js";

const PI = Math.PI;

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

const SHADER_SOURCES = {
    vsRect: "src/vs-rect.glsl",
    fsQuadraticMap: "src/fs-quadratic-map.glsl",
    fsColorMap: "src/fs-color-map.glsl",
};

/**
 * @type {WebGL2RenderingContext}
 */
let gl = undefined;

/**
 * @type {Object}
 */
let programs = undefined;

/**
 * @type {Object}
 */
let buffers = undefined;

/**
 * @type {Object}
 */
let frameBuffers = undefined;

/**
 * @type {Object}
 */
let textureUnits = undefined;

/**
 * @type {number}
 */
let numIndices = 0;

/**
 * @type {number}
 */
let time = 0;

/**
 * @type {number}
 */
let frame = 0;

/**
 * @type {boolean}
 */
let paused = true;

/**
 * @type {boolean}
 */
let animate = false;

/**
 * @type {ParameterGroup}
 */
let view = new ParameterGroup({
    "interval": { value: 60.0 },
});

/**
 * @type {ParameterGroup}
 */
let params = new ParameterGroup({
    "iterations": { value: 15 },
});

async function init() {
    gl = document.querySelector("canvas").getContext("webgl2");
    gl.getExtension("EXT_color_buffer_float")

    const sources = await loadShaderSources(SHADER_SOURCES);

    let attributeBindings = { "a_position": 0, "a_texcoord": 1 };
    programs = {
        mandelbrot: createProgram(gl, sources["vsRect"], sources["fsQuadraticMap"], attributeBindings),
        colormap: createProgram(gl, sources["vsRect"], sources["fsColorMap"], attributeBindings),
    };

    textureUnits = { ping: 2, pong: 3, empty: 4, cmap: 5 };

    const pingTexture = createTexture(gl, textureUnits["ping"], gl.canvas.width, gl.canvas.height, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
    const pongTexture = createTexture(gl, textureUnits["pong"], gl.canvas.width, gl.canvas.height, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
    const emptyTexture = createTexture(gl, textureUnits["empty"], gl.canvas.width, gl.canvas.height, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);

    const cmap = new Float32Array(4 * 100);
    for (let i = 0; i < cmap.length; i++) {
        cmap[4 * i] = i / 100.0;
        cmap[4 * i + 1] = (1.0 - Math.exp(-i / 100.0 * 2.0)) * 0.3;
        cmap[4 * i + 2] = 0.2 + Math.atan(i / 100.0 - 0.5) / Math.PI * 0.2;
        cmap[4 * i + 3] = 1.0;
    }
    const cmapTexture = createTexture(gl, textureUnits["cmap"], 100, 1, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gl.CLAMP_TO_EDGE, cmap);

    frameBuffers = {
        ping: createFramebuffer(gl, pingTexture),
        pong: createFramebuffer(gl, pongTexture),
        canvas: null
    };

    buffers = { quad: gl.createBuffer() };

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.quad);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
        gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(attributeBindings["a_position"]);
    gl.vertexAttribPointer(attributeBindings["a_position"], 2, gl.FLOAT, false, 0, 0);

}

function render() {
    gl.useProgram(programs.mandelbrot.prog);
    setUniforms(gl, programs.mandelbrot, {
        "u_input": textureUnits["empty"],
        "u_time": time,
        "u_iter": params["iterations"],
        "u_step": 0,
        "u_scale": [gl.canvas.width / gl.canvas.height, 1.0],
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers["ping"]);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let input = "ping";
    let output = "pong";
    for (let i = 0; i < params["iterations"]; i++) {
        setUniforms(gl, programs.mandelbrot, {
            "u_input": textureUnits[input],
            "u_time": time,
            "u_iter": params["iterations"],
            "u_step": i,
            "u_scale": [gl.canvas.width / gl.canvas.height, 1.0],
        });
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[output]);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        [input, output] = [output, input];
    }

    gl.useProgram(programs.colormap.prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers["canvas"]);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    setUniforms(gl, programs.colormap, {
        "u_cmap": textureUnits["cmap"],
        "u_input": textureUnits[output],
        // "u_time": time,
        "u_iter": params["iterations"],
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    frame += 1;

    if (frame % 120 == 0) {
        console.log(`frame: ${frame}, time: ${time}`);
    }

    if (animate) {
        time += 0.001;
        window.setTimeout(() => window.requestAnimationFrame(() => render()), view["interval"]);
    }
}

window.onload = async function(ev) {
    await init();
    time = 0.0;

    window.addEventListener("keydown", function (ev) {
        switch (ev.key) {
        case " ":
            animate = !animate;
            if (animate) {
                window.requestAnimationFrame(() => render());
            }
            ev.preventDefault();
            break;
        default:
            break;
        }
    });

    window.requestAnimationFrame(() => render());
}
