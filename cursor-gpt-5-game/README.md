# Avengers Mahjong (Mahjong Solitaire)

A self-contained browser game: match pairs of identical Avengers character tiles. Only free tiles (no tile on top and at least one side open) can be selected.

## How to run

- Option 1: Open `index.html` directly in your browser.
- Option 2 (recommended): Serve the folder locally to avoid any cross-origin quirks.

```bash
python3 -m http.server 5173
# then open http://localhost:5173/cursor-gpt-5-game/
```

## Controls

- New Game: Start a new game with the currently selected layout (or a random one if "Random Layout" is chosen).
- Undo: revert the last matched pair
- Redo: re-apply the last undone move
- Hint: highlights a pair and shows a descriptive message with coordinates and open sides
- Shuffle: re-arranges the faces of all remaining tiles if you get stuck.

## Notes

- Layout contains 144 tiles (36 Avengers names, 4 copies each).
- The game does not guarantee solvable deals, similar to many classic Mahjong Solitaire implementations.
- Tiles now feature metallic-themed designs with cartoon Avengers images and character names as labels, enhanced with a celebratory confetti effect on matches.
