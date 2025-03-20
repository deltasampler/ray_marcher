import {create_canvas} from "@engine/canvas.ts";
import {gl_init, gl_link_program} from "@engine/gl.ts";
import {cam3_compute_proj, cam3_compute_view, cam3_move_forward, cam3_move_right, cam3_new, cam3_pan, cam3_tilt, cam3_fru} from "@cl/cam3.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {vec2} from "@cl/vec2.ts";
import {rgb, vec3, vec3_copy} from "@cl/vec3";
import {PRESETS} from "./presets.ts";
import {COLOR_MODE, UT, gs_object, gui_bool, gui_button, gui_canvas, gui_collapsing_header, gui_color_edit, gui_input_number, gui_input_vec, gui_reload_component, gui_render, gui_select, gui_slider_number, gui_window, gui_window_grid, gui_window_layout, unit} from "@gui/gui.ts";

const root = gui_window(null);
gui_window_grid(
    root,
    [unit(300, UT.PX), unit(1, UT.FR), unit(300, UT.PX)],
    [unit(1, UT.FR), unit(1, UT.FR), unit(1, UT.FR)]
);

const left = gui_window(root);
const right = gui_window(root);
gui_window_layout(
    root,
    [
        left, right, right,
        left, right, right,
        left, right, right
    ]
);

const canvas = gui_canvas(right, true);

gui_render(root, document.body);

const canvas_el = canvas.canvas_el;
const gl = gl_init(canvas_el);

const VERTEX_SHADER = `#version 300 es
    out vec2 v_tex_coord;

    const vec2 positions[4] = vec2[4](
        vec2(-1.0, -1.0),
        vec2(-1.0, 1.0),
        vec2(1.0, -1.0),
        vec2(1.0, 1.0)
    );

    const vec2 tex_coords[4] = vec2[4](
        vec2(0.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0)
    );

    void main() {
        gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
        v_tex_coord = tex_coords[gl_VertexID];
    }
`;

const main_program = gl_link_program({
    [gl.VERTEX_SHADER]: VERTEX_SHADER,
    [gl.FRAGMENT_SHADER]: `#version 300 es
        precision highp float;
        out vec4 o_frag_color;
        in vec2 v_tex_coord;
        uniform sampler2D u_texture;

        void main() {
            o_frag_color = texture(u_texture, v_tex_coord);
        }
    `
})!;

