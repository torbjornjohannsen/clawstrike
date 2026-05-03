import { StateRecorder } from "bachelor";

class Game {

    bestRunTime = parseInt(localStorage[nomangle("bt")]) || 0;
    screens = [];
    difficulty = inputMode == INPUT_MODE_TOUCH ? DIFFICULTY_EASY : DIFFICULTY_NORMAL;
    recorder = new StateRecorder(async (initReq) => {
            await fetch("http://localhost:9090/initial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initReq),
            });
            return initReq.guid;
        },
        async (inProgReq) => {
            await fetch("http://localhost:9090/in-progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(inProgReq),
            });
        },
        100);

    constructor() {
        if (DEBUG) {
            this.lastFrameIndex = 0;
            this.frameTimes = Array(60).fill(0);
            this.fpsBuffer = [];
            setInterval(() => {
                if (this.fpsBuffer.length === 0) return;
                fetch('http://localhost:9090/fps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fps: this.fpsBuffer }) }).catch(() => {});
                this.fpsBuffer = [];
            }, 60_000);
        }
        
        this.gameStarted = false; 

        if (DEBUG) {
            const params = new URLSearchParams(location.search);
            if (params.get('level')) {
                ALL_LEVELS = [JSON.parse(params.get('level'))];
            }
        }

        this.frame();
        setTimeout(async () => {
            await this.navigate(new IntroScreen()).awaitCompletion();
            this.startNavigation();
        }, 0);
    }

    async startNavigation() {
        let promptedEasyMode;
        while (true) {
            this.runTime = this.runLevelIndex = this.runDeaths = 0;

            const currentIndex = DIFFICULTIES.indexOf(this.difficulty);
            if (currentIndex < 0) this.difficulty = DIFFICULTY_NORMAL;

            for (let level = 0 ; level < ALL_LEVELS.length; level++) {
                this.runLevelIndex = level;

                for (let attempt = 0; ; attempt++) {
                    this.gameStarted = false; 
                    try {
                        // sets it to only have this one new gameplay screen 0
                        // levels are the data in the level/levels/ folder
                        const gameplay = this.navigate(new GameplayScreen(ALL_LEVELS[level]), true);
                        if (!attempt && !level) this.navigate(new MainMenuScreen(gameplay));
                        //else if (this.replayInputs != null) this.recorder.Initialize(serializeWorld(deserializeWorld(ALL_LEVELS[level])))

                        // Reveal the level
                        this.navigate(new TransitionScreen(0, -1)).awaitCompletion();
                        this.gameStarted = true; 
                        await gameplay.awaitCompletion();
                        this.recorder.Reset();

                        break;
                    } catch (err) {
                        console.log("Err:",err)
                        this.runDeaths++;
                        this.recorder.Reset();

                        if (this.runDeaths < this.difficulty.maxDeaths) {
                            await this.navigate(new GameOverScreen()).awaitCompletion();

                            if (this.difficulty == DIFFICULTY_NORMAL && attempt >= 5 && !promptedEasyMode) {
                                if (confirm(nomangle('Switch to easy mode?'))) {
                                    this.difficulty = DIFFICULTY_EASY;
                                }
                                promptedEasyMode = true;
                            }

                            this.screens = []; // Fix flickering
                        } else {
                            await this.navigate(new FullGameOverScreen()).awaitCompletion();
                            await this.startNavigation();
                        }
                    }

                    // Hide the level
                    await this.navigate(new TransitionScreen(1, 0)).awaitCompletion();
                }
            }

            this.bestRunTime = min(this.bestRunTime || 9999, this.runTime);
            localStorage[nomangle("bt")] = this.bestRunTime;

            const blankScreen = this.navigate(new WorldScreen([]));
            await this.navigate(new RevengeScreen()).awaitCompletion();
            await this.navigate(new GameCompleteScreen(blankScreen)).awaitCompletion();
        }
    }

    startReplay(session) {
        this.navigate(new GameplayScreen(session.initial), true);
        this.navigate(new TransitionScreen(0, -1)).awaitCompletion();
        this.replayInputs = session.inputs;
        this.replayIndex = 0;
    }

    stopReplay() {
        this.replayInputs = null;
        this.screens = [];
        this.startNavigation();
    }

    get recordableGameplay() {
        if (!this.gameStarted) return null;

        for (let i = this.screens.length; this.screens[--i];) {
            const screen = this.screens[i];
            if (screen instanceof GameplayScreen) {
                return screen.world.category('cat').size ? screen : null;
            }
            if (!(screen instanceof TransitionScreen)) return null;
        }
    }

    /** @type {import("bachelor").GetNextState} */
    getNextState(world, input) {
        const qwe = deserializeWorld(getReplayWorldData(world))
        let remaining = input.elapsedTime;
        while (remaining > 0) {
            const advance = min(remaining, 1 / 120);
            remaining -= advance;
            qwe.cycle(advance, input.downKeys);
        }
        return serializeWorld(qwe);
    }

    async advanceScreens(elapsed, keys, isReplay) {
        const recordableGameplay = isReplay ? null : this.recordableGameplay;

        let i = this.screens.length;
        while (this.screens[--i]) {
            const screen = this.screens[i];
            if (screen === recordableGameplay) {
                if (!this.recorder.IsInitialized()) {
                    // Lazy initialization - will be inefficient but ensures we only initialize at the point when we should. 
                    await this.recorder.Initialize(serializeReplayState(screen.world));
                }
                    
                await this.recorder.RecordUserInput({
                    elapsedTime: elapsed,
                    downKeys: keys,
                });
            }
            screen.cycle(elapsed, keys);
            if (screen.absorb) break;
        }
    }

    async logicStep(elapsed) {
        if (this.replayInputs) {
            if (downKeys[77]) {
                this.stopReplay();
                return;
            }

            if (this.replayIndex < this.replayInputs.length) {
                const stored = this.replayInputs[this.replayIndex++].userInput;
                await this.advanceScreens(stored.elapsedTime, stored.downKeys, true);
            } else {
                this.replayInputs = null;
                this.navigate(new ReplayEndScreen());
            }
        } else {
            const keysSnapshot = {...downKeys};
            
            if (DEBUG) {
                if (keysSnapshot[71]) advanceElapsed *= 0.1;
                if (keysSnapshot[70]) advanceElapsed *= 4;
            }
            if (elapsed < 1/60) return;
            await this.advanceScreens(1/60, keysSnapshot, false);
        }
    }

    renderStep(now) {
        ctx.miterLimit = 2;

        for (const screen of this.screens) {
            ctx.wrap(() => screen.render());
        }

        if (DEBUG) ctx.wrap(() => {
            this.frameTimes[this.lastFrameIndex] = now;
            const nextIndex = (this.lastFrameIndex + 1) % this.frameTimes.length;
            const fps = (this.frameTimes.length - 1) / ((now - this.frameTimes[nextIndex]) / 1000);
            this.lastFrameIndex = nextIndex;
            this.fpsBuffer.push(fps);

            ctx.translate(10, 10);
            ctx.font = '20px Courier';
            ctx.textAlign = nomangle('left');
            ctx.textBaseline = nomangle('middle');
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#000';
            ctx.shadowOffsetY = 2;

            const debugValues = [
                `FPS: ${fps.toFixed(1)}`,
            ]

            for (const screen of this.screens) {
                debugValues.push(...screen.debugValues());
            }

            for (const value of debugValues) {
                ctx.fillText(value, 0, 0);
                ctx.translate(0, 20);
            }
        });
    }

    async frame() {
        const now = performance.now();
        const elapsed = now - this.lastFrame;
        this.lastFrame = now;

        if (!DEBUG || document.hasFocus()) {
            await this.logicStep(elapsed);
            this.renderStep(now);
        }
        // Will try to match the refresh rate of the display. 
        requestAnimationFrame(() => this.frame());
    }

    navigate(screen, reset) {
        if (reset) this.screens = [];
        this.screens.push(screen);
        return screen;
    }
}
