const SVG_NS = "http://www.w3.org/2000/svg";
const CENTER = 300;
const controls = {
  petals: document.querySelector("#petals"),
  core: document.querySelector("#core"),
  width: document.querySelector("#width"),
  roundness: document.querySelector("#roundness"),
  variation: document.querySelector("#variation"),
  rotation: document.querySelector("#rotation"),
  fill: document.querySelector("#fill-color"),
  background: document.querySelector("#background")
};
const outputs = {
  petals: document.querySelector("#petals-output"),
  core: document.querySelector("#core-output"),
  width: document.querySelector("#width-output"),
  roundness: document.querySelector("#roundness-output"),
  variation: document.querySelector("#variation-output"),
  rotation: document.querySelector("#rotation-output")
};
const preview = document.querySelector("#shape-preview");
const art = document.querySelector("#shape-art");
const stage = document.querySelector("#preview-stage");
let seed = 4821;

function seededRandom(value) {
  let state = value >>> 0;
  return function () {
    state += 0x6D2B79F5;
    let number = state;
    number = Math.imul(number ^ (number >>> 15), number | 1);
    number ^= number + Math.imul(number ^ (number >>> 7), number | 61);
    return ((number ^ (number >>> 14)) >>> 0) / 4294967296;
  };
}

function pointAt(radius, lateral, angle) {
  const alongX = Math.cos(angle);
  const alongY = Math.sin(angle);
  const acrossX = -alongY;
  const acrossY = alongX;
  return {
    x: CENTER + alongX * radius + acrossX * lateral,
    y: CENTER + alongY * radius + acrossY * lateral
  };
}

function rounded(value) {
  return Number(value.toFixed(2));
}

function createPetal(index, settings, random) {
  const step = Math.PI * 2 / settings.petals;
  const baseAngle = settings.rotation * Math.PI / 180 + index * step;
  const jitter = (random() * 2 - 1) * settings.variation;
  const scale = Math.max(0.65, 1 + jitter * 0.42);
  const angle = baseAngle + (random() * 2 - 1) * step * settings.variation * 0.12;
  const outer = Math.min(270, 250 * scale);
  const inner = outer * settings.core / 100;
  const width = Math.min(outer * 0.68, outer * step * 0.48 * settings.width);
  const length = outer - inner;
  const roundness = settings.roundness;
  const tipHalfWidth = width * (0.025 + roundness * 0.43);
  const capDepth = Math.min(width * 0.5, length * 0.32) * roundness;
  const capBase = outer - capDepth;
  const start = pointAt(inner, -width / 2, angle);
  const leftCap = pointAt(capBase, -tipHalfWidth, angle);
  const rightCap = pointAt(capBase, tipHalfWidth, angle);
  const end = pointAt(inner, width / 2, angle);
  const leftControl = pointAt(inner + length * 0.38, -width * 0.53, angle);
  const leftShoulder = pointAt(capBase - capDepth * 0.28, -tipHalfWidth, angle);
  const rightShoulder = pointAt(capBase - capDepth * 0.28, tipHalfWidth, angle);
  const rightControl = pointAt(inner + length * 0.38, width * 0.53, angle);
  const capLeftControl = pointAt(outer, -tipHalfWidth, angle);
  const capRightControl = pointAt(outer, tipHalfWidth, angle);
  const pair = (point) => `${number(point.x)} ${number(point.y)}`;

  return [
    `M ${pair(start)}`,
    `C ${pair(leftControl)} ${pair(leftShoulder)} ${pair(leftCap)}`,
    `C ${pair(capLeftControl)} ${pair(capRightControl)} ${pair(rightCap)}`,
    `C ${pair(rightShoulder)} ${pair(rightControl)} ${pair(end)}`,
    "Z"
  ].join(" ");
}

function render() {
  const settings = {
    petals: Number(controls.petals.value),
    core: Number(controls.core.value),
    width: Number(controls.width.value) / 100,
    roundness: Number(controls.roundness.value) / 100,
    variation: Number(controls.variation.value) / 100,
    rotation: Number(controls.rotation.value),
    fill: controls.fill.value.toUpperCase(),
    background: controls.background.checked
  };
  const random = seededRandom(seed);
  art.replaceChildren();
  if (settings.background) {
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("width", "600");
    background.setAttribute("height", "600");
    background.setAttribute("fill", "#FFFFFF");
    art.append(background);
  }
  for (let index = 0; index < settings.petals; index += 1) {
    const petal = document.createElementNS(SVG_NS, "path");
    petal.setAttribute("d", createPetal(index, settings, random));
    petal.setAttribute("fill", settings.fill);
    art.append(petal);
  }
  outputs.petals.value = String(settings.petals);
  outputs.core.value = String(settings.core) + "%";
  outputs.width.value = String(Math.round(settings.width * 100)) + "%";
  outputs.roundness.value = String(Math.round(settings.roundness * 100)) + "%";
  outputs.variation.value = String(Math.round(settings.variation * 100)) + "%";
  outputs.rotation.value = String(settings.rotation) + "°";
  document.querySelector("#seed-readout").textContent = "SEED " + seed;
  document.querySelector("#shape-count").textContent = settings.petals + " PETALS";
  document.querySelector("#variation-readout").textContent = "VARIATION · " + Math.round(settings.variation * 100) + "%";
  document.querySelector("#color-value").textContent = settings.fill;
  document.querySelector("#color-swatch").style.backgroundColor = settings.fill;
  stage.classList.toggle("has-background", settings.background);
  preview.querySelector("#shape-desc").textContent = "A radial flower made from " + settings.petals + " rounded petals. Tip roundness is " + Math.round(settings.roundness * 100) + " percent.";
  document.querySelectorAll('input[type="range"]').forEach(function (input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const progress = (Number(input.value) - min) / (max - min) * 100;
    input.style.setProperty("--range-progress", progress + "%");
  });
}

function newSeed() {
  let next = seed;
  while (next === seed) next = Math.floor(Math.random() * 999999) + 1;
  seed = next;
  render();
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
  title.textContent = `Pressbooks Shapes radial flower, seed ${seed}`;
  const description = document.createElementNS(SVG_NS, "desc");
  description.setAttribute("id", "export-desc");
  description.textContent = `${controls.petals.value} petals with ${controls.roundness.value}% tip roundness.`;
  clone.insertBefore(description, clone.firstChild);
  clone.insertBefore(title, clone.firstChild);

  const source = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${source}`;
}

function downloadSvg() {
  const blob = new Blob([buildExportSvg()], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pressbooks-radial-${seed}.svg`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

Object.values(controls).forEach(function (input) { input.addEventListener("input", render); });
document.querySelector("#random-seed").addEventListener("click", newSeed);
document.querySelector("#download-svg").addEventListener("click", downloadSvg);
render();
