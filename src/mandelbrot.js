/*
 */

import {
    createControls,
    createFramebuffer,
    createProgram,
    createTexture,
    setUniforms,
    loadShaderSources,
    ParameterGroup,
} from "./webglutils.js";

import {
    colormaps,
} from "./colormaps.js";

const PI = Math.PI;

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

const SHADER_SOURCES = {
    vsRect: "assets/glsl/vs-rect.glsl",
    fsQuadraticMap: "assets/glsl/fs-quadratic-map.glsl",
    fsColorMap: "assets/glsl/fs-color-map.glsl",
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
let textures = undefined;

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
let expand = false;

/**
 * @type {boolean}
 */
let animate = false;

/**
 * @type {ParameterGroup}
 */
let view = new ParameterGroup({
    "interval": {
        type: "",
        value: 60.0,
        attributes: { maxlength: 5, step: 10 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Interval (ms)",
    },
    "dt": {
        type: "",
        value: 0.001,
        attributes: { maxlength: 10, step: 0.001 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 10),
        name: "Time step",
    },
    "mix": {
        type: "",
        value: 1.0,
        attributes: { maxlength: 5, step: 0.05 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Colormap mix",
    },
    "rmix": {
        type: "",
        value: 0.0,
        attributes: { maxlength: 5, step: 0.05 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Mirror mix",
    },
    "rscale": {
        type: "",
        value: 2.5,
        attributes: { maxlength: 5, step: 0.05 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Mirror scale",
    },
    "colormap": {
        type: "select",
        value: "twilight",
        attributes: { options: Object.keys(colormaps) },
        name: "Colormap",
    },
});

/**
 * @type {ParameterGroup}
 */
let params = new ParameterGroup({
    "iterations": {
        type: "",
        value: 15,
        attributes: { maxlength: 2, step: 1.0 },
        transformation: (n) => parseInt(n),
        inverseTransformation: (n) => n.toString().slice(0, 2),
        name: "Iterations",
    },
    "alpha": {
        type: "",
        value: -4.0,
        attributes: { maxlength: 5, step: 0.1 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Alpha",
    },
    "beta": {
        type: "",
        value: 2.0,
        attributes: { maxlength: 5, step: 0.1 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Beta",
    },
    "freq0": {
        type: "",
        value: 2.0,
        attributes: { maxlength: 5, step: 0.1 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Frequency 0",
    },
    "freq1": {
        type: "",
        value: 4.0,
        attributes: { maxlength: 5, step: 0.1 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Frequency 1",
    },
    "growth": {
        type: "",
        value: 1.1,
        attributes: { maxlength: 5, step: 0.05 },
        transformation: (n) => parseFloat(n),
        inverseTransformation: (n) => n.toString().slice(0, 5),
        name: "Growth",
    },
});


async function init() {
    gl = document.querySelector("canvas").getContext("webgl2");
    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");

    const sources = await loadShaderSources(SHADER_SOURCES);

    let attributeBindings = { "a_position": 0, "a_texcoord": 1 };
    programs = {
        mandelbrot: createProgram(gl, sources["vsRect"], sources["fsQuadraticMap"], attributeBindings),
        colormap: createProgram(gl, sources["vsRect"], sources["fsColorMap"], attributeBindings),
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

    initTextures();
    initColormap();
}

function cleanupTextures() {
    for (const k of Object.keys(textures)) {
        gl.deleteTexture(textures[k]);
        textures[k] = undefined;
    }

    let fb;
    for (const k of Object.keys(frameBuffers)) {
        fb = frameBuffers[k];
        if (fb === null) {
            continue;
        }
        gl.deleteFramebuffer(fb);
    }
}

function initTextures() {
    textureUnits = { ping: 2, pong: 3, zero: 4, cmap: 5 };

    const internalFormat = gl.RGBA16F;
    const format = gl.RGBA;
    const type = gl.FLOAT;
    const filter = gl.NEAREST;
    const clamp = gl.MIRRORED_REPEAT;

    textures = {
        ping: createTexture(gl, textureUnits["ping"], gl.canvas.width, gl.canvas.height, internalFormat, format, type, filter, clamp, null),
        pong: createTexture(gl, textureUnits["pong"], gl.canvas.width, gl.canvas.height, internalFormat, format, type, filter, clamp, null),
        zero: createTexture(gl, textureUnits["zero"], gl.canvas.width, gl.canvas.height, internalFormat, format, type, filter, clamp, null),
    };

    frameBuffers = {
        ping: createFramebuffer(gl, textures["ping"]),
        pong: createFramebuffer(gl, textures["pong"]),
        canvas: null
    };
}

function initColormap() {
    const cmap = colormaps[view["colormap"]];
    const internalFormat = gl.RGB16F;
    const format = gl.RGB;
    const type = gl.FLOAT;
    const filter = gl.LINEAR;
    const clamp = gl.REPEAT;

    textures["cmap"] = createTexture(gl, textureUnits["cmap"], cmap.length / 3, 1, internalFormat, format, type, filter, clamp, cmap);
}

function render() {
    if (view.changed) {
        initColormap();
    }

    if (gl.canvas.width !== gl.canvas.clientWidth ||
        gl.canvas.height !== gl.canvas.clientHeight) {
        cleanupTextures();

        gl.canvas.width = gl.canvas.clientWidth;
        gl.canvas.height = gl.canvas.clientHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        initTextures();
        initColormap();
    }

    gl.useProgram(programs.mandelbrot.prog);
    setUniforms(gl, programs.mandelbrot, {
        "u_input": textureUnits["zero"],
        "u_time": time,
        "u_iter": params["iterations"],
        "u_step": 0,
        "u_scale": [gl.canvas.width / gl.canvas.height, 1.0],
        "u_alpha": params["alpha"],
        "u_beta": params["beta"],
        "u_freq0": params["freq0"],
        "u_freq1": params["freq1"],
        "u_growth": params["growth"],
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
            "u_step": i,
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
        "u_mix": view["mix"],
        "u_rmix": view["rmix"],
        "u_rscale": view["rscale"],
        // "u_time": time,
        "u_iter": params["iterations"],
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    frame += 1;

    if (animate) {
        time += view["dt"];
        window.setTimeout(() => window.requestAnimationFrame(() => render()), view["interval"]);
    }
}

function getUrl() {
    const settings = {
        params: params,
        view: view,
        // time: time,
    };

    const url = new URL(window.location.href);
    url.hash = "#" + btoa(JSON.stringify(settings));
    window.location.replace(url);
}

function loadSettingsFromUrl() {
    const hash = new URL(window.location.href).hash;
    let settings;

    try {
        settings = JSON.parse(atob(hash.slice(1)));
    } catch (e) {
        return;
    }

    // console.log('load: ', settings);

    if (settings["params"] !== undefined) {
        for (const k of Object.keys(settings["params"])) {
            params.update(k, settings["params"][k]);
        }
    }

    if (settings["view"] !== undefined) {
        for (const k of Object.keys(settings["view"])) {
            view.update(k, settings["view"][k]);
        }
    }

    if (settings["time"] !== undefined) {
        time = settings["time"];
    }

    // time = 0.0;
}

function togglePlay() {
    animate = !animate;
    if (animate) {
        window.requestAnimationFrame(() => render());
    }
    document.querySelector("#button-start").textContent = animate ? "pause" : "play";
}

function toggleExpand() {
    expand = !expand;

    if (expand) {
        gl.canvas.classList.add("canvas-expand");
    } else {
        gl.canvas.classList.remove("canvas-expand");
    }

    document.querySelector("#button-expand").textContent = expand ? "shrink" : "expand";
}

function screenshot() {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";

    const filename = `mandelbrot-${(new Date()).toISOString()}.png`;
    const paused = !animate;

    animate = false;
    render();
    gl.canvas.toBlob(function (blob) {
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    });
    animate = !paused;
    document.body.removeChild(a);
}

window.onhashchange = function(ev) {
    loadSettingsFromUrl();

    if (!animate) {
        window.requestAnimationFrame(() => render());
    }
}

window.onload = async function(ev) {
    createControls("simulation-controls", params);
    createControls("view-controls", view);

    loadSettingsFromUrl();

    await init();
    time = 0.0;

    window.addEventListener("keydown", function (ev) {
        switch (ev.key) {
        case " ":
            togglePlay();
            ev.preventDefault();
            break;
        default:
            break;
        }
    });

    const canvas = document.querySelector("canvas");

    canvas.addEventListener("pointerup", function (ev) {
        togglePlay();
        ev.preventDefault();
    });

    document.querySelector("#button-start").addEventListener("click", function (ev) {
        togglePlay();
    });

    document.querySelector("#button-expand").addEventListener("click", function (ev) {
        toggleExpand();
    });

    document.querySelector("#button-share").addEventListener("click", function (ev) {
        getUrl();
    });

    document.querySelector("#button-screenshot").addEventListener("click", function (ev) {
        screenshot();
    });

    document.querySelector("#button-reset").addEventListener("click", function (ev) {
        view.reset(false, true);
        params.reset(false, true);
        time = 0.0;
        const url = new URL(window.location.href);
        url.hash = "#";
        window.location.replace(url);
    });

    // toggleExpand();
    window.requestAnimationFrame(() => render());
}
