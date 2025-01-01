const WEBGL_UNIFORM_SETTERS = {
    [WebGL2RenderingContext.INT]          : "uniform1i",
    [WebGL2RenderingContext.FLOAT]        : "uniform1f",
    [WebGL2RenderingContext.FLOAT_VEC2]   : "uniform2fv",
    [WebGL2RenderingContext.FLOAT_VEC3]   : "uniform3fv",
    [WebGL2RenderingContext.SAMPLER_2D]   : "uniform1i",
    [WebGL2RenderingContext.SAMPLER_CUBE] : "uniform1i",
};

/**
 * @typedef {Object} GLProgramContainer
 * @property {WebGLProgram} prog
 * @property {Object} uniforms
 */

/**
 * Compile source to WebGLShader.
 * Type should be gl.VERTEX_SHADER or gl.FRAGMENT_SHADER.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string} source - shader source code
 * @param {number} type - gl.VERTEX_SHADER | gl.FRAGMENT_SHADER
 *
 * @return {WebGLShader}
 */
function compileShader(gl, source, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);

    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw "Shader compilation error: " + gl.getShaderInfoLog(shader);
    }

    return shader;
}

/**
 * Create a GLProgramContainer with a WebGLProgram and a map of uniforms inside.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexShaderSrc - vertex shader source code
 * @param {string} fragmentShaderSrc - fragment shader source code
 * @param {object} attribBindings - key-value map of attribute names to locations
 *
 * @return {GLProgramContainer}
 */
function createProgram(gl, vertexShaderSrc, fragmentShaderSrc, attribBindings) {
    const prog = gl.createProgram();

    gl.attachShader(prog, compileShader(gl, vertexShaderSrc, gl.VERTEX_SHADER));
    gl.attachShader(prog, compileShader(gl, fragmentShaderSrc, gl.FRAGMENT_SHADER));

    for (let attrib in attribBindings) {
        gl.bindAttribLocation(prog, attribBindings[attrib], attrib);
    }

    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw "Failed to create program: " + gl.getProgramInfoLog(prog);
    }

    let uniforms = {};
    var n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
        var uniform = gl.getActiveUniform(prog, i);
        var location = gl.getUniformLocation(prog, uniform.name);
        uniforms[uniform.name] = [location, uniform.type];
    }

    return { prog: prog, uniforms: uniforms };
}

/**
 * Set uniform values
 *
 * @param {WebGL2RenderingContext} gl
 * @param {GLProgramContainer} program
 * @param {Object} values - key-value map of uniform name to value
 */
function setUniforms(gl, program, values) {
    let location, type;
    for (const key of Object.keys(values)) {
        if (!program.uniforms.hasOwnProperty(key)) {
            console.log(`uniform '${key}' does not exist`);
            continue;
        }
        [location, type] = program.uniforms[key];
        gl[WEBGL_UNIFORM_SETTERS[type]](location, values[key]);
    }
}

/**
 * Create a new framebuffer and binds texture to it
 *
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLTexture} texture
 *
 * @return {WebGLFramebuffer}
 */
function createFramebuffer(gl, texture) {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return fb;
}

/**
 * Create new texture
 * For allowed combinations of format, internalFormat and type see:
 * https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
 *
 * @param {WebGL2RenderingContext} gl
 * @param {number} textureUnit
 * @param {number} width
 * @param {number} height
 * @param {number} internalFormat
 * @param {number} format
 * @param {number} type
 * @param {ArrayBufferView | null} pixels
 *
 * @return {WebGLTexture}
 */
function createTexture(
    gl,
    textureUnit,
    width,
    height,
    internalFormat,
    format,
    type,
    filterParam,
    clampParam,
    pixels
) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterParam);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterParam);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clampParam);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, clampParam);

    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, pixels);

    return texture;
}

/**
 * Load shader sources from url
 *
 * @param {Object} shaderSources - map of names to urls
 *
 * @return {Object}
 */
async function loadShaderSources(shaderSources) {
    const sources = await Promise.all(
        Object.values(shaderSources).map((url) => fetch(url).then(r => r.text()))
    );
    return Object.fromEntries(Object.keys(shaderSources).map((k, i) => [k, sources[i]]))
}