const texture_program = gl_link_program({
    [gl.VERTEX_SHADER]: VERTEX_SHADER,
    [gl.FRAGMENT_SHADER]: `#version 300 es
        precision highp float;
        out vec4 o_frag_color;
        in vec2 v_tex_coord;
        uniform vec2 u_viewport;
        uniform mat4 u_projection;
        uniform mat4 u_view;
        uniform float u_limit;
        uniform float u_shadow_limit;
        uniform float u_near;
        uniform float u_far;
        uniform vec3 u_light_dir;
        uniform vec3 u_light_color;
        uniform vec3 u_sky_low_color;
        uniform vec3 u_sky_high_color;
        uniform vec3 u_fract_translation;
        uniform vec3 u_fract_rotation;
        uniform float u_fract_scaling;
        uniform vec3 u_fract_color;
        uniform float u_time;
        uniform float u_ambient_stren;
        uniform float u_specular_stren;
        uniform int u_aa_samples;
        uniform int u_fract_iter;

        #define FRACT_ITER 16
        #define ANTIALIASING_SAMPLES 1
        #define AMBIENT_OCCLUSION_COLOR_DELTA vec3(0.7)
        #define AMBIENT_OCCLUSION_STRENGTH 0.008
        #define SUN_SHARPNESS 2.0
        #define SUN_SIZE 0.002

        struct res_t {
            float d;
            vec3 c;
        };

        // fractal functions
        void rot_x(inout vec3 p, float c, float s) {
            p.yz = vec2(p.y * c + p.z * s, p.z * c - p.y * s);
        }

        void rot_y(inout vec3 p, float c, float s) {
            p.xz = vec2(p.x * c - p.z * s, p.z * c + p.x * s);
        }

        void rot_z(inout vec3 p, float c, float s) {
            p.xy = vec2(p.x * c + p.y * s, p.y * c - p.x * s);
        }

        void rot_x(inout vec3 p, float a) {
            rot_x(p, cos(a), sin(a));
        }

        void rot_y(inout vec3 p, float a) {
            rot_y(p, cos(a), sin(a));
        }

        void rot_z(inout vec3 p, float a) {
            rot_z(p, cos(a), sin(a));
        }

        void fold_plane(inout vec3 p, vec3 n, float d) {
            p -= 2.0 * min(0.0, dot(p, n) - d) * n;
        }

        void fold_sierpinski(inout vec3 p) {
            p.xy -= min(p.x + p.y, 0.0);
            p.xz -= min(p.x + p.z, 0.0);
            p.yz -= min(p.y + p.z, 0.0);
        }

        vec3 aces_film(vec3 x) {
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;

            return (x * (a * x + b)) / (x * (c * x + d) + e);
        }

        void fold_menger(inout vec3 p) {
            float a = min(p.x - p.y, 0.0);
            p.x -= a;
            p.y += a;

            a = min(p.x - p.z, 0.0);
            p.x -= a;
            p.z += a;

            a = min(p.y - p.z, 0.0);
            p.y -= a;
            p.z += a;
        }

        void fold_box(inout vec3 p, vec3 b) {
            p = clamp(p, -b, b) * 2.0 - p;
        }

        // position functions
        vec3 p_translate(vec3 p, vec3 t) {
            return p - t;
        }

        vec3 p_rep(vec3 p, vec3 s) {
            return p - s * round(p / s);
        }

        // signed distance functions
        float sd_sphere(vec3 p, float r) {
            return length(p) - r;
        }

        float sd_box(vec3 p, vec3 b) {
            vec3 q = abs(p) - b;

            return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        // combination functions
        float op_union(float d0, float d1) {
            return min(d0, d1);
        }

        res_t op_union(res_t r0, res_t r1) {
            if (r0.d < r1.d) {
                return r0;
            }

            return r1;
        }

        float op_union_smooth(float d0, float d1, float k) {
            float h = clamp(0.5 + 0.5 * (d1 - d0) / k, 0.0, 1.0);

            return mix(d1, d0, h) - k * h * (1.0 - h);
        }

        res_t op_union_smooth(res_t r0, res_t r1, float k) {
            float h = clamp(0.5 + 0.5 * (r1.d - r0.d) / k, 0.0, 1.0);

            return res_t(mix(r1.d, r0.d, h) - k * h * (1.0 - h), mix(r0.c, r1.c, k));
        }

        // fractal
        res_t sd_fractal(vec3 p, int iter) {
            res_t res;
            float scaling = 1.0;
            vec3 orbit = vec3(0.0);

            for (int i = 0; i < iter; ++i) {
                p = abs(p);

                rot_z(p, u_fract_rotation.z);

                fold_menger(p);

                rot_x(p, u_fract_rotation.x);

                p *= u_fract_scaling;
                scaling *= u_fract_scaling;

                p += u_fract_translation;

                orbit = max(orbit, p * u_fract_color);
            }

            res.d = sd_box(p, vec3(6.0)) / scaling;
            res.c = orbit;

            return res;
        }

        // map
        res_t map(vec3 p) {
            return sd_fractal(p_rep(p, vec3(4.0, 0.0, 4.0)), u_fract_iter);
        }

        // marcher
        struct mar_t {
            vec3 pos;
            vec3 ray_dir;
            float dist;
            float dist_sum;
            float dist_min;
            float steps;
            int sign;
        };

        void march(inout mar_t mar, inout res_t res, float lim, float near, float far) {
            res = map(mar.pos);
            mar.dist = res.d;
            mar.dist_sum = 0.0;
            mar.dist_min = 1.0;
            mar.steps = 0.0;
            mar.sign = 0;

            for (; mar.steps < lim; mar.steps += 1.0) {
                if (mar.dist_sum < -0.1) {
                    mar.sign = -1;

                    break;
                }

                if (mar.dist < near) {
                    mar.steps += mar.dist / near;
                    mar.sign = 0;

                    break;
                }

               if (mar.dist_sum > far) {
                    mar.sign = 1;

                    break;
                }

                mar.dist_sum += mar.dist;
                mar.pos += mar.ray_dir * mar.dist;
                mar.dist_min = min(mar.dist_min, mar.dist / mar.dist_sum);
                res = map(mar.pos);
                mar.dist = res.d;
            }
        }

        float march_shadow(vec3 pos, vec3 ray_dir, float limit, float near, float far) {
            float dist_sum = near;

             for (float i = 0.0; i < limit && dist_sum < far; i += 1.0) {
                float dist = map(pos + ray_dir * dist_sum).d;

                if (dist < near) {
                    return 0.0;
                }

                dist_sum += dist;
            }

            return 1.0;
        }

        vec3 calc_normal(vec3 p, float d) {
            vec2 k = vec2(1.0, -1.0);

            return normalize(
                k.xyy * map(p + k.xyy * d).d +
                k.yyx * map(p + k.yyx * d).d +
                k.yxy * map(p + k.yxy * d).d +
                k.xxx * map(p + k.xxx * d).d
            );
        }

        vec3 smooth_color(vec3 p, vec3 s0, vec3 s1, float d) {
            return (
                map(p + s0 * d).c +
                map(p - s0 * d).c +
                map(p + s1 * d).c +
                map(p - s1 * d).c
            ) / 4.0;
        }

        vec3 render_skybox(vec3 ray_dir, vec3 light_dir) {
            vec3 col = mix(u_sky_low_color, u_sky_high_color, ray_dir.y);

            return col;
        }

        vec3 render(vec3 pos, vec3 ray_dir) {
            mar_t mar;
            mar.pos = pos;
            mar.ray_dir = ray_dir;

            res_t res;

            march(mar, res, u_limit, u_near, u_far);

            vec3 col = vec3(0.0);
            vec3 light_dir = normalize(u_light_dir);
            vec3 norm = calc_normal(mar.pos, u_near * 0.5);
            vec3 refl_dir = reflect(mar.ray_dir, norm);

            // background
            vec3 bg_color = render_skybox(mar.ray_dir, light_dir);

            if (mar.sign == 1) {
                float sun_spec = dot(mar.ray_dir, light_dir) - 1.0 + SUN_SIZE;
                sun_spec = min(exp(sun_spec * SUN_SHARPNESS / SUN_SIZE), 1.0);
                col.xyz += u_light_color * sun_spec;
            }

            if (mar.sign == 0) {
                float depth = mar.dist_sum / u_far;

                // not sure why
                // mar.pos -= norm * mar.dist;

                // res color
                vec3 res_col = clamp(res.c, 0.0, 1.0);

                // filtering
                vec3 s0 = normalize(cross(mar.ray_dir, norm));
                vec3 s1 = cross(s0, norm);
                res_col = clamp(smooth_color(mar.pos, s0, s1, u_near * 0.5), 0.0, 1.0);

                // ambient
                vec3 ambient = u_light_color * u_ambient_stren * 0.5 + bg_color * u_ambient_stren * 0.5;

                // diffuse
                float diffuse_factor = clamp(dot(norm, light_dir), 0.0, 1.0);
                vec3 diffuse = u_light_color * diffuse_factor;

                // shadow
                vec3 light_pos = mar.pos + norm * u_near * 100.0;
                diffuse *= march_shadow(light_pos, light_dir, u_shadow_limit, u_near, u_far);

                // specular
                float specular_factor = pow(max(dot(refl_dir, light_dir), 0.0), 16.0);
                vec3 specular = u_light_color * specular_factor * u_specular_stren;

                col += res_col * (ambient + diffuse + specular);

                // ao
                float ao_factor = 1.0 / (1.0 + mar.steps * AMBIENT_OCCLUSION_STRENGTH);
                col += (1.0 - ao_factor) * AMBIENT_OCCLUSION_COLOR_DELTA;

                // fog
                vec3 fog = depth * bg_color;

                col = (1.0 - depth) * col + fog;
            } else if (mar.sign == 1) {
                col += bg_color;
            }

            return col;
        }

        void main() {
            mat4 proj_inv = inverse(u_projection);
            mat4 view_inv = inverse(u_view);

            vec3 pos = view_inv[3].xyz;
            vec3 col = vec3(0.0);

            for (int i = 0; i < u_aa_samples; ++i) {
                for (int j = 0; j < u_aa_samples; ++j) {
                    vec2 delta = vec2(i, j) / float(u_aa_samples);
                    vec2 tex_coord = (gl_FragCoord.xy + delta) / u_viewport;
                    vec2 uv = tex_coord * 2.0 - 1.0;
                    vec4 clip = proj_inv * vec4(uv, 0.0, 0.0);
                    vec4 view = view_inv * vec4(clip.xy, -1.0, 0.0);
                    vec3 ray_dir = normalize(view.xyz);

                    col += render(pos, ray_dir);
                }
            }

            col /= float(u_aa_samples * u_aa_samples);

            o_frag_color = vec4(col, 1.0);
        }
    `
})!;

