const COLORMAP_RESOLUTION = 100;

const colormaps = {
    red: new Float32Array(4 * COLORMAP_RESOLUTION),
    green: new Float32Array(4 * COLORMAP_RESOLUTION),
    blue: new Float32Array(4 * COLORMAP_RESOLUTION),
}

for (let i = 0; i < COLORMAP_RESOLUTION; i++) {
    colormaps.red[4 * i + 0] = i / 100.0;
    colormaps.red[4 * i + 1] = (1.0 - Math.exp(-i / 100.0 * 2.0)) * 0.3;
    colormaps.red[4 * i + 2] = 0.2 + Math.atan(i / 100.0 - 0.5) / Math.PI * 0.2;
    colormaps.red[4 * i + 3] = 1.0;

    colormaps.green[4 * i + 0] = 0.2 + Math.atan(i / 100.0 - 0.5) / Math.PI * 0.2;
    colormaps.green[4 * i + 1] = i / 100.0;
    colormaps.green[4 * i + 2] = (1.0 - Math.exp(-i / 100.0 * 2.0)) * 0.3;
    colormaps.green[4 * i + 3] = 1.0;

    colormaps.blue[4 * i + 0] = (1.0 - Math.exp(-i / 100.0 * 2.0)) * 0.3;
    colormaps.blue[4 * i + 1] = 0.2 + Math.atan(i / 100.0 - 0.5) / Math.PI * 0.2;
    colormaps.blue[4 * i + 2] = i / 100.0;
    colormaps.blue[4 * i + 3] = 1.0;
}

export {
    colormaps
}
