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
  rotation: document.querySelector("#rotation-output")
};
const preview = document.querySelector("#shape-preview");
const art = document.querySelector("#shape-art");
const stage = document.querySelector("#preview-stage");

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
    background: controls.background.checked
  };
}

function render() {
  const settings = readSettings();
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
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", createRingSegment(outer, inner, start, end));
      path.setAttribute("fill", settings.colors[segment % settings.colors.length]);
      path.setAttribute("fill-rule", "evenodd");
      path.dataset.ring = String(ring + 1);
      path.dataset.segment = String(segment + 1);
      art.append(path);
    }
  }

  if (settings.dotSize > 0) {
    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", String(CENTER));
    core.setAttribute("cy", String(CENTER));
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
  document.querySelector("#shape-count").textContent = settings.rings + " RINGS";
  document.querySelector("#variation-readout").textContent = Math.round(settings.variation * 100) + "% VARIATION";
  stage.classList.toggle("has-background", settings.background);
  preview.querySelector("#shape-desc").textContent =
    settings.rings + " concentric rings divided into " + settings.segments + " colored segments, with " + Math.round(settings.variation * 100) + " percent variation.";
  document.querySelectorAll('input[type="range"]').forEach(function (input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const percentage = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", percentage + "%");
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
render();
