class ReplayListScreen extends Screen {
    absorb = true;
    sessions = null;
    selectedIndex = 0;
    loading = false;

    constructor() {
        super();

        this.addCommand(
            '',
            () => this.downKeys?.[38],
            () => {
                if (this.sessions) this.selectedIndex = max(0, this.selectedIndex - 1);
            },
        );

        this.addCommand(
            '',
            () => this.downKeys?.[40],
            () => {
                if (this.sessions) this.selectedIndex = min(this.sessions.length - 1, this.selectedIndex + 1);
            },
        );

        this.addCommand(
            '',
            () => (this.downKeys?.[32] || this.downKeys?.[13]) && this.sessions?.length,
            () => this.selectCurrent(),
            false,
        );

        this.addCommand(
            '',
            () => this.downKeys?.[27],
            () => this.pop(),
            false,
        );

        this.fetchSessions();
    }

    async fetchSessions() {
        try {
            const res = await fetch(nomangle('http://localhost:9090/sessions'));
            this.sessions = await res.json();
            this.selectedIndex = 0;
        } catch (e) {
            this.sessions = [];
        }
    }

    async selectCurrent() {
        if (this.loading) return;
        const session = this.sessions[this.selectedIndex];
        if (!session) return;
        this.loading = true;
        try {
            const res = await fetch(nomangle('http://localhost:9090/session?guid=') + session.guid);
            const data = await res.json();
            this.pop();
            G.startReplay(data);
        } catch (e) {
            this.loading = false;
        }
    }

    render() {
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.wrap(() => {
            ctx.translate(CANVAS_WIDTH / 2, 70);
            ctx.font = nomangle('bold 56px Impact');
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 8;
            ctx.textAlign = nomangle('center');
            ctx.textBaseline = nomangle('middle');
            ctx.strokeText(nomangle('REPLAYS'), 0, 0);
            ctx.fillText(nomangle('REPLAYS'), 0, 0);
        });

        if (!this.sessions) {
            ctx.wrap(() => {
                ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                ctx.font = nomangle('32px Impact');
                ctx.fillStyle = '#fff';
                ctx.textAlign = nomangle('center');
                ctx.textBaseline = nomangle('middle');
                ctx.fillText(nomangle('Loading...'), 0, 0);
            });
            return;
        }

        if (this.sessions.length === 0) {
            ctx.wrap(() => {
                ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                ctx.font = nomangle('32px Impact');
                ctx.fillStyle = '#fff';
                ctx.textAlign = nomangle('center');
                ctx.textBaseline = nomangle('middle');
                ctx.fillText(nomangle('No replays found'), 0, 0);
                ctx.translate(0, 50);
                ctx.font = nomangle('24px Impact');
                ctx.fillStyle = '#aaa';
                ctx.fillText(nomangle('Press [ESC] to go back'), 0, 0);
            });
            return;
        }

        const itemHeight = 50;
        const listTop = 140;
        const maxVisible = floor((CANVAS_HEIGHT - listTop - 60) / itemHeight);
        const startIdx = max(0, this.selectedIndex - floor(maxVisible / 2));

        ctx.wrap(() => {
            ctx.translate(0, listTop);
            for (let i = startIdx; i < min(this.sessions.length, startIdx + maxVisible); i++) {
                const session = this.sessions[i];
                const y = (i - startIdx) * itemHeight + itemHeight / 2;
                const isSelected = i === this.selectedIndex;

                if (isSelected) {
                    ctx.fillStyle = '#ff0';
                    ctx.fillRect(0, y - itemHeight / 2, CANVAS_WIDTH, itemHeight);
                }

                const label = session.guid.slice(0, 8) + nomangle('  —  ') + session.created_at;
                ctx.font = nomangle('28px Impact');
                ctx.fillStyle = isSelected ? '#000' : '#fff';
                ctx.textAlign = nomangle('center');
                ctx.textBaseline = nomangle('middle');
                ctx.fillText(label, CANVAS_WIDTH / 2, y);
            }
        });

        ctx.wrap(() => {
            ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
            ctx.font = nomangle('22px Impact');
            ctx.fillStyle = '#aaa';
            ctx.textAlign = nomangle('center');
            ctx.textBaseline = nomangle('middle');
            ctx.fillText(
                this.loading
                    ? nomangle('Loading replay...')
                    : nomangle('[UP/DOWN] navigate   [SPACE] watch   [ESC] back'),
                0, 0,
            );
        });
    }
}
