import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");

const SOURCE_FILES = [
    "difficulty.js",
    "utils/math.js",
    "utils/easing.js",
    "utils/rect.js",
    "utils/raycasting.js",
    "utils/first-item.js",

    "entity/entity.js",
    "entity/human.js",
    "entity/bullet.js",
    "entity/claw-effect.js",
    "entity/meow-effect.js",
    "entity/flash.js",
    "entity/cat.js",
    "entity/structure.js",
    "entity/particle.js",
    "entity/physical-particle.js",
    "entity/camera.js",
    "entity/hud.js",
    "entity/spikes.js",
    "entity/water.js",
    "entity/label.js",
    "entity/interpolator.js",
    "world.js",
    "level/serialization.js",
];

const CONSTANTS: Record<string, number> = {
    CELL_SIZE: 50,
    CANVAS_WIDTH: 1600,
    CANVAS_HEIGHT: 900,
    BULLET_SPEED: 800,
    HUMAN_VISION_DISTANCE: 500,
    HUMAN_VISION_DIVIDER_TOP: 3,
    HUMAN_VISION_DIVIDER_BOTTOM: 4,
    INPUT_MODE_KEYBOARD: 0,
    INPUT_MODE_TOUCH: 1,
    MOBILE_BUTTON_SIZE: 50,
    CAT_BODY_LENGTH: 40,
    CAT_BODY_THICKNESS: 20,
    CAT_LEG_LENGTH: 15,
    CAT_LEG_THICKNESS: 4,
    CAT_TAIL_LENGTH: 30,
    CAT_TAIL_THICKNESS: 5,
    CAT_HEAD_WIDTH: 20,
    CAT_HEAD_HEIGHT: 20,
    CAT_EAR_LENGTH: 10,
    CAT_EAR_WIDTH: 5,
    CAT_ATTACK_ANIMATION_DURATION: 0.2,
    HUMAN_BODY_LENGTH: 40,
    HUMAN_BODY_THICKNESS: 20,
    HUMAN_LEG_LENGTH: 20,
    HUMAN_LEG_THICKNESS: 8,
    HUMAN_HEAD_WIDTH: 15,
    HUMAN_HEAD_HEIGHT: 15,
    HUMAN_NECK_THICKNESS: 8,
    HUMAN_NECK_LENGTH: 4,
    HUMAN_ARM_LENGTH: 25,
    HUMAN_ARM_THICKNESS: 5,
};

// Z-order constants
const Z_NAMES = [
    "Z_LABEL", "Z_MEOW", "Z_SPIKES", "Z_CAT", "Z_BULLET",
    "Z_PARTICLE", "Z_WATER", "Z_STRUCTURE", "Z_HUMAN", "Z_FLASH",
    "Z_HUD", "Z_CLAW",
];

function buildEngine() {
    // No-op stub for browser APIs
    const noop = () => {};
    const noopCanvas = {
        width: 0, height: 0,
        getContext: () => ({
            createPattern: () => ({ width: 0, height: 0 }),
        }),
    };

    const sandbox: Record<string, any> = {
        // Browser stubs
        DEBUG: 0,
        ctx: new Proxy({}, { get: () => noop }),
        can: noopCanvas,
        document: { createElement: () => noopCanvas, hasFocus: () => true },
        createCanvas: (_w: number, _h: number, _render: any) => noopCanvas,
        zzfx: noop,
        nomangle: (s: string) => s,
        navigator: { userAgent: "", platform: "", maxTouchPoints: 0 },
        CanvasRenderingContext2D: { prototype: {} },
        window: null as any, // set below
        inputMode: 0,
        G: { difficulty: { maxDeaths: Infinity, maxDamageTaken: 1, humanReactionTime: 0.2 } },
        console,
        Promise,
        Set,
        Object,
        Math,
        Infinity,
        // Will be populated by source files
        ...CONSTANTS,
    };

    // Z constants
    Z_NAMES.forEach((name, i) => { sandbox[name] = i; });

    // Make `window` point to sandbox so math.js can do window[n] = math[n]
    sandbox.window = sandbox;

    const context = vm.createContext(sandbox);

    // Load and run each source file
    for (const file of SOURCE_FILES) {
        const code = fs.readFileSync(path.join(SRC, file), "utf-8");
        try {
            vm.runInContext(code, context, { filename: file });
        } catch (err) {
            console.warn(`Warning loading ${file}:`, (err as Error).message);
        }
    }

    const deserializeWorld = sandbox.deserializeWorld as (data: any) => any;
    const serializeWorld = sandbox.serializeWorld as (world: any) => any;

    // serializeWorld is only defined when DEBUG is true in the original code.
    // Provide a fallback that mirrors the original logic.
    const serialize = serializeWorld ?? ((world: any) => {
        const serializedProperties = ["type", "x", "y", "angle", "matrix", "length", "text", "color", "depth"];
        const out: any[] = [];
        for (const entity of world.entities) {
            if (!entity.type) continue;
            const obj: any = {};
            for (const key of serializedProperties) {
                if (key in entity) obj[key] = entity[key];
            }
            out.push(obj);
        }
        return out;
    });

    return function getNextState(state: any, input: any): any {
        const world = deserializeWorld(state);
        let remaining = input.elapsedTime;
        while (remaining > 0) {
            const advance = Math.min(remaining, 1 / 120);
            remaining -= advance;
            world.cycle(advance, input.downKeys);
        }
        return serialize(world);
    };
}

export const getNextState = buildEngine();
