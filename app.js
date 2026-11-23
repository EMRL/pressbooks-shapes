const SVG_NS = "http://www.w3.org/2000/svg";
const CENTER = 300;
const controls = {
  rings: document.querySelector("#rings"),
  segments: document.querySelector("#segments"),
  spacing: document.querySelector("#spacing"),
  clearance: document.querySelector("#clearance"),
  dotSize: document.querySelector("#dot-size"),
  variation: document.querySelector("#variation"),
  scale: document.querySelector("#scale"),
  rotation: document.querySelector("#rotation"),
  colors: Array.from(document.querySelectorAll("[data-segment-color]")),
  dotColor: document.querySelector("#dot-color"),
  dotVisible: document.querySelector("#dot-visible"),
  dotX: document.querySelector("#dot-x"),
  dotY: document.querySelector("#dot-y"),
  background: document.querySelector("#background")
};
const outputs = {
  rings: document.querySelector("#rings-output"),
  segments: document.querySelector("#segments-output"),
  spacing: document.querySelector("#spacing-output"),
  clearance: document.querySelector("#clearance-output"),
  dotSize: document.querySelector("#dot-size-output"),
  variation: document.querySelector("#variation-output"),
  bandWidth: document.querySelector("#band-width-output"),
  scale: document.querySelector("#scale-output"),
  rotation: document.querySelector("#rotation-output"),
  dotX: document.querySelector("#dot-x-output"),
  dotY: document.querySelector("#dot-y-output")
};
const preview = document.querySelector("#shape-preview");
const art = document.querySelector("#shape-art");
const stage = document.querySelector("#preview-stage");
const segmentGrid = document.querySelector("#segment-grid");
const cellEditor = {
  label: document.querySelector("#selected-cell-label"),
  color: document.querySelector("#cell-color"),
  empty: document.querySelector("#cell-empty"),
  reset: document.querySelector("#reset-cell-color"),
  positionTitle: document.querySelector("#position-title"),
  x: document.querySelector("#segment-x"),
  y: document.querySelector("#segment-y"),
  xOutput: document.querySelector("#segment-x-output"),
  yOutput: document.querySelector("#segment-y-output")
};
const cellColors = new Map();
const emptyCells = new Set();
const segmentOffsets = new Map();
let selectedCell = { ring: 0, segment: 0 };

function cellKey(ring, segment) {
  return ring + ":" + segment;
}

function cellColor(settings, ring, segment) {
  return cellColors.get(cellKey(ring, segment)) || settings.colors[segment % settings.colors.length];
}

function selectCell(ring, segment) {
  selectedCell = { ring, segment };
  render();
}

function pointAt(radius, angle) {
  const radians = angle * Math.PI / 180;
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius
  };
}

function rounded(value) {
  return Number(value.toFixed(2));
}

function pointString(point) {
  return rounded(point.x) + " " + rounded(point.y);
}

function createRingSegment(outerRadius, innerRadius, startAngle, endAngle) {
  const span = endAngle - startAngle;
  if (innerRadius <= 0.01 && span >= 359.999) {
    const first = pointAt(outerRadius, startAngle);
    const opposite = pointAt(outerRadius, startAngle + 180);
    return "M " + pointString(first) + " A " + outerRadius + " " + outerRadius + " 0 1 1 " + pointString(opposite) + " A " + outerRadius + " " + outerRadius + " 0 1 1 " + pointString(first) + " Z";
  }
  if (innerRadius <= 0.01) {
    const outerStart = pointAt(outerRadius, startAngle);
    const outerEnd = pointAt(outerRadius, endAngle);
    return "M " + pointString(outerStart) + " A " + outerRadius + " " + outerRadius + " 0 " + (span > 180 ? 1 : 0) + " 1 " + pointString(outerEnd) + " L " + CENTER + " " + CENTER + " Z";
  }
  if (span >= 359.999) {
    const outerTop = pointAt(outerRadius, startAngle);
    const outerBottom = pointAt(outerRadius, startAngle + 180);
    const innerTop = pointAt(innerRadius, startAngle);
    const innerBottom = pointAt(innerRadius, startAngle + 180);
    return [
      "M " + pointString(outerTop),
      "A " + outerRadius + " " + outerRadius + " 0 1 1 " + pointString(outerBottom),
      "A " + outerRadius + " " + outerRadius + " 0 1 1 " + pointString(outerTop),
      "M " + pointString(innerTop),
      "A " + innerRadius + " " + innerRadius + " 0 1 0 " + pointString(innerBottom),
      "A " + innerRadius + " " + innerRadius + " 0 1 0 " + pointString(innerTop),
      "Z"
    ].join(" ");
  }

  const outerStart = pointAt(outerRadius, startAngle);
  const outerEnd = pointAt(outerRadius, endAngle);
  const innerEnd = pointAt(innerRadius, endAngle);
  const innerStart = pointAt(innerRadius, startAngle);
  const largeArc = span > 180 ? 1 : 0;

  return [
    "M " + pointString(outerStart),
    "A " + outerRadius + " " + outerRadius + " 0 " + largeArc + " 1 " + pointString(outerEnd),
    "L " + pointString(innerEnd),
    "A " + innerRadius + " " + innerRadius + " 0 " + largeArc + " 0 " + pointString(innerStart),
    "Z"
  ].join(" ");
}

