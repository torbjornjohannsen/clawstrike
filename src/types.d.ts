/**
 * User input captured each frame for replay.
 * Key codes: 37=left, 38=up, 39=right, 40=down
 */
export interface UserInput {
    /** Frame elapsed time in seconds */
    elapsed: number;
    /** Keys currently held (key code -> boolean) */
    keys: Record<number, boolean>;
}

/**
 * Initial game state for replay.
 * Captured at the start of a recording session.
 */
export interface GameState {
    /** Index of the current level */
    levelIndex: number;
    /** Serialized level data */
    level: unknown;
    /** Difficulty setting */
    difficulty: string;
}
