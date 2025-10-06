# Vector Practice (Front-end Only)

A lightweight, no-framework web app to give students practice with 2D vectors. Students are given two vectors, draw them and their sum on paper, then can reveal the solution shown in two equivalent renderings:

- Standard position: a, b, and a+b from the origin
- Tip-to-tail: a then b starting at the tip of a, plus the resultant a+b from the origin

## How to run

Just open `index.html` in a browser. No build step, no dependencies.

## Features

- Enter or randomize integer vectors `a = (ax, ay)` and `b = (bx, by)`
- Adjustable randomization range
- Reveal/Hide answers
- Two canvas plots with axes and grid
- Crisp rendering on high-DPI displays

## Files

- `index.html` — main page and UI
- `style.css` — styling for layout and canvases
- `script.js` — logic for vectors, randomization, and drawing

## Notes

- Charting libraries aren't required for this use case; rendering is done directly on `<canvas>` for precision and interactivity.