const u_viewport = gl.getUniformLocation(texture_program, "u_viewport");
const u_projection = gl.getUniformLocation(texture_program, "u_projection");
const u_view = gl.getUniformLocation(texture_program, "u_view");
const u_limit = gl.getUniformLocation(texture_program, "u_limit");
const u_shadow_limit = gl.getUniformLocation(texture_program, "u_shadow_limit");
const u_near = gl.getUniformLocation(texture_program, "u_near");
const u_far = gl.getUniformLocation(texture_program, "u_far");
const u_light_dir = gl.getUniformLocation(texture_program, "u_light_dir");
const u_light_color = gl.getUniformLocation(texture_program, "u_light_color");
const u_sky_low_color = gl.getUniformLocation(texture_program, "u_sky_low_color");
const u_sky_high_color = gl.getUniformLocation(texture_program, "u_sky_high_color");
const u_fract_translation = gl.getUniformLocation(texture_program, "u_fract_translation");
const u_fract_rotation = gl.getUniformLocation(texture_program, "u_fract_rotation");
const u_fract_scaling = gl.getUniformLocation(texture_program, "u_fract_scaling");
const u_fract_color = gl.getUniformLocation(texture_program, "u_fract_color");
const u_time = gl.getUniformLocation(texture_program, "u_time");
const u_ambient_stren = gl.getUniformLocation(texture_program, "u_ambient_stren");
const u_specular_stren = gl.getUniformLocation(texture_program, "u_specular_stren");
const u_aa_samples = gl.getUniformLocation(texture_program, "u_aa_samples");
const u_fract_iter = gl.getUniformLocation(texture_program, "u_fract_iter");

