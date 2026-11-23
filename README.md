# Pressbooks Shapes

Pressbooks Shapes is a browser-based tool for building vector compositions.

## Run locally

Open the index.html file in a modern browser.
The app does not require a build step or package installation.

## Concentric composition

Set the number of rings and colour groups, then tune the spacing and clear
area at the centre. Band width is calculated from the ring count, spacing, and
inner clearance. The centre dot can be hidden, resized, recoloured, and moved independently.

Variation is deterministic and starts at 0%, so the initial composition keeps
evenly aligned groups. Increase it to introduce subtle per-ring rotation.
Edit the group palette, rotation, and scale to explore other arrangements. Each group can be moved horizontally or vertically across all rings.

Use the individual sections grid to select a ring-and-group cell. Change its
colour, leave it empty, or restore the shared group colour. Clicking a visible
section in the preview selects the same cell in the grid. Numeric fields sit
beside every slider for precise values. The artwork starts at 100% scale so it
fits inside the artboard.

Select **Download SVG** to save a 600 by 600 vector file.
The background stays transparent unless you enable the background control.
