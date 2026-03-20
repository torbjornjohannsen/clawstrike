class PauseScreen extends MenuScreen {

    title = nomangle('PAUSED');
    songVolume = 0.2;
    absorb = true;

    constructor() {
        super();
        this.addCommand(
            nomangle('PRESS [ESC] TO RESUME'),
            () => this.downKeys?.[27],
            () => this.resolve(),
        );
        this.addDifficultyChangeCommand();
        this.addMainMenuCommand();
    }
}
