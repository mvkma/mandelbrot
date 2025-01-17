/**
 * @param {number} deg
 *
 * @returns {number}
 */
const deg2rad = function(deg) {
    return deg * Math.PI / 180;
}

/**
 * @param {number} rad
 *
 * @returns {number}
 */
const rad2deg = function(rad) {
    return rad * 180 / Math.PI;
}

/**
 * @param {Object} a
 * @param {Object} b
 *
 * @returns {Float32Array}
 */
const cross = function (a, b) {
    return new Float32Array([
        a[1] * b[2] - b[1] * a[2],
        a[2] * b[0] - b[2] * a[0],
        a[0] * b[1] - b[0] * a[1],
    ]);
}

/**
 * @param {Object} a
 * @param {Object} b
 *
 * @returns {number}
 */
const dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * @param {Object} a
 *
 * @returns {Object}
 */
const normalize = function (a) {
    const length = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);

    return a.map(x => x / length);
}

/**
 * @param {number} n
 *
 * @returns {Float32Array}
 */
const identity = function (n) {
    let mat = new Float32Array(n * n, 0.0);

    for (let k = 0; k < n; k++) {
        mat[k * n + k] = 1.0;
    }

    return mat;
}

/**
 * @param {Float32Array} a
 * @param {Float32Array} b
 *
 * @returns {Float32Array}
 */
const multiply = function (a, b) {
    return new Float32Array([
        a[0]*b[0]  + a[1]*b[4]  + a[2]*b[8]   + a[3]*b[12], 
        a[0]*b[1]  + a[1]*b[5]  + a[2]*b[9]   + a[3]*b[13], 
        a[0]*b[2]  + a[1]*b[6]  + a[2]*b[10]  + a[3]*b[14], 
        a[0]*b[3]  + a[1]*b[7]  + a[2]*b[11]  + a[3]*b[15], 
        a[4]*b[0]  + a[5]*b[4]  + a[6]*b[8]   + a[7]*b[12], 
        a[4]*b[1]  + a[5]*b[5]  + a[6]*b[9]   + a[7]*b[13], 
        a[4]*b[2]  + a[5]*b[6]  + a[6]*b[10]  + a[7]*b[14], 
        a[4]*b[3]  + a[5]*b[7]  + a[6]*b[11]  + a[7]*b[15], 
        a[8]*b[0]  + a[9]*b[4]  + a[10]*b[8]  + a[11]*b[12], 
        a[8]*b[1]  + a[9]*b[5]  + a[10]*b[9]  + a[11]*b[13], 
        a[8]*b[2]  + a[9]*b[6]  + a[10]*b[10] + a[11]*b[14], 
        a[8]*b[3]  + a[9]*b[7]  + a[10]*b[11] + a[11]*b[15], 
        a[12]*b[0] + a[13]*b[4] + a[14]*b[8]  + a[15]*b[12], 
        a[12]*b[1] + a[13]*b[5] + a[14]*b[9]  + a[15]*b[13], 
        a[12]*b[2] + a[13]*b[6] + a[14]*b[10] + a[15]*b[14], 
        a[12]*b[3] + a[13]*b[7] + a[14]*b[11] + a[15]*b[15],
    ]);
}

/**
 * @param {number} radians
 *
 * @returns {Float32Array}
 */
const rotationX = function (radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    return new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0,   c,  -s, 0.0,
        0.0,   s,   c, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);
}

/**
 * @param {number} radians
 *
 * @returns {Float32Array}
 */
const rotationY = function (radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    return new Float32Array([
          c, 0.0,  -s, 0.0,
        0.0, 1.0, 0.0, 0.0,
          s, 0.0,   c, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);
}

/**
 * @param {number} radians
 *
 * @returns {Float32Array}
 */
const rotationZ = function (radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    return new Float32Array([
          c,  -s, 0.0, 0.0,
          s,   c, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 *
 * @returns {Float32Array}
 */
const translation = function (x, y, z) {
    return new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
          x,   y,   z, 1.0,
    ]);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 *
 * @returns {Float32Array}
 */
const scaling = function (x, y, z) {
    return new Float32Array([
          x, 0.0, 0.0, 0.0,
        0.0,   y, 0.0, 0.0,
        0.0, 0.0,   z, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);
}

/**
 * @param {number} r
 * @param {number} l
 * @param {number} t
 * @param {number} b
 * @param {number} n
 * @param {number} f
 *
 * @returns {Float32Array}
 */
const perspectiveProjection = function (l, r, b, t, n, f) {
    return new Float32Array([
        2.0 * n / (r - l), 0.0, 0.0, 0.0,
        0.0, 2.0 * n / (t - b), 0.0, 0.0,
        (r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1.0,
        0.0, 0.0, -2.0 * f * n / (f - n), 0.0
    ]);
}

/**
 * @param {Object} camera
 * @param {Object} target
 * @param {Object} up
 *
 * @returns {Float32Array}
 */
const lookAt = function (camera, target, up) {
    const n = normalize([camera[0] - target[0], camera[1] - target[1], camera[2] - target[2]]);
    const u = normalize(cross(up, n));
    const v = normalize(cross(n, u));

    return new Float32Array([
        u[0], v[0], n[0], 0,
        u[1], v[1], n[1], 0,
        u[2], v[2], n[2], 0,
        -dot(u, camera), -dot(v, camera), -dot(n, camera), 1,
    ]);
}

/**
 * @param {Float32Array} matrix
 * @param {number} radians
 *
 * @returns {Float32Array}
 */
const rotateX = function (matrix, radians) {
    return multiply(matrix, rotationX(radians));
}

/**
 * @param {Float32Array} matrix
 * @param {number} radians
 *
 * @returns {Float32Array}
 */
const rotateY = function (matrix, radians) {
    return multiply(matrix, rotationY(radians));
}

/**
 * @param {Float32Array} matrix
 * @param {number} radians
 *
 * @returns {Float32Array}
 */
const rotateZ = function (matrix, radians) {
    return multiply(matrix, rotationZ(radians));
}

/**
 * @param {Float32Array} matrix
 * @param {number} x
 * @param {number} y
 * @param {number} z
 *
 * @returns {Float32Array}
 */
const translate = function (matrix, x, y, z) {
    return multiply(matrix, translation(x, y, z));
}

/**
 * @param {Float32Array} matrix
 * @param {number} x
 * @param {number} y
 * @param {number} z
 *
 * @returns {Float32Array}
 */
const scale = function (matrix, x, y, z) {
    return multiply(matrix, scaling(x, y, z));
}

export {
    identity,
    multiply,
    rotateX,
    rotateY,
    rotateZ,
    translate,
    scale,
    perspectiveProjection,
    rotationX,
    rotationY,
    rotationZ,
    translation,
    scaling,
    cross,
    normalize,
    dot,
    lookAt,
    deg2rad,
    rad2deg,
};
