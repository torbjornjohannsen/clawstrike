class WorldScreen extends Screen {
    absorb = true;

    constructor(serializedWorld) {
        super();

        this.serializedWorld = serializedWorld;

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

        const camera = this.world.addEntity(new Camera());
        const cat = firstItem(this.world.category('cat'));
        if (cat) {
            this.world.addEntity(new HUD(cat));

            camera.target = cat;
            camera.x = cat.x;
            camera.y = cat.y - 200;
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