function readSettings() {
  return {
    rings: Number(controls.rings.value),
    segments: Number(controls.segments.value),
    spacing: Number(controls.spacing.value),
    clearance: Number(controls.clearance.value) / 100,
    dotSize: Number(controls.dotSize.value) / 100,
    variation: Number(controls.variation.value) / 100,
    scale: Number(controls.scale.value) / 100,
    rotation: Number(controls.rotation.value),
    colors: controls.colors.map(function (input) { return input.value.toUpperCase(); }),
    dotColor: controls.dotColor.value.toUpperCase(),
    dotVisible: controls.dotVisible.checked,
    dotX: Number(controls.dotX.value),
    dotY: Number(controls.dotY.value),
    background: controls.background.checked
  };
}

function render() {
  const settings = readSettings();
  selectedCell.ring = Math.min(selectedCell.ring, settings.rings - 1);
  selectedCell.segment = Math.min(selectedCell.segment, settings.segments - 1);
  const outerRadius = 245 * settings.scale;
  const innerRadius = outerRadius * settings.clearance;
  const radialSpace = Math.max(1, outerRadius - innerRadius);
  const gap = Math.min(settings.spacing, radialSpace / (settings.rings * 2));
  const ringWidth = (radialSpace - gap * (settings.rings - 1)) / settings.rings;
  const dotRadius = outerRadius * settings.dotSize;
  const segmentAngle = 360 / settings.segments;
  art.replaceChildren();

  if (settings.background) {
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("width", "600");
    background.setAttribute("height", "600");
    background.setAttribute("fill", "#FFFFFF");
    art.append(background);
  }

  for (let ring = 0; ring < settings.rings; ring += 1) {
    const outer = outerRadius - ring * (ringWidth + gap);
    const inner = outer - ringWidth;

    for (let segment = 0; segment < settings.segments; segment += 1) {
      const ringJitter = settings.variation === 0 ? 0 : seededUnit(ring + 1) * 2 - 1;
      const offset = ringJitter * settings.variation * segmentAngle * 0.3;
      const start = 180 + settings.rotation + ring * offset + segment * segmentAngle;
      const end = 180 + settings.rotation + ring * offset + (segment + 1) * segmentAngle;
      const key = cellKey(ring, segment);
      if (emptyCells.has(key)) continue;
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", createRingSegment(outer, inner, start, end));
      path.setAttribute("fill", cellColor(settings, ring, segment));
      const segmentOffset = segmentOffsets.get(segment) || { x: 0, y: 0 };
      path.setAttribute("transform", "translate(" + segmentOffset.x + " " + segmentOffset.y + ")");
      const segmentOffset = segmentOffsets.get(segment) || { x: 0, y: 0 };
      path.setAttribute("transform", "translate(" + segmentOffset.x + " " + segmentOffset.y + ")");
      path.setAttribute("fill-rule", "evenodd");
      path.dataset.ring = String(ring + 1);
      path.dataset.segment = String(segment + 1);
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", "0");
      path.setAttribute("aria-label", "Ring " + (ring + 1) + ", group " + (segment + 1));
      if (selectedCell.ring === ring && selectedCell.segment === segment) path.classList.add("is-selected");
      path.addEventListener("click", function () { selectCell(ring, segment); });
      path.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCell(ring, segment);
        }
      });
      art.append(path);
    }
  }

  if (settings.dotVisible && settings.dotSize > 0) {
    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", String(CENTER + settings.dotX));
    core.setAttribute("cy", String(CENTER + settings.dotY));
    core.setAttribute("r", String(rounded(dotRadius)));
    core.setAttribute("fill", settings.dotColor);
    art.append(core);
  }

  outputs.rings.value = settings.rings + (settings.rings === 1 ? " ring" : " rings");
  outputs.segments.value = settings.segments + (settings.segments === 1 ? " segment" : " segments");
  outputs.spacing.value = settings.spacing + " px";
  outputs.clearance.value = Math.round(settings.clearance * 100) + "% of radius";
  outputs.dotSize.value = Math.round(settings.dotSize * 100) + "% of diameter";
  outputs.variation.value = Math.round(settings.variation * 100) + "%";
  outputs.bandWidth.value = rounded(ringWidth) + " px";
  outputs.scale.value = Math.round(settings.scale * 100) + "%";
  outputs.rotation.value = settings.rotation + "°";
  outputs.dotX.value = settings.dotX + " units";
  outputs.dotY.value = settings.dotY + " units";
  controls.colors.forEach(function (input) {
    input.closest(".palette-swatch").style.setProperty("--swatch", input.value);
  });
  document.querySelector("#shape-count").textContent = settings.rings + " RINGS";
  document.querySelector("#variation-readout").textContent = Math.round(settings.variation * 100) + "% VARIATION";
  stage.classList.toggle("has-background", settings.background);
  preview.querySelector("#shape-desc").textContent =
    settings.rings + " concentric rings divided into " + settings.segments + " colored segments, with " + Math.round(settings.variation * 100) + " percent variation.";
  renderSegmentEditor(settings);
  document.querySelectorAll('input[type="range"]').forEach(function (input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const percentage = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", percentage + "%");
  });
}

