# Pressbooks Shapes

Pressbooks Shapes is a browser-based tool for building vector compositions.

## Run locally

Open the index.html file in a modern browser.
The app does not require a build step or package installation.

## Concentric composition

Set the number of rings and colour segments, then tune the spacing and clear
area at the centre. Band width is calculated from the ring count, spacing, and
inner clearance. The centre dot has its own size and colour controls.

Variation is deterministic and starts at 0%, so the initial composition keeps
evenly aligned segments. Increase it to introduce subtle per-ring rotation.
Edit the segment palette, rotation, and scale to explore other arrangements.

Use the individual sections grid to select a ring-and-segment cell. Change its
colour, leave it empty, or restore the shared quadrant colour. Clicking a
visible segment in the preview selects the same cell in the grid. Move a selected segment horizontally or vertically; the shift applies to that segment across all rings. The artwork starts at 100% scale so it fits inside the artboard.

Select **Download SVG** to save a 600 by 600 vector file.
The background stays transparent unless you enable the background control.
