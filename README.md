# Pressbooks Shapes

Pressbooks Shapes is a browser-based tool for building vector compositions.

## Run locally

Open the index.html file in a modern browser.
The app does not require a build step or package installation.

## Concentric composition

Set the number of rings and colour groups, then tune the spacing and clear
area at the centre. The editor keeps the preview bounded beside the core controls,
with group and section editing across the full width below. Less frequently used
adjustments are under Advanced settings. Band width is calculated from the ring
count, spacing, and inner clearance. The centre dot can be hidden, resized,
recoloured, and moved independently.

Variation is deterministic and starts at 0%, so the initial composition keeps
evenly aligned groups. Increase it to introduce increasingly visible per-ring
rotation. Whole-composition rotation turns the complete design inside the artboard;
each group can also be moved horizontally or vertically and rotated independently.
Edit the group palette and scale to explore other arrangements.

Use the individual sections grid to select a ring-and-group cell. Change its
colour, leave it empty, or restore the shared group colour. You can also empty
every section in a group at once. Enable **Knock out group overlaps** to make
areas shared by different groups transparent. Clicking a visible section in the
preview selects the same cell in the grid. Numeric fields sit
beside every slider for precise values. The artwork starts at 100% scale so it
fits inside the artboard.

Select **Download SVG** to save a 600 by 600 vector file.
The background stays transparent unless you enable the background control.