function renderSegmentEditor(settings) {
  selectedCell.ring = Math.min(selectedCell.ring, settings.rings - 1);
  selectedCell.segment = Math.min(selectedCell.segment, settings.segments - 1);
  segmentGrid.replaceChildren();
  segmentGrid.style.setProperty("--segment-columns", String(settings.segments));

  const heading = document.createElement("div");
  heading.className = "segment-grid-row segment-grid-heading";
  const corner = document.createElement("span");
  corner.className = "segment-grid-label";
  corner.textContent = "Ring";
  heading.append(corner);
  for (let segment = 0; segment < settings.segments; segment += 1) {
    const label = document.createElement("span");
    label.className = "segment-column-label";
    label.textContent = "G" + (segment + 1);
    heading.append(label);
  }
  segmentGrid.append(heading);

  for (let ring = 0; ring < settings.rings; ring += 1) {
    const row = document.createElement("div");
    row.className = "segment-grid-row";
    const rowLabel = document.createElement("span");
    rowLabel.className = "segment-grid-label";
    rowLabel.textContent = String(ring + 1);
    row.append(rowLabel);

    for (let segment = 0; segment < settings.segments; segment += 1) {
      const key = cellKey(ring, segment);
      const empty = emptyCells.has(key);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "segment-cell" + (empty ? " is-empty" : "");
      cell.style.setProperty("--cell-color", cellColor(settings, ring, segment));
      cell.textContent = empty ? "∅" : "";
      cell.setAttribute("aria-label", "Ring " + (ring + 1) + ", group " + (segment + 1) + (empty ? ", empty" : ", " + cellColor(settings, ring, segment)));
      cell.setAttribute("aria-pressed", String(selectedCell.ring === ring && selectedCell.segment === segment));
      if (selectedCell.ring === ring && selectedCell.segment === segment) cell.classList.add("is-selected");
      cell.addEventListener("click", function () { selectCell(ring, segment); });
      row.append(cell);
    }
    segmentGrid.append(row);
  }

  const selectedKey = cellKey(selectedCell.ring, selectedCell.segment);
  cellEditor.label.textContent = "Ring " + (selectedCell.ring + 1) + " · Group " + (selectedCell.segment + 1);
  cellEditor.color.value = cellColor(settings, selectedCell.ring, selectedCell.segment);
  cellEditor.empty.checked = emptyCells.has(selectedKey);
  cellEditor.reset.disabled = !cellColors.has(selectedKey);
  const position = segmentOffsets.get(selectedCell.segment) || { x: 0, y: 0 };
  cellEditor.positionTitle.textContent = "Move selected group " + (selectedCell.segment + 1);
  cellEditor.x.value = String(position.x);
  cellEditor.y.value = String(position.y);
  cellEditor.xOutput.value = position.x + " units";
  cellEditor.yOutput.value = position.y + " units";
}