const config = {
    preset: 25,
    divider: 2.0,
    limit: 512,
    shadow_limit: 64,
    near: 0.00001,
    far: 32.0,
    light_dir: vec3(1.0, 1.0, 1.0),
    light_color: rgb(255, 252, 207),
    sky_low_color: rgb(156, 179, 229),
    sky_high_color: rgb(69, 102, 190),
    fract_scaling: 1.0,
    fract_rotation: vec3(0.0, 0.0, 0.0),
    fract_translation: vec3(0.0, 0.0, 0.0),
    fract_color: rgb(255, 255, 255),
    ambient_stren: 0.1,
    specular_stren: 0.3,
    is_rendering: true,
    aa_samples: 1,
    fract_iter: 16
};

let texture_width = Math.floor(canvas_el.width / config.divider);
let texture_height = Math.floor(canvas_el.height / config.divider);
let texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texture_width, texture_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

const camera = cam3_new();
camera.movement_speed = 0.01;
camera.position[1] = 15.0;

function load_preset(index: number): void {
    const preset = PRESETS[index];
    config.fract_scaling = preset.fract_scaling;
    vec3_copy(config.fract_rotation, preset.fract_rotation);
    vec3_copy(config.fract_translation, preset.fract_translation);
    vec3_copy(config.fract_color, preset.fract_color);
}

load_preset(config.preset);

io_init();

io_m_move(function(event: m_event_t): void {
    if (document.pointerLockElement === canvas_el) {
        cam3_pan(camera, event.xd);
        cam3_tilt(camera, event.yd);
    }
});

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "Backquote") {
        if (document.pointerLockElement === canvas_el) {
            document.exitPointerLock();
        } else {
            canvas_el.requestPointerLock();
        }
    }
});

function update(): void {
    if (document.pointerLockElement === canvas_el) {
        if (io_key_down("KeyA")) {
            cam3_move_right(camera, -1.0);
        }

        if (io_key_down("KeyD")) {
            cam3_move_right(camera, 1.0);
        }

        if (io_key_down("KeyS")) {
            cam3_move_forward(camera, -1.0);
        }

        if (io_key_down("KeyW")) {
            cam3_move_forward(camera, 1.0);
        }
    }

    cam3_fru(camera);
    cam3_compute_proj(camera, texture_width, texture_height);
    cam3_compute_view(camera);
}

