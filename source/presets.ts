import {vec3, vec3_t} from "@cl/math/vec3.ts";

export type preset_t = {
    fract_scaling: number;
    fract_rotation: vec3_t;
    fract_translation: vec3_t;
    fract_color: vec3_t;
};

export const PRESETS: preset_t[] = [
    {
        fract_scaling: 1.6,
        fract_rotation: vec3(-2.45, 0.0, 0.0),
        fract_translation: vec3(-1.5, 1.0, -1.0),
        fract_color: vec3(0.36, 0.89, 0.4)
    },
    {
        fract_scaling: 1.8,
        fract_rotation: vec3(0.5, 0.0, -0.12),
        fract_translation: vec3(-2.12, -2.75, 0.49),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.9073,
        fract_rotation: vec3(-1.16, 0.0, -9.83),
        fract_translation: vec3(-3.508, -3.593, 3.295),
        fract_color: vec3(-0.34, 0.12, -0.08)
    },
    {
        fract_scaling: 2.02,
        fract_rotation: vec3(1.62, 0.0, -1.57),
        fract_translation: vec3(-3.31, 6.19, 1.53),
        fract_color: vec3(0.12, -0.09, -0.09)
    },
    {
        fract_scaling: 1.65,
        fract_rotation: vec3(5.26, 0.0, 0.37),
        fract_translation: vec3(-1.41, -0.22, -0.77),
        fract_color: vec3(0.14, -1.71, 0.31)
    },
    {
        fract_scaling: 1.77,
        fract_rotation: vec3(5.62, 0.0, -0.22),
        fract_translation: vec3(-2.08, -1.42, -1.93),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.66,
        fract_rotation: vec3(0.19, 0.0, 1.52),
        fract_translation: vec3(-3.83, -1.94, -1.09),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.58,
        fract_rotation: vec3(3.95, 0.0, -1.45),
        fract_translation: vec3(-1.55, -0.13, -2.52),
        fract_color: vec3(-1.17, -0.4, -1.0)
    },
    {
        fract_scaling: 1.87,
        fract_rotation: vec3(0.02, 0.0, -3.12),
        fract_translation: vec3(-3.57, 0.129, 2.95),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.81,
        fract_rotation: vec3(-2.99, 0.0, -4.84),
        fract_translation: vec3(-2.905, 0.765, -4.165),
        fract_color: vec3(0.16, 0.38, 0.15)
    },
    {
        fract_scaling: 1.93,
        fract_rotation: vec3(1.58, 0.0, 1.34637),
        fract_translation: vec3(-2.31, 1.123, 1.56),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.88,
        fract_rotation: vec3(4.91, 0.0, 1.52),
        fract_translation: vec3(-4.54, -1.26, 0.1),
        fract_color: vec3(-1.0, 0.3, -0.43)
    },
    {
        fract_scaling: 1.6,
        fract_rotation: vec3(3.93, 0.0, 3.77),
        fract_translation: vec3(-2.0, -0.41, -1.43),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 2.08,
        fract_rotation: vec3(3.16, 0.0, -4.79),
        fract_translation: vec3(-7.43, 5.96, -6.23),
        fract_color: vec3(0.16, 0.38, 0.15)
    },
    {
        fract_scaling: 2.0773,
        fract_rotation: vec3(-1.34, 0.0, -9.66),
        fract_translation: vec3(-1.238, -1.533, 1.085),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.78,
        fract_rotation: vec3(3.28, 0.0, -0.1),
        fract_translation: vec3(-1.47, 1.7, -0.4),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 2.0773,
        fract_rotation: vec3(-1.34, 0.0, -9.66),
        fract_translation: vec3(-1.238, -1.533, 1.085),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.8093,
        fract_rotation: vec3(-3.2094777, 0.0, -3.165),
        fract_translation: vec3(-1.0939, -0.43495, -3.1113),
        fract_color: vec3(-0.61, -0.92, 0.33)
    },
    {
        fract_scaling: 1.95,
        fract_rotation: vec3(0.0, 0.0, 1.570796),
        fract_translation: vec3(-6.75, -3.0, 0.0),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.91,
        fract_rotation: vec3(-0.76, 0.0, 0.06),
        fract_translation: vec3(-3.44, -0.69, -1.14),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.8986,
        fract_rotation: vec3(0.00683, 0.0, -0.4166),
        fract_translation: vec3(-2.5130, -5.4067, -2.51),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 2.03413,
        fract_rotation: vec3(-1.57798, 0.0, 1.688),
        fract_translation: vec3(-4.803822, -4.1, -1.39063),
        fract_color: vec3(-0.95, -0.16, 0.14)
    },
    {
        fract_scaling: 1.6516888,
        fract_rotation: vec3(-0.7996324, 0.0, 0.026083898),
        fract_translation: vec3(-3.85863, -5.13741, -0.918303),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.77746,
        fract_rotation: vec3(0.0707307, 0.0, 4.62318),
        fract_translation: vec3(-4.6867, -0.84376, 1.98158),
        fract_color: vec3(-0.35, 1.5, 0.48)
    },
    {
        fract_scaling: 2.13,
        fract_rotation: vec3(-1.62, 0.0, -1.77),
        fract_translation: vec3(-4.99, -3.05, -4.48),
        fract_color: vec3(0.42, 0.38, 0.19)
    },
    {
        fract_scaling: 1.4731,
        fract_rotation: vec3(0.0, 0.0, 0.0),
        fract_translation: vec3(-10.27, 3.28, -1.90),
        fract_color: vec3(1.17, 0.07, 1.27)
    }
];
