class WorldScreen extends Screen {
    absorb = true;

    constructor(serializedWorld) {
        super();

        this.replayState = serializedWorld;
        this.serializedWorld = getReplayWorldData(serializedWorld);

        if (DEBUG) {
            this.debugValues = () => {
                const vals = [`Entities: ${this.world.entities.length}`];
                for (const camera of this.world.category('camera')) {
                    vals.push([`Camera: ${camera.x.toFixed(0)},${camera.y.toFixed(0)}`]);
                }
                for (const cat of this.world.category('cat')) {
                    vals.push([`Cat: ${cat.x.toFixed(0)},${cat.y.toFixed(0)}`]);
                }
                return vals;
            };
        }

        this.world = deserializeWorld(this.serializedWorld);

        if (this.replayState?.entityAges) {
            let ageIndex = 0;
            for (const entity of this.world.entities) {
                if (entity.type) entity.age = this.replayState.entityAges[ageIndex++] || 0;
            }
        }

        const camera = this.world.addEntity(new Camera());
        const cat = firstItem(this.world.category('cat'));
        if (cat) {
            this.world.addEntity(new HUD(cat));

            camera.target = cat;
            camera.x = cat.x;
            camera.y = cat.y - 200;
        }

        if (this.replayState?.camera) {
            const cameraState = this.replayState.camera;
            camera.x = cameraState.x;
            camera.y = cameraState.y;
            camera.zoom = cameraState.zoom;
            camera.age = cameraState.age || 0;
            camera.shakeEndAge = cameraState.shakeEndAge;
            camera.shakePower = cameraState.shakePower;

            if (cat) camera.target = cat;

            for (const interpState of cameraState.interpolators || []) {
                const easing = interpState.easing == 'easeInQuad' ? easeInQuad : linear;
                const interpolator = this.world.addEntity(new Interpolator(
                    camera,
                    interpState.property,
                    interpState.fromValue,
                    interpState.toValue,
                    interpState.duration,
                    easing,
                ));
                interpolator.age = interpState.age || 0;
                interpolator.cycle(0, {});
            }
        }
    }

    cycle(elapsed, downKeys) {
        super.cycle(elapsed, downKeys);

        let remaining = elapsed;
        while (remaining > 0) {
            // hard-locked to min-120 tick rate
            const advance = min(remaining, 1 / 120);
            remaining -= advance;
            this.world.cycle(advance, downKeys);
        }
    }

    render() {
        super.render();
        ctx.wrap(() => this.world.render());
    }
}