function render_texture(fbo: WebGLFramebuffer, texture: WebGLTexture, width: number, height: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.useProgram(texture_program);
    gl.uniform2fv(u_viewport, vec2(width, height));
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.uniform1f(u_limit, config.limit);
    gl.uniform1f(u_shadow_limit, config.shadow_limit);
    gl.uniform1f(u_near, config.near);
    gl.uniform1f(u_far, config.far);
    gl.uniform3fv(u_light_dir, config.light_dir);
    gl.uniform3fv(u_light_color, config.light_color);
    gl.uniform3fv(u_sky_low_color, config.sky_low_color);
    gl.uniform3fv(u_sky_high_color, config.sky_high_color);
    gl.uniform3fv(u_fract_translation, config.fract_translation);
    gl.uniform3fv(u_fract_rotation, config.fract_rotation);
    gl.uniform1f(u_fract_scaling, config.fract_scaling);
    gl.uniform3fv(u_fract_color, config.fract_color);
    gl.uniform1f(u_time, performance.now() / 1000.0);
    gl.uniform1f(u_ambient_stren, config.ambient_stren);
    gl.uniform1f(u_specular_stren, config.specular_stren);
    gl.uniform1i(u_aa_samples, config.aa_samples);
    gl.uniform1i(u_fract_iter, config.fract_iter);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(): void {
    if (config.is_rendering) {
        render_texture(fbo, texture, texture_width, texture_height);
    }

    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(main_program);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function loop(): void {
    update();
    render();

    requestAnimationFrame(loop);
}

loop();

const preset_keys = Object.keys(PRESETS);
const preset_values = Object.keys(PRESETS).map(i => parseInt(i));

const settings_ch = gui_collapsing_header(left, "Settings");
gui_select(settings_ch, "Preset", gs_object(config, "preset"), preset_keys, preset_values, function() {
    load_preset(config.preset);
});
gui_bool(settings_ch, "Is Rendering", gs_object(config, "is_rendering"));
gui_slider_number(settings_ch, "Divider", gs_object(config, "divider"), 1, 1, 16);
gui_slider_number(settings_ch, "AA Samples", gs_object(config, "aa_samples"), 1, 1, 4);
gui_slider_number(settings_ch, "Limit", gs_object(config, "limit"), 1, 1, 1024);
gui_slider_number(settings_ch, "Shadow Limit", gs_object(config, "shadow_limit"), 1, 1, 1024);
gui_input_number(settings_ch, "Near", gs_object(config, "near"), 0.00001, 0.00001, 1024.0);
gui_input_number(settings_ch, "Far", gs_object(config, "far"), 0.00001, 0.00001, 1024.0);
gui_input_vec(settings_ch, "Light Direction", config.light_dir, 0.01, -1.0, 1.0, 3);
gui_color_edit(settings_ch, "Light Color", COLOR_MODE.R_0_1, config.light_color);
gui_color_edit(settings_ch, "Sky Low Color", COLOR_MODE.R_0_1, config.sky_low_color);
gui_color_edit(settings_ch, "Sky High Color", COLOR_MODE.R_0_1, config.sky_high_color);
gui_slider_number(settings_ch, "Ambient Strength", gs_object(config, "ambient_stren"), 0.01, 0.0, 1.0);
gui_slider_number(settings_ch, "Specular Strength", gs_object(config, "specular_stren"), 0.01, 0.0, 1.0);
gui_input_number(settings_ch, "Fractal Scaling", gs_object(config, "fract_scaling"), 0.01, -100.0, 100.0);
gui_input_vec(settings_ch, "Fractal Rotation", config.fract_rotation, 0.01, -180.0, 180.0, 3);
gui_input_vec(settings_ch, "Fractal Translation", config.fract_translation, 0.01, -100.0, 100.0, 3);
gui_color_edit(settings_ch, "Fractal Color", COLOR_MODE.R_0_1, config.fract_color);
gui_slider_number(settings_ch, "Fractal Iterations", gs_object(config, "fract_iter"), 1, 1, 16);

gui_button(settings_ch, "Reload", function() {
    texture_width = canvas_el.width / config.divider;
    texture_height = canvas_el.height / config.divider;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texture_width, texture_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
});
gui_button(settings_ch, "Export", () => {
    setTimeout(() => {
        config.is_rendering = false;
        config.shadow_limit = 1024;
        config.aa_samples = 4;
        config.limit = 1024;

        let width = 3840, height = 2160;

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        render_texture(fbo, texture, width, height);

        const pixels = new Uint8Array(width * height * 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        canvas.width = width;
        canvas.height = height;

        const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
        ctx.putImageData(imageData, 0, 0);
        ctx.scale(1, -1);
        ctx.drawImage(canvas, 0, -canvas.height);

        const link = document.createElement("a");
        link.download = "image.png";
        link.href = canvas.toDataURL("image/png");
        link.click();

        config.shadow_limit = 64;
        config.aa_samples = 1;
        config.is_rendering = true;
        config.limit = 512;
    }, 1000);
});

gui_reload_component(left);
