const BRAND_PALETTE = [
  { name: "Publish", colors: [["20", "#f1d2d4"], ["40", "#e4a6a8"], ["60", "#d6797d"], ["80", "#c94d51"], ["100", "#bb2026"], ["120", "#922723"]] },
  { name: "Pathways", colors: [["20", "#dfedf0"], ["40", "#bedae0"], ["60", "#9ec8d1"], ["80", "#7db5c1"], ["100", "#5da3b2"], ["120", "#4a828e"]] },
  { name: "Directory", colors: [["20", "#fdefd3"], ["40", "#fbdfa7"], ["60", "#f8cf7b"], ["80", "#f6bf4f"], ["100", "#f4af23"], ["120", "#c38c1c"]] },
  { name: "Exchange", colors: [["20", "#ccede5"], ["40", "#99dbcb"], ["60", "#66c8b1"], ["80", "#33b697"], ["100", "#00a47d"], ["120", "#008364"]] },
  { name: "Commons Dark", colors: [["20", "#d3d4d4"], ["40", "#a8a9aa"], ["60", "#7c7e7f"], ["80", "#515355"], ["100", "#25282a"], ["120", "#000000"]] },
  { name: "Commons Light", colors: [["20", "#edeeee"], ["40", "#dcdcdd"], ["60", "#cacbcb"], ["80", "#b9b9ba"], ["100", "#a7a8a9"], ["120", "#868687"]] }
];
const DEFAULT_GROUP_COLOURS = ["#bb2026", "#5da3b2", "#f4af23", "#00a47d"];

