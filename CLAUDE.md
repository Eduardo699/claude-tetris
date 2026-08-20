# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page Tetris implementation in vanilla JavaScript (ES6+) with HTML5 Canvas rendering. No dependencies, no build step, no package manager — the entire game is three files: `index.html`, `style.css`, `game.js`.

## Running the game

There is no build/lint/test tooling. Just open or serve the HTML file:

```bash
start index.html        # Windows: open directly
python3 -m http.server 8000   # or serve locally, then visit http://localhost:8000
npx serve .
```

Changes to `game.js`/`style.css`/`index.html` take effect on browser reload — no compilation step.

## Architecture

Everything lives in `game.js` as top-level state and functions operating on module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`). There are no classes or modules — it's a straightforward procedural game loop.

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index `1–7`.
- **Pieces**: `PIECES` holds the 7 tetromino shapes as square matrices. Rotation (`rotateCW`) is a transpose + row-reverse, not per-shape lookup tables.
- **Collision** (`collide`): bounds + board-overlap check, reused for movement, rotation, and ghost-piece projection.
- **Wall kicks** (`tryRotate`): on rotation collision, tries horizontal offsets `[0, -1, 1, -2, 2]` before giving up on the rotation.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time (`dropAccum`) against `dropInterval` to decide when to drop the current piece a row.
- **Locking/clearing**: `lockPiece` → `merge` (bake piece into `board`) → `clearLines` (bottom-up full-row sweep, unshifts empty rows) → `spawn` (promote `next` to `current`, generate new `next`; if the new piece immediately collides, `endGame()` fires).
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row traveled, soft drop 1 pt/row. Level increments every 10 lines cleared, and `dropInterval = max(100, 1000 - (level - 1) * 90)`.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost piece (`ghostY()` projects straight down, drawn at `globalAlpha = 0.2`), and the current piece each frame. `drawNext()` renders the preview piece on a separate small canvas (`#next-canvas`).
- **Input**: a single `keydown` listener switches on `e.code` (arrows move/rotate/soft-drop, `Space` hard-drops, `KeyP` toggles pause). Input is ignored while `paused` or `gameOver`.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (px per cell), `COLORS` (per-piece-type palette), `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

## File responsibilities

- `index.html` — DOM structure: main board canvas, side panel (score/lines/level/next-piece canvas/controls), pause/game-over overlay.
- `style.css` — dark/retro arcade visual theme; flexbox layout; overlay uses `backdrop-filter`.
- `game.js` — all game logic and rendering, described above.
