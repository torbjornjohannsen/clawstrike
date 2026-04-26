class MainMenuScreen extends MenuScreen {

    title = document.title;

    constructor(worldScreen, stateRecorder) {
        super();

        this.worldScreen = worldScreen;
        this.stateRecorder = stateRecorder
        this.isReplay = false

        this.addCommand(
            inputMode == INPUT_MODE_KEYBOARD
                ? nomangle('PRESS [SPACE] TO START')
                : nomangle('[TAP] TO START'),
            () => this.downKeys?.[32] || TOUCH_DOWN,
            () => this.startGame(),
            false,
        );

        if (inputMode == INPUT_MODE_KEYBOARD) {
            if (G.bestRunTime) {
                this.addCommand(
                    nomangle('PRESS [9] TO START 9 LIVES MODE'),
                    () => this.downKeys?.[57],
                    () => {
                        G.difficulty = DIFFICULTY_NINE_LIVES;
                        this.startGame();
                    },
                );
            }
            this.addDifficultyChangeCommand();

            this.addCommand(
                nomangle('PRESS [R] FOR REPLAYS'),
                () => this.downKeys?.[82],
                () => {
                    this.isReplay = true; 
                    G.navigate(new ReplayListScreen());
                },
            );
        }

        if (DEBUG) {
            this.addCommand(
                nomangle('PRESS [E] TO ENTER LEVEL EDITOR'),
                () => this.downKeys?.[69], // nice
                () => G.navigate(new LevelEditorScreen(ALL_LEVELS[0]), true),
            );
        }

        const { world } = worldScreen;

        const cat = firstItem(worldScreen.world.category('cat'));
        const camera = firstItem(worldScreen.world.category('camera'));
        camera.zoom = 3;
        camera.target = new Entity();
        camera.x = camera.target.x = cat.x;
        camera.y = camera.target.y = cat.y - 20;

        for (const hud of world.category('hud')) {
            world.removeEntity(hud);
        }

        worldScreen.cycle(2, {});

        (async () => {
            const flash = world.addEntity(new Flash('#000'));

            await flash.interp('', 0, 0, 0.3);

            for (const angle of [PI / 8, PI * 3 / 4, PI / 4]) {
                camera.shake(0.1, 5);

                const claw = world.addEntity(new ClawEffect());
                claw.x = camera.target.x;
                claw.y = camera.target.y;
                claw.angle = angle;
                claw.scale = 5;

                await flash.interp('_', 0, 0, 0.3);
            }

            await flash.interp('_', 0, 0, 0.5);
            await flash.interp('alpha', 1, 0, 1);
        })();
    }

    startGame() {
        // TODO fade out instead
        G.screens.pop();
        playSong();

        const { world } = this.worldScreen;
        const cat = firstItem(world.category('cat'));
        const camera = firstItem(world.category('camera'));
        camera.target = cat;

        (async () => {
            await camera.interp('zoom', camera.zoom, 1.3, 2, easeInQuad);
            world.addEntity(new HUD(cat));

            if (!this.isReplay){
                this.stateRecorder.Initialize(serializeWorld(world))
            }
        })();

        G.runTime = 0;
    }

    cycle(elapsed, downKeys) {
        super.cycle(elapsed, downKeys);

        // Only allow space bar — mutate the per-frame snapshot so
        // screens below us only see space
        for (const key in downKeys) {
            if (key != 32) delete downKeys[key];
        }
    }

    renderTitle() {
        ctx.wrap(() => {
            this.claw ||= (() => {
                const claw = new ClawEffect();
                claw.x = CANVAS_WIDTH / 2;
                claw.y = CANVAS_HEIGHT / 3 - 20;
                claw.age = 0.5;
                claw.angle = -PI / 6;
                claw.scale = 12;
                claw.color = '#f00';
                return claw;
            })();
            this.claw.render();
        });
        super.renderTitle();
    }

    render() {
        ctx.globalAlpha = interpolate(0, 1, min(this.age - 2.1) / 0.3);
        super.render();
    }
}