/** A group of parameters that belong together in some way */
const ParameterGroup = class {
    /**
     * Initialize new parameter group
     *
     * @param {Object} params
     */
    constructor(params) {
        this.callbacks = {};
        this.defaults = {};
        this.specs = {};

        for (const [name, spec] of Object.entries(params)) {
            this[name] = spec.value;
            this.callbacks[name] = [];
            this.defaults[name] = spec.value;
            this.specs[name] = spec;
        }

        this.changed = false;
    }

    toJSON(key) {
        console.log("toJSON");
        return Object.fromEntries(Object.keys(this.specs).map(k => [k, this[k]]));
    }

    /**
     * Change numerical parameter by some amount
     *
     * @param {string} key
     * @param {number} delta
     */
    step(key, delta) {
        this.update(key, this[key] + delta);
    }

    /**
     * Update parameter with new value and run callbacks
     *
     * @param {string} key
     * @param {any} value
     * @param {boolean} runCallbacks
     */
    update(key, value, runCallbacks = true) {
        this[key] = value;
        if (runCallbacks) {
            for (const fn of this.callbacks[key]) {
                fn(value);
            }
        }
        this.changed = true;
    }

    /**
     * Reset values and callbacks back to what they were when the group was initialized.
     */
    reset() {
        for (const [k, v] of Object.entries(this.defaults)) {
            this[k] = v;
            this.callbacks[k] = [];
        }
    }
}

/**
 * Create HTML input element
 *
 * @param {Element} parent
 * @param {string} key
 * @param {object} param
 * @param {ParameterGroup} parameterGroup
 */
function createInputElement(parent, key, param, parameterGroup) {
    const label = document.createElement("label");
    label.setAttribute("for", key);
    label.textContent = param.name + ":";

    const input = document.createElement("input");
    input.type = param.type;
    input.id = key;
    if (param.attributes) {
        Object.keys(param.attributes).forEach(k => input.setAttribute(k, param.attributes[k]));
    }
    input.value = param.inverseTransformation(param.value);
    input.addEventListener("input", function (ev) {
        parameterGroup.update(key, param.transformation(ev.target.value), false)
    });
    input.addEventListener("keydown", function (ev) {
        const step = param.attributes && param.attributes.hasOwnProperty("step") ? param.attributes["step"] : 0;

        switch (ev.key) {
        case "Escape":
            ev.target.blur();
            break;
        case "ArrowRight":
        case "ArrowLeft":
            ev.stopPropagation();
            break;
        case "ArrowUp":
            if (step) {
                parameterGroup.update(key, param.transformation(ev.target.value) + step);
            }
            ev.stopPropagation();
            break;
        case "ArrowDown":
            if (step) {
                parameterGroup.update(key, param.transformation(ev.target.value) - step);
            }
            ev.stopPropagation();
            break;
        default:
            break;
        }
    });
    parameterGroup.callbacks[key].push((value) => input.value = param.inverseTransformation(value));

    const container = document.createElement("div");
    container.setAttribute("class", "param-row");
    container.appendChild(label);
    container.appendChild(input);

    parent.appendChild(container);
}

/**
 * Create HTML select element
 *
 * @param {Element} parent
 * @param {string} key
 * @param {object} param
 * @param {ParameterGroup} parameterGroup
 */
function createSelectElement(parent, key, param, parameterGroup) {
    const label = document.createElement("label");
    label.setAttribute("for", key);
    label.textContent = param.name + ":";

    const select = document.createElement("select");
    select.id = key;
    const options = param.attributes.options;
    let option;
    options.forEach(function (value) {
        option = document.createElement("option");
        option.value = value;
        option.text = value;
        select.appendChild(option);
    });
    select.selectedIndex = options.indexOf(param.value);

    select.addEventListener("input", function (ev) {
        parameterGroup.update(key, options[ev.target.selectedIndex], false)
    });

    parameterGroup.callbacks[key].push((value) => select.selectedIndex = options.indexOf(value));

    const container = document.createElement("div");
    container.setAttribute("class", "param-row");
    container.appendChild(label);
    container.appendChild(select);

    parent.appendChild(container);
}

/**
 * Create controls (HTML input elements) for a group of parameters
 *
 * @param {string} parentId
 * @param {ParameterGroup} parameterGroup
 */
function createControls(parentId, parameterGroup) {
    const parent = document.querySelector(`#${parentId}`);

    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }

    for (const k of Object.keys(parameterGroup.specs)) {
        const param = parameterGroup.specs[k];

        if (param.type === "select") {
            createSelectElement(parent, k, param, parameterGroup);
        } else {
            createInputElement(parent, k, param, parameterGroup);
        }
    }
}

export {
    WEBGL_UNIFORM_SETTERS,
    createControls,
    createFramebuffer,
    createProgram,
    createTexture,
    setUniforms,
    loadShaderSources,
    ParameterGroup,
};