function populatePaletteSelect(select, defaultColour) {
  BRAND_PALETTE.forEach(function (family) {
    const group = document.createElement("optgroup");
    group.label = family.name;
    family.colors.forEach(function (entry) {
      const option = document.createElement("option");
      option.value = entry[1].toUpperCase();
      option.textContent = entry[0] + " · " + entry[1].toUpperCase();
      group.append(option);
    });
    select.append(group);
  });
  select.value = defaultColour.toUpperCase();
}
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
  background: document.querySelector("#background"),
  excludeOverlaps: document.querySelector("#exclude-overlaps")
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
  groupEmpty: document.querySelector("#group-empty"),
  reset: document.querySelector("#reset-cell-color"),
  positionTitle: document.querySelector("#position-title"),
  x: document.querySelector("#segment-x"),
  y: document.querySelector("#segment-y"),
  rotation: document.querySelector("#group-rotation"),
  rotationOutput: document.querySelector("#group-rotation-output"),
  xOutput: document.querySelector("#segment-x-output"),
  yOutput: document.querySelector("#segment-y-output")
};
const cellColors = new Map();
const emptyCells = new Set();
const emptyGroups = new Set();
const segmentOffsets = new Map();
const segmentRotations = new Map();
const rangeNumbers = new Map();
controls.colors.forEach(function (select, index) {
  populatePaletteSelect(select, DEFAULT_GROUP_COLOURS[index % DEFAULT_GROUP_COLOURS.length]);
});
populatePaletteSelect(controls.dotColor, "#a7a8a9");
populatePaletteSelect(cellEditor.color, "#bb2026");
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
    background: controls.background.checked,
    excludeOverlaps: controls.excludeOverlaps.checked
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
  art.setAttribute("transform", "rotate(" + settings.rotation + " " + CENTER + " " + CENTER + ")");

  if (settings.background) {
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("width", "600");
    background.setAttribute("height", "600");
    background.setAttribute("fill", "#EDEEEE");
    art.append(background);
  }

  const drawnSegments = [];
  for (let ring = 0; ring < settings.rings; ring += 1) {
    const outer = outerRadius - ring * (ringWidth + gap);
    const inner = outer - ringWidth;

    for (let segment = 0; segment < settings.segments; segment += 1) {
      const ringJitter = settings.variation === 0 ? 0 : seededUnit(ring + 1) * 2 - 1;
      const offset = ringJitter * settings.variation * segmentAngle * 0.3;
      const groupRotation = segmentRotations.get(segment) || 0;
      const start = 180 + groupRotation + ring * offset + segment * segmentAngle;
      const end = 180 + groupRotation + ring * offset + (segment + 1) * segmentAngle;
      const key = cellKey(ring, segment);
      if (emptyCells.has(key) || emptyGroups.has(segment)) continue;
      drawnSegments.push({
        ring: ring,
        segment: segment,
        d: createRingSegment(outer, inner, start, end),
        fill: cellColor(settings, ring, segment),
        offset: segmentOffsets.get(segment) || { x: 0, y: 0 }
      });
    }
  }

  const groupLayers = Array.from({ length: settings.segments }, function () { return []; });
  drawnSegments.forEach(function (item) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", item.d);
    path.setAttribute("fill", item.fill);
    path.setAttribute("transform", "translate(" + item.offset.x + " " + item.offset.y + ")");
    path.setAttribute("fill-rule", "evenodd");
    path.dataset.ring = String(item.ring + 1);
    path.dataset.segment = String(item.segment + 1);
    path.setAttribute("role", "button");
    path.setAttribute("tabindex", "0");
    path.setAttribute("aria-label", "Ring " + (item.ring + 1) + ", group " + (item.segment + 1));
    if (selectedCell.ring === item.ring && selectedCell.segment === item.segment) path.classList.add("is-selected");
    path.addEventListener("click", function () { selectCell(item.ring, item.segment); });
    path.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCell(item.ring, item.segment);
      }
    });
    groupLayers[item.segment].push(path);
  });

  if (settings.excludeOverlaps) {
    const defs = document.createElementNS(SVG_NS, "defs");
    for (let segment = 0; segment < settings.segments; segment += 1) {
      const mask = document.createElementNS(SVG_NS, "mask");
      mask.id = "group-mask-" + (segment + 1);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      mask.setAttribute("x", "-600");
      mask.setAttribute("y", "-600");
      mask.setAttribute("width", "1800");
      mask.setAttribute("height", "1800");
      drawnSegments.filter(function (item) { return item.segment === segment; }).forEach(function (item) {
        const visible = document.createElementNS(SVG_NS, "path");
        visible.setAttribute("d", item.d);
        visible.setAttribute("transform", "translate(" + item.offset.x + " " + item.offset.y + ")");
        visible.setAttribute("fill", "#fff");
        mask.append(visible);
      });
      drawnSegments.filter(function (item) { return item.segment !== segment; }).forEach(function (item) {
        const overlap = document.createElementNS(SVG_NS, "path");
        overlap.setAttribute("d", item.d);
        overlap.setAttribute("transform", "translate(" + item.offset.x + " " + item.offset.y + ")");
        overlap.setAttribute("fill", "#000");
        mask.append(overlap);
      });
      defs.append(mask);
    }
    art.append(defs);
  }

  for (let segment = 0; segment < settings.segments; segment += 1) {
    if (groupLayers[segment].length === 0) continue;
    const group = document.createElementNS(SVG_NS, "g");
    group.dataset.segment = String(segment + 1);
    if (settings.excludeOverlaps) group.setAttribute("mask", "url(#group-mask-" + (segment + 1) + ")");
    groupLayers[segment].forEach(function (path) { group.append(path); });
    art.append(group);
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
  outputs.segments.value = settings.segments + (settings.segments === 1 ? " group" : " groups");
  outputs.spacing.value = settings.spacing + " px";
  outputs.clearance.value = Math.round(settings.clearance * 100) + "% of radius";
  outputs.dotSize.value = Math.round(settings.dotSize * 100) + "% of diameter";
  outputs.variation.value = Math.round(settings.variation * 100) + "%";
  outputs.bandWidth.value = rounded(ringWidth) + " px";
  outputs.scale.value = Math.round(settings.scale * 100) + "%";
  outputs.rotation.value = settings.rotation + "°";
  outputs.dotX.value = settings.dotX + " units";
  outputs.dotY.value = settings.dotY + " units";
  controls.dotColor.closest(".color-control").style.setProperty("--swatch", controls.dotColor.value);
  controls.colors.forEach(function (input) {
    input.closest(".palette-swatch").style.setProperty("--swatch", input.value);
  });
  document.querySelector("#shape-count").textContent = settings.rings + (settings.rings === 1 ? " ring" : " rings");
  document.querySelector("#variation-readout").textContent = Math.round(settings.variation * 100) + "% variation";
  stage.classList.toggle("has-background", settings.background);
  preview.querySelector("#shape-desc").textContent =
    settings.rings + " concentric rings arranged in " + settings.segments + " color groups, with " + Math.round(settings.variation * 100) + " percent variation.";
  renderSegmentEditor(settings);
  document.querySelectorAll('input[type="range"]').forEach(function (input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const percentage = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", percentage + "%");
    const number = rangeNumbers.get(input.id);
    if (number && document.activeElement !== number) number.value = input.value;
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
      const empty = emptyGroups.has(segment) || emptyCells.has(key);
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
  cellEditor.color.closest(".cell-color-control").style.setProperty("--swatch", cellEditor.color.value);
  const groupIsEmpty = emptyGroups.has(selectedCell.segment);
  cellEditor.groupEmpty.checked = groupIsEmpty;
  cellEditor.empty.checked = groupIsEmpty || emptyCells.has(selectedKey);
  cellEditor.empty.disabled = groupIsEmpty;
  cellEditor.empty.closest(".empty-control").classList.toggle("is-disabled", groupIsEmpty);
  cellEditor.reset.disabled = !cellColors.has(selectedKey);
  const position = segmentOffsets.get(selectedCell.segment) || { x: 0, y: 0 };
  cellEditor.positionTitle.textContent = "Selected group " + (selectedCell.segment + 1);
  cellEditor.x.value = String(position.x);
  cellEditor.y.value = String(position.y);
  const groupRotation = segmentRotations.get(selectedCell.segment) || 0;
  cellEditor.rotation.value = String(groupRotation);
  cellEditor.rotationOutput.value = groupRotation + "°";
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
    rangeNumbers.set(range.id, number);
    range.addEventListener("input", function () { number.value = range.value; });
    number.addEventListener("input", function () {
      if (number.value === "") return;
      const value = Math.max(Number(range.min), Math.min(Number(range.max), Number(number.value)));
      range.value = String(value);
      number.value = range.value;
      range.dispatchEvent(new Event("input", { bubbles: true }));
    });
    number.addEventListener("change", function () {
      const value = number.value === "" ? Number(range.value) : Math.max(Number(range.min), Math.min(Number(range.max), Number(number.value)));
      range.value = String(value);
      number.value = range.value;
      range.dispatchEvent(new Event("input", { bubbles: true }));
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
  description.textContent = controls.rings.value + " concentric rings and " + controls.segments.value + " groups" + (controls.excludeOverlaps.checked ? " with group overlaps removed" : "") + ".";
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
function updateSegmentRotation(value) {
  segmentRotations.set(selectedCell.segment, Number(value));
  render();
}
cellEditor.rotation.addEventListener("input", function () { updateSegmentRotation(cellEditor.rotation.value); });

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
cellEditor.groupEmpty.addEventListener("change", function () {
  if (cellEditor.groupEmpty.checked) emptyGroups.add(selectedCell.segment);
  else emptyGroups.delete(selectedCell.segment);
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