function attachNumericInputs() {
  document.querySelectorAll('input[type="range"]').forEach(function (range) {
    const number = document.createElement("input");
    number.type = "number";
    number.className = "range-number";
    number.min = range.min;
    number.max = range.max;
    number.step = range.step;
    number.value = range.value;
    const label = document.querySelector('label[for="' + range.id + '"]');
    number.setAttribute("aria-label", (label ? label.textContent : range.name) + " numeric value");
    const row = document.createElement("div");
    row.className = "range-input-row";
    range.parentNode.insertBefore(row, range);
    row.append(range, number);
    range.addEventListener("input", function () { number.value = range.value; });
    number.addEventListener("input", function () {
      if (number.value === "") return;
      const value = Math.max(Number(range.min), Math.min(Number(range.max), Number(number.value)));
      range.value = String(value);
      number.value = range.value;
      render();
    });
    number.addEventListener("change", function () {
      const value = number.value === "" ? Number(range.value) : Math.max(Number(range.min), Math.min(Number(range.max), Number(number.value)));
      range.value = String(value);
      number.value = range.value;
      render();
    });
  });
}

function seededUnit(value) {
  const x = Math.sin(value * 127.1 + 4821) * 43758.5453;
  return x - Math.floor(x);
}

function buildExportSvg() {
  const clone = preview.cloneNode(true);
  clone.querySelector("#shape-title")?.remove();
  clone.querySelector("#shape-desc")?.remove();
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", "600");
  clone.setAttribute("height", "600");
  clone.setAttribute("role", "img");
  clone.setAttribute("aria-labelledby", "export-title export-desc");

  const title = document.createElementNS(SVG_NS, "title");
  title.setAttribute("id", "export-title");
  title.textContent = "Pressbooks Shapes concentric ring composition";
  const description = document.createElementNS(SVG_NS, "desc");
  description.setAttribute("id", "export-desc");
  description.textContent = controls.rings.value + " concentric rings and " + controls.segments.value + " segments.";
  clone.insertBefore(description, clone.firstChild);
  clone.insertBefore(title, clone.firstChild);

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function downloadSvg() {
  const blob = new Blob([buildExportSvg()], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pressbooks-concentric-rings.svg";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

Object.values(controls).forEach(function (control) {
  if (Array.isArray(control)) {
    control.forEach(function (input) { input.addEventListener("input", render); });
  } else if (control && control.type !== "checkbox" && control.type !== "color") {
    control.addEventListener("input", render);
  } else if (control) {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  }
});
document.querySelector("#download-svg").addEventListener("click", downloadSvg);
function updateSegmentOffset(axis, value) {
  const current = segmentOffsets.get(selectedCell.segment) || { x: 0, y: 0 };
  segmentOffsets.set(selectedCell.segment, { ...current, [axis]: Number(value) });
  render();
}
cellEditor.x.addEventListener("input", function () { updateSegmentOffset("x", cellEditor.x.value); });
cellEditor.y.addEventListener("input", function () { updateSegmentOffset("y", cellEditor.y.value); });
attachNumericInputs();
cellEditor.color.addEventListener("input", function () {
  cellColors.set(cellKey(selectedCell.ring, selectedCell.segment), cellEditor.color.value.toUpperCase());
  render();
});
cellEditor.empty.addEventListener("change", function () {
  const key = cellKey(selectedCell.ring, selectedCell.segment);
  if (cellEditor.empty.checked) emptyCells.add(key);
  else emptyCells.delete(key);
  render();
});
cellEditor.reset.addEventListener("click", function () {
  cellColors.delete(cellKey(selectedCell.ring, selectedCell.segment));
  render();
});
render();
