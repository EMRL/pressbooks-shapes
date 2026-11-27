const SVG_NS = "http://www.w3.org/2000/svg";
const CENTER = 300;
const BRAND_PALETTE = [
  { name: "Publish", values: [["20", "#f1d2d4"], ["40", "#e4a6a8"], ["60", "#d6797d"], ["80", "#c94d51"], ["100", "#bb2026"], ["120", "#922723"]] },
  { name: "Pathways", values: [["20", "#dfedf0"], ["40", "#bedae0"], ["60", "#9ec8d1"], ["80", "#7db5c1"], ["100", "#5da3b2"], ["120", "#4a828e"]] },
  { name: "Directory", values: [["20", "#fdefd3"], ["40", "#fbdfa7"], ["60", "#f8cf7b"], ["80", "#f6bf4f"], ["100", "#f4af23"], ["120", "#c38c1c"]] },
  { name: "Exchange", values: [["20", "#ccede5"], ["40", "#99dbcb"], ["60", "#66c8b1"], ["80", "#33b697"], ["100", "#00a47d"], ["120", "#008364"]] },
  { name: "Commons Dark", values: [["20", "#d3d4d4"], ["40", "#a8a9aa"], ["60", "#7c7e7f"], ["80", "#515355"], ["100", "#25282a"], ["120", "#000000"]] },
  { name: "Commons Light", values: [["20", "#edeeee"], ["40", "#dcdcdd"], ["60", "#cacbcb"], ["80", "#b9b9ba"], ["100", "#a7a8a9"], ["120", "#868687"]] }
];
const DEFAULT_GROUP_COLOURS = ["#bb2026", "#5da3b2", "#f4af23", "#00a47d"];
const RADIATING_DEFAULT_COLOURS = ["#ccede5", "#cacbcb", "#bb2026", "#5da3b2", "#f4af23", "#99dbcb"];
const INTERLOCKING_DEFAULT_COLOURS = ["#9ec8d1", "#bb2026", "#66c8b1"];
const groupColours = DEFAULT_GROUP_COLOURS.slice();
const designTypeSelect = document.querySelector("#design-type");
const concentricControls = document.querySelector("#concentric-controls");
const radiatingControls = document.querySelector("#radiating-controls");
const interlockingControls = document.querySelector("#interlocking-controls");
const controls = {
  circleCount: document.querySelector("#circle-count"),
  circleDiameter: document.querySelector("#circle-diameter"),
  circleSpacing: document.querySelector("#circle-spacing"),
  circleArrangement: document.querySelector("#circle-arrangement"),
  rings: document.querySelector("#rings"),
  segments: document.querySelector("#segments"),
  spacing: document.querySelector("#spacing"),
  clearance: document.querySelector("#clearance"),
  dotSize: document.querySelector("#dot-size"),
  variation: document.querySelector("#variation"),
  scale: document.querySelector("#scale"),
  rotation: document.querySelector("#rotation"),
  bandCount: document.querySelector("#band-count"),
  bandSpan: document.querySelector("#band-span"),
  fanAngle: document.querySelector("#fan-angle"),
  bandLength: document.querySelector("#band-length"),
  bandWidth: document.querySelector("#band-width"),
  baselineY: document.querySelector("#baseline-y"),
  colors: [],
  dotColor: document.querySelector("#dot-color"),
  dotVisible: document.querySelector("#dot-visible"),
  dotX: document.querySelector("#dot-x"),
  dotY: document.querySelector("#dot-y"),
  background: document.querySelector("#background"),
  showAll: document.querySelector("#show-all"),
  overlapModes: Array.from(document.querySelectorAll('input[name="overlap-mode"]'))
};
const outputs = {
  circleCount: document.querySelector("#circle-count-output"),
  circleDiameter: document.querySelector("#circle-diameter-output"),
  circleSpacing: document.querySelector("#circle-spacing-output"),
  rings: document.querySelector("#rings-output"),
  segments: document.querySelector("#segments-output"),
  spacing: document.querySelector("#spacing-output"),
  clearance: document.querySelector("#clearance-output"),
  dotSize: document.querySelector("#dot-size-output"),
  variation: document.querySelector("#variation-output"),
  calculatedBandWidth: document.querySelector("#band-width-output"),
  scale: document.querySelector("#scale-output"),
  rotation: document.querySelector("#rotation-output"),
  dotX: document.querySelector("#dot-x-output"),
  dotY: document.querySelector("#dot-y-output"),
  bandCount: document.querySelector("#band-count-output"),
  bandSpan: document.querySelector("#band-span-output"),
  fanAngle: document.querySelector("#fan-angle-output"),
  bandLength: document.querySelector("#band-length-output"),
  bandWidth: document.querySelector("#band-width-input-output"),
  baselineY: document.querySelector("#baseline-y-output")
};
const preview = document.querySelector("#shape-preview");
const art = document.querySelector("#shape-art");
const stage = document.querySelector("#preview-stage");
const segmentGrid = document.querySelector("#segment-grid");
const groupSwatches = document.querySelector("#group-swatches");
const groupInspector = document.querySelector(".group-inspector");
const presetMenu = document.querySelector("#preset-menu");
const presetFileInput = document.querySelector("#preset-file-input");
const presetNotice = document.querySelector("#preset-notice");
const groupPaletteButtons = [];
const palettePopover = document.querySelector("#palette-popover");
const paletteGrid = document.querySelector("#palette-grid");
const sectionPaletteActions = document.querySelector("#section-palette-actions");
const paletteActions = {
  empty: document.querySelector("#palette-empty"),
  emptyLabel: document.querySelector("#palette-empty-label"),
  reset: document.querySelector("#palette-reset")
};
const editorTabs = Array.from(document.querySelectorAll('[role="tab"][aria-controls]'));
const cellEditor = {
  label: document.querySelector("#selected-cell-label"),
  empty: paletteActions.empty,
  reset: paletteActions.reset,
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
const circleSizes = new Map();
const rangeNumbers = new Map();
let selectedCell = { ring: 0, segment: 0 };
let activeGroup = 0;
let paletteTarget = null;
let pendingGroupIndex = null;
let compositionSeed = 4821;
const designSnapshots = { concentric: null, radiating: null, interlocking: null, contour: null, modular: null, triangular: null, orbital: null };
let activeDesignType = designTypeSelect.value;

function objectName(type = designTypeSelect.value) {
  return ["interlocking","orbital"].includes(type) ? "circle" : type === "radiating" ? "band" : "group";
}

function defaultColours(type) {
  return type === "interlocking" ? INTERLOCKING_DEFAULT_COLOURS : type === "radiating" ? RADIATING_DEFAULT_COLOURS : DEFAULT_GROUP_COLOURS;
}

function defaultColourFor(index, type) {
  const colours = defaultColours(type || designTypeSelect.value);
  return colours[index % colours.length];
}

function captureDesignState() {
  const values = {};
  Object.entries(controls).forEach(function (entry) {
    const key = entry[0];
    const control = entry[1];
    if (key === "colors") return;
    if (Array.isArray(control)) {
      values[key] = control.find(function (input) { return input.checked; })?.value;
    } else if (control.type === "checkbox") {
      values[key] = control.checked;
    } else if (control.tagName === "BUTTON") {
      values[key] = control.dataset.color;
    } else {
      values[key] = control.value;
    }
  });
  return {
    values: values,
    groupColours: groupColours.slice(),
    cellColors: new Map(cellColors),
    emptyCells: new Set(emptyCells),
    emptyGroups: new Set(emptyGroups),
    segmentOffsets: new Map(segmentOffsets),
    segmentRotations: new Map(segmentRotations),
    circleSizes: new Map(circleSizes),
    contour: contourClone(),
    modular: modularClone(),
    triangular: triangleClone(),
    orbital: orbitalClone(),
    patterns: clonePatternFills(),
    selectedCell: { ...selectedCell },
    activeGroup: activeGroup,
    compositionSeed: compositionSeed
  };
}

function restoreDesignState(snapshot) {
  Object.entries(snapshot.values).forEach(function (entry) {
    const key = entry[0];
    const value = entry[1];
    const control = controls[key];
    if (Array.isArray(control)) {
      control.forEach(function (input) { input.checked = input.value === value; });
    } else if (control.type === "checkbox") {
      control.checked = value;
    } else if (control.tagName === "BUTTON") {
      control.dataset.color = value;
    } else {
      control.value = String(value);
    }
  });
  groupColours.splice(0, groupColours.length, ...snapshot.groupColours);
  cellColors.clear();
  snapshot.cellColors.forEach(function (value, key) { cellColors.set(key, value); });
  emptyCells.clear();
  snapshot.emptyCells.forEach(function (key) { emptyCells.add(key); });
  emptyGroups.clear();
  snapshot.emptyGroups.forEach(function (key) { emptyGroups.add(key); });
  segmentOffsets.clear();
  snapshot.segmentOffsets.forEach(function (value, key) { segmentOffsets.set(key, value); });
  segmentRotations.clear();
  snapshot.segmentRotations.forEach(function (value, key) { segmentRotations.set(key, value); });
  circleSizes.clear();
  snapshot.circleSizes.forEach(function (value, key) { circleSizes.set(key, value); });
  restoreContourState(snapshot.contour);
  restoreModularState(snapshot.modular);
  restoreTriangleState(snapshot.triangular);
  restoreOrbitalState(snapshot.orbital);
  restorePatternFills(snapshot.patterns);
  selectedCell = { ...snapshot.selectedCell };
  activeGroup = snapshot.activeGroup;
  compositionSeed = snapshot.compositionSeed;
}

function updateDesignChrome() {
  const type = designTypeSelect.value;
  const radiating = type === "radiating";
  const interlocking = type === "interlocking";
  const contour = type === "contour";
  const modular = type === "modular";
  if (!modular) {
    controls.overlapModes.find(input => input.value === "transparent").disabled = false;
    document.querySelector("#overlap-transparent-help").textContent = "Knock out overlapping areas.";
  }
  const triangular = type === "triangular";
  const orbital = type === "orbital";
  document.querySelector("#orbital-controls").hidden = !orbital;
  document.querySelector("#orbital-editor-tab").hidden = !orbital;
  const singular = objectName(type);
  const name = singular[0].toUpperCase() + singular.slice(1);
  concentricControls.hidden = type !== "concentric";
  radiatingControls.hidden = !radiating;
  interlockingControls.hidden = !interlocking;
  document.querySelector("#contour-controls").hidden = !contour;
  document.querySelector("#modular-controls").hidden = !modular;
  document.querySelector("#triangular-controls").hidden = !triangular;
  document.querySelector("#triangle-editor-tab").hidden = !triangular;
  document.querySelector("#module-editor-tab").hidden = !modular;
  document.querySelector("#layer-editor-tab").hidden = !modular;
  document.querySelector("#variation-control").hidden = contour || modular || triangular || orbital;
  document.querySelector(".overlap-mode-control").hidden = contour || triangular;
  document.querySelector("#group-editor-tab").hidden = contour || modular || triangular || orbital;
  document.querySelector("#line-editor-tab").hidden = !contour;
  document.querySelector("#accent-editor-tab").hidden = !contour;
  document.querySelector(".editor-tabs").classList.toggle("is-contour", contour || modular);
  if (editorTabs.find(tab => tab.getAttribute("aria-selected") === "true")?.hidden) activateEditorTab(editorTabs[0], false);
  document.querySelectorAll(".concentric-only").forEach(function (element) { element.hidden = type !== "concentric"; });
  document.querySelector("#object-rotation").hidden = interlocking;
  document.querySelector("#object-diameter").hidden = !interlocking;
  const title = orbital ? "Orbital composition" : triangular ? "Triangular composition" : modular ? "Modular composition" : contour ? "Contour composition" : interlocking ? "Interlocking composition" : radiating ? "Radiating composition" : "Concentric composition";
  document.querySelector("#group-editor-tab").textContent = name + " editor";
  document.querySelector(".group-panel-help").textContent = type === "concentric"
    ? "Select a group or ring section to adjust its colour, position, or visibility."
    : "Select a " + singular + " to adjust its colour, position, or visibility.";
  document.querySelector("#overlap-help").textContent = modular ? "Choose how the grids interact where they overlap." : "Choose how " + singular + "s interact where they cross.";
  document.querySelector("#overlap-standard-help").textContent = modular ? "Draw layers over one another." : "Draw " + singular + "s over one another.";
  document.querySelector("#rotation-label").textContent = name + " rotation";
  const rotationNumber = rangeNumbers.get("group-rotation");
  if (rotationNumber) rotationNumber.setAttribute("aria-label", name + " rotation numeric value");
  document.title = "Pressbooks Shapes · " + title;
  document.querySelector('meta[name="description"]').setAttribute("content", title + " design and SVG export.");
  document.querySelector("#intro-description").textContent = orbital ? "Arrange circular outlines, refine the details, and download your SVG." : triangular ? "Arrange proportional triangles, refine the details, and download your SVG." : modular ? "Arrange repeating modules and overlapping grids, refine the details, and download your SVG." : contour ? "Arrange parallel contours and accent circles, refine the details, and download your SVG." : interlocking
    ? "Arrange overlapping circles, refine the details, and download your SVG."
    : radiating ? "Arrange radiating bands, refine the details, and download your SVG."
    : "Arrange concentric groups, refine the details, and download your SVG.";
  document.querySelector("#preview-type-label").textContent = title;
  document.querySelector("#shape-title").textContent = title + " preview";
  document.querySelector("#footer-design-label").textContent = title + " · SVG export";
  segmentGrid.setAttribute("aria-label", type === "concentric" ? "Ring and object group colour grid" : name + " colour grid");
}

function setDesignType(type, saveCurrent, restoreTarget) {
  if (type === activeDesignType) {
    designTypeSelect.value = type;
    updateDesignChrome();
    return;
  }
  const currentType = activeDesignType;
  if (saveCurrent !== false) {
    designSnapshots[currentType] = captureDesignState();
    if (!document.querySelector("#main").hidden) updateGalleryThumbnail(currentType);
  }
  designTypeSelect.value = type;
  activeDesignType = type;
  if (restoreTarget !== false && designSnapshots[type]) {
    restoreDesignState(designSnapshots[type]);
  } else if (restoreTarget !== false) {
    groupColours.splice(0, groupColours.length, ...defaultColours(type));
    cellColors.clear();
    emptyCells.clear();
    emptyGroups.clear();
    segmentOffsets.clear();
    segmentRotations.clear();
    circleSizes.clear();
    restorePatternFills();
    if (type === "contour") restoreContourState(referenceContourState());
    if (type === "modular") restoreModularState(referenceModularState());
    if (type === "triangular") restoreTriangleState(referenceTriangleState());
    if (type === "orbital") restoreOrbitalState(referenceOrbitalState());
    controls.showAll.checked = false;
    compositionSeed = 4821;
  }
  selectedCell = { ring: 0, segment: 0 };
  activeGroup = 0;
  pendingGroupIndex = null;
  closePalette(false);
  groupInspector.classList.remove("is-fading-out");
  updateDesignChrome();
  render();
}

function activateEditorTab(tab, moveFocus) {
  editorTabs.forEach(function (item) {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(item.getAttribute("aria-controls"));
    panel.hidden = !selected;
  });
  hoveredOrbit=null;
  updateOrbitalHighlight();
  if (moveFocus) tab.focus();
}

editorTabs.forEach(function (tab, index) {
  tab.addEventListener("click", function () { activateEditorTab(tab, false); });
  tab.addEventListener("keydown", function (event) {
    const visibleTabs = editorTabs.filter(item => !item.hidden);
    const current = visibleTabs.indexOf(tab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % visibleTabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + visibleTabs.length) % visibleTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visibleTabs.length - 1;
    else return;
    event.preventDefault();
    activateEditorTab(visibleTabs[next], true);
  });
});

function randomInteger(min, max, step) {
  const increment = step || 1;
  const steps = Math.floor((max - min) / increment);
  return min + Math.floor(Math.random() * (steps + 1)) * increment;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled(items) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

const ALL_PALETTE_COLOURS = BRAND_PALETTE.flatMap(function (family) {
  return family.values.map(function (entry) { return entry[1].toUpperCase(); });
});
const BRAND_100_COLOURS = BRAND_PALETTE.map(function (family) {
  return family.values.find(function (entry) { return entry[0] === "100"; })[1].toUpperCase();
});

function selectGroup(index) {
  if (pendingGroupIndex === null && activeGroup === index) return;
  pendingGroupIndex = index;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    activeGroup = index;
    pendingGroupIndex = null;
    groupInspector.classList.remove("is-fading-out");
    render();
    return;
  }
  groupInspector.classList.add("is-fading-out");
}

function paletteLabel(hex) {
  for (const family of BRAND_PALETTE) {
    const value = family.values.find(function (entry) { return entry[1].toUpperCase() === hex.toUpperCase(); });
    if (value) return family.name + " " + value[0];
  }
  return hex.toUpperCase();
}

function updateColourTrigger(button, hex, label) {
  button.dataset.color = hex.toUpperCase();
  button.style.setProperty("--swatch", hex);
  const swatch = button.querySelector(".color-swatch");
  if (swatch) swatch.style.setProperty("--swatch", hex);
  button.setAttribute("aria-label", label + ": " + paletteLabel(hex));
}

// Shared selector card for every composition family. The numbered button
// selects the object; colour and visibility are independent controls.
function createObjectSelector(index, label, onSelect, onColour, onVisibility, reset) {
  const card = document.createElement("div");
  card.className = "object-selector";
  const select = document.createElement("button");
  select.type = "button";
  select.className = "object-selector-select";
  select.textContent = String(index + 1);
  select.addEventListener("click", onSelect);
  card.addEventListener("click", event => {
    if (!event.target.closest("button, input, label")) onSelect();
  });
  const colour = document.createElement("button");
  colour.type = "button";
  colour.className = "color-trigger";
  colour.setAttribute("aria-haspopup", "dialog");
  colour.setAttribute("aria-expanded", "false");
  colour.setAttribute("aria-controls", "palette-popover");
  const swatch = document.createElement("span");
  swatch.className = "color-swatch";
  colour.append(swatch);
  colour.addEventListener("click", () => onColour(colour));
  const visible = document.createElement("input");
  visible.type = "checkbox";
  visible.addEventListener("change", () => onVisibility(visible.checked));
  card.append(select, colour, visible);
  if (reset) card.append(reset);
  const result = { card, select, colour, visible, reset };
  return result;
}

function updateObjectSelector(selector, label, hex, visible, active) {
  selector.card.classList.toggle("is-active", active);
  selector.card.classList.toggle("is-empty", !visible);
  selector.select.setAttribute("aria-label", "Select " + label);
  selector.select.setAttribute("aria-pressed", String(active));
  selector.visible.setAttribute("aria-label", "Show " + label);
  selector.visible.checked = visible;
  updateColourTrigger(selector.colour, hex, label + " colour");
}

updateColourTrigger(controls.dotColor, "#a7a8a9", "Centre dot colour");
const groupSelectors = [];

function renderGroupSwatches(count) {
  const itemName = objectName();
  while (groupColours.length < count) groupColours.push(defaultColourFor(groupColours.length));
  if (groupSelectors.length !== count) {
    groupSwatches.replaceChildren();
    controls.colors = [];
    groupPaletteButtons.length = 0;
    groupSelectors.length = 0;
    for (let index = 0; index < count; index++) {
      const selector = createObjectSelector(index, itemName, () => {
        selectGroup(index);
        groupSelectors[index].select.focus();
      }, trigger => {
        selectGroup(index);
        openPalette(trigger, "group", index);
      }, visible => {
        if (visible) emptyGroups.delete(index);
        else emptyGroups.add(index);
        render();
      });
      groupSelectors.push(selector);
      controls.colors.push(selector.select);
      groupPaletteButtons.push(selector.colour);
      groupSwatches.append(selector.card);
    }
  }
  groupSelectors.forEach((selector, index) => {
    updateObjectSelector(selector, itemName + " " + (index + 1), groupColours[index], !emptyGroups.has(index), activeGroup === index);
    selector.select.dataset.color = groupColours[index];
    paintFillSwatch(selector.colour, "group:"+index);
  });
}

function cellKey(ring, segment) {
  return ring + ":" + segment;
}

function cellColor(settings, ring, segment) {
  return cellColors.get(cellKey(ring, segment)) || settings.colors[segment % settings.colors.length];
}

function targetColour(target) {
  if (target.type === "orbital") return orbitalColour(target.index);
  if (target.type === "triangular") return triangleColour(target.index);
  if (target.type === "modular") return modularColour(target.index);
  if (target.type === "contour") return contourColour(target.index);
  if (target.type === "group") return controls.colors[target.index].dataset.color;
  if (target.type === "dot") return controls.dotColor.dataset.color;
  const settings = readSettings();
  return cellColors.get(cellKey(target.ring, target.segment)) || settings.colors[target.segment % settings.colors.length];
}

function positionPalette() {
  if (!paletteTarget || palettePopover.hidden) return;
  const bounds = paletteTarget.trigger.getBoundingClientRect();
  const margin = 8;
  const width = palettePopover.offsetWidth;
  const height = palettePopover.offsetHeight;
  const left = Math.max(margin, Math.min(bounds.left, window.innerWidth - width - margin));
  let top = bounds.bottom + 6;
  if (top + height > window.innerHeight - margin) top = bounds.top - height - 6;
  top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
  palettePopover.style.left = left + "px";
  palettePopover.style.top = top + "px";
}

function closePalette(restoreFocus) {
  if (!paletteTarget) return;
  const trigger = paletteTarget.trigger;
  trigger.setAttribute("aria-expanded", "false");
  palettePopover.hidden = true;
  sectionPaletteActions.hidden = true;
  paletteTarget = null;
  if (restoreFocus) trigger.focus();
}

function choosePaletteColour(hex, pattern = null) {
  if (!paletteTarget) return;
  const target = paletteTarget;
  if (patternMode === "pattern" && !pattern && patternEligible(target)) {
    patternDraft[patternColourTarget] = hex;
    commitPatternDraft();
    return;
  }
  if (patternEligible(target)) {
    if (pattern) patternFills.set(patternKey(target), pattern);
    else patternFills.delete(patternKey(target));
  }
  if (target.type === "orbital") {
    if(String(target.index).startsWith("group:")) orbitalState.colours[Number(target.index.split(":")[1])] = hex;
    else orbitalOverride(target.index).colour = hex;
  } else if (target.type === "triangular") {
    setTriangleColour(target.index, hex);
  } else if (target.type === "modular") {
    setModularColour(target.index, hex);
  } else if (target.type === "contour") {
    setContourColour(target.index, hex);
  } else if (target.type === "group") {
    groupColours[target.index] = hex.toUpperCase();
  } else if (target.type === "dot") {
    updateColourTrigger(controls.dotColor, hex, "Centre dot colour");
  } else {
    cellColors.set(cellKey(target.ring, target.segment), hex.toUpperCase());
    emptyCells.delete(cellKey(target.ring, target.segment));
  }
  // Keep the fill popover open while rendering the changed artwork. Several
  // editors rebuild their swatches during render, so bind the replacement.
  render();
  refreshLivePalette(target);
  if (patternMode === "solid") {
    if (patternDraft) patternDraft.foreground = hex;
    highlightPatternColour(hex);
  }
}

function refreshLivePalette(target) {
  let trigger;
  if (target.type === "orbital") trigger = document.querySelector('[data-orbital-colour="'+target.index+'"]');
  else if (target.type === "triangular") trigger = trianglePaletteTrigger(target.index);
  else if (target.type === "modular") trigger = modularPaletteTrigger(target.index);
  else if (target.type === "contour") trigger = target.index === "default" ? document.querySelector("#contour-default-colour") : document.querySelector('[data-contour-colour="' + target.index + '"]');
  else if (target.type === "cell") trigger = segmentGrid.querySelector('.segment-cell[aria-pressed="true"]');
  else if (target.type === "group") trigger = groupPaletteButtons[target.index];
  else trigger = controls.dotColor;
  if (!trigger) { closePalette(false); return; }
  target.trigger = trigger;
  trigger.setAttribute("aria-expanded","true");
  configurePaletteActions(target.type,target.index);
  positionPalette();
}

function configurePaletteActions(type,index) {
  sectionPaletteActions.hidden = type === "orbital" || type === "dot" || type === "contour" || (type === "modular" && index.startsWith("layer:")) || (type === "triangular" && index === "default");
  if (type === "triangular" && index !== "default") {
    const state = trianglePaletteState(index);
    cellEditor.empty.checked = state.empty;
    cellEditor.empty.disabled = false;
    cellEditor.reset.disabled = state.reset && !patternFills.has(patternKey(paletteTarget));
    paletteActions.emptyLabel.textContent = "Empty triangle";
    paletteActions.reset.textContent = "Use default settings";
  }
  if (type === "modular" && index.startsWith("module:")) {
    const state = modularPaletteState(index);
    cellEditor.empty.checked = state.empty;
    cellEditor.empty.disabled = false;
    cellEditor.reset.disabled = state.reset && !patternFills.has(patternKey(paletteTarget));
    paletteActions.emptyLabel.textContent = "Empty module";
    paletteActions.reset.textContent = "Use layer default";
  }
  if (type === "cell") {
    const key = cellKey(paletteTarget.ring, paletteTarget.segment);
    cellEditor.empty.checked = emptyGroups.has(paletteTarget.segment) || emptyCells.has(key);
    cellEditor.empty.disabled = emptyGroups.has(paletteTarget.segment);
    cellEditor.reset.disabled = !cellColors.has(key) && !emptyCells.has(key) && !patternFills.has(patternKey(paletteTarget));
    paletteActions.emptyLabel.textContent = designTypeSelect.value === "concentric" ? "Empty section" : "Empty " + objectName();
    paletteActions.reset.textContent = "Use " + objectName() + " default";
  } else if (type === "group") {
    cellEditor.empty.checked = emptyGroups.has(index);
    cellEditor.empty.disabled = false;
    cellEditor.reset.disabled = groupColours[index].toUpperCase() === defaultColourFor(index).toUpperCase() && !patternFills.has(patternKey(paletteTarget));
    paletteActions.emptyLabel.textContent = designTypeSelect.value === "concentric" ? "Empty entire group" : "Empty " + objectName();
    paletteActions.reset.textContent = "Reset colour";
  }
}

function openPalette(trigger, type, index) {
  if (paletteTarget && paletteTarget.trigger === trigger) {
    closePalette(false);
    return;
  }
  closePalette(false);
  paletteTarget = { trigger, type, index, ring: selectedCell.ring, segment: selectedCell.segment };
  trigger.setAttribute("aria-expanded", "true");
  configurePaletteActions(type,index);
  const selected = targetColour(paletteTarget).toUpperCase();
  paletteGrid.replaceChildren();
  BRAND_PALETTE.forEach(function (family) {
    const row = document.createElement("div");
    row.className = "palette-row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", family.name);
    family.values.forEach(function (entry) {
      const hex = entry[1].toUpperCase();
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "palette-option";
      swatch.setAttribute("role", "radio");
      swatch.setAttribute("aria-label", family.name + " " + entry[0]);
      swatch.setAttribute("aria-checked", String(hex === selected));
      swatch.tabIndex = hex === selected ? 0 : -1;
      swatch.style.setProperty("--swatch", hex);
      swatch.dataset.color = hex;
      swatch.addEventListener("click", function () { choosePaletteColour(hex); });
      swatch.addEventListener("keydown", function (event) {
        const options = Array.from(paletteGrid.querySelectorAll(".palette-option"));
        const current = options.indexOf(swatch);
        let next = current;
        const rowStart = Math.floor(current / 6) * 6;
        const rowEnd = Math.min(rowStart + 5, options.length - 1);
        if (event.key === "ArrowRight") next = Math.min(current + 1, rowEnd);
        else if (event.key === "ArrowLeft") next = Math.max(current - 1, rowStart);
        else if (event.key === "ArrowDown") next = Math.min(current + 6, options.length - 1);
        else if (event.key === "ArrowUp") next = Math.max(current - 6, 0);
        else if (event.key === "Home") next = rowStart;
        else if (event.key === "End") next = rowEnd;
        else return;
        event.preventDefault();
        options.forEach(function (option, optionIndex) { option.tabIndex = optionIndex === next ? 0 : -1; });
        options[next].focus();
      });
      row.append(swatch);
    });
    paletteGrid.append(row);
  });
  palettePopover.hidden = false;
  openFillEditor(paletteTarget);
  positionPalette();
  const selectedSwatch = paletteGrid.querySelector('[aria-checked="true"]');
  (selectedSwatch || paletteGrid.querySelector(".palette-option")).focus();
}

document.addEventListener("pointerdown", function (event) {
  if (!paletteTarget || palettePopover.contains(event.target) || paletteTarget.trigger.contains(event.target)) return;
  closePalette(false);
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && paletteTarget) {
    event.preventDefault();
    closePalette(true);
  }
});
window.addEventListener("resize", positionPalette);
document.addEventListener("scroll", positionPalette, true);

function selectCell(ring, segment) {
  selectedCell = { ring, segment };
  render();
  const trigger = segmentGrid.querySelector('.segment-cell[aria-pressed="true"]');
  if (trigger) openPalette(trigger, "cell");
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
  const type = designTypeSelect.value;
  const radiating = type === "radiating";
  const interlocking = type === "interlocking";
  const count = interlocking ? Number(controls.circleCount.value) : radiating ? Number(controls.bandCount.value) : Number(controls.segments.value);
  return {
    type: type,
    rings: type === "concentric" ? Number(controls.rings.value) : 1,
    segments: count,
    circleDiameter: Number(controls.circleDiameter.value),
    circleSpacing: Number(controls.circleSpacing.value),
    circleArrangement: controls.circleArrangement.value,
    spacing: Number(controls.spacing.value),
    clearance: Number(controls.clearance.value) / 100,
    dotSize: Number(controls.dotSize.value) / 100,
    variation: Number(controls.variation.value) / 100,
    scale: Number(controls.scale.value) / 100,
    rotation: Number(controls.rotation.value),
    colors: Array.from({ length: count }, function (_, index) { return (groupColours[index] || defaultColourFor(index, type)).toUpperCase(); }),
    dotColor: controls.dotColor.dataset.color.toUpperCase(),
    dotVisible: type === "concentric" && controls.dotVisible.checked,
    dotX: Number(controls.dotX.value),
    dotY: Number(controls.dotY.value),
    background: controls.background.checked,
    showAll: controls.showAll.checked,
    overlapMode: controls.overlapModes.find(function (input) { return input.checked; }).value,
    bandSpan: Number(controls.bandSpan.value),
    fanAngle: Number(controls.fanAngle.value),
    bandLength: Number(controls.bandLength.value),
    bandWidth: Number(controls.bandWidth.value),
    baselineY: Number(controls.baselineY.value)
  };
}

function createRadiatingBands(settings) {
  return Array.from({ length: settings.segments }, function (_, segment) {
    const position = settings.segments === 1 ? 0.5 : segment / (settings.segments - 1);
    const variation = settings.variation;
    const angleJitter = (seededUnit(segment + 11) - 0.5) * variation * 18;
    const lengthFactor = Math.max(0.35, 0.64 + 0.36 * Math.sin(Math.PI * position) + (seededUnit(segment + 29) - 0.5) * variation * 0.5);
    const widthFactor = 1 + (seededUnit(segment + 47) - 0.5) * variation * 0.4;
    const angle = (position - 0.5) * settings.fanAngle + angleJitter + (segmentRotations.get(segment) || 0);
    const radians = angle * Math.PI / 180;
    const scale = settings.scale;
    const anchorX = CENTER + (position - 0.5) * settings.bandSpan * scale;
    const baseline = CENTER + (settings.baselineY - CENTER) * scale;
    const length = settings.bandLength * scale * lengthFactor;
    const width = settings.bandWidth * scale * widthFactor;
    const alongX = Math.sin(radians) * length;
    const alongY = -Math.cos(radians) * length;
    const acrossX = Math.cos(radians) * width / 2;
    const acrossY = Math.sin(radians) * width / 2;
    const baseLeft = { x: anchorX - acrossX, y: baseline - acrossY };
    const baseRight = { x: anchorX + acrossX, y: baseline + acrossY };
    const topRight = { x: anchorX + alongX + acrossX, y: baseline + alongY + acrossY };
    const topLeft = { x: anchorX + alongX - acrossX, y: baseline + alongY - acrossY };
    const key = cellKey(0, segment);
    if (emptyGroups.has(segment) || emptyCells.has(key)) return null;
    return {
      ring: 0,
      segment: segment,
      patternX:anchorX, patternY:baseline, patternRotation:angle,
      d: ["M " + pointString(baseLeft), "L " + pointString(baseRight), "L " + pointString(topRight), "L " + pointString(topLeft), "Z"].join(" "),
      fill: cellColor(settings, 0, segment),
      offset: segmentOffsets.get(segment) || { x: 0, y: 0 }
    };
  }).filter(Boolean);
}

function circleGeometry(settings, segment, seed, sizes) {
  const count = settings.segments;
  const diameter = settings.circleDiameter * settings.scale;
  const distance = diameter * settings.circleSpacing / 100;
  const midpoint = (count - 1) / 2;
  let x = (segment - midpoint) * distance;
  let y = 0;
  if (settings.circleArrangement === "alternating") {
    const mean = (count % 2) / count;
    y = ((segment % 2 ? 1 : -1) + mean) * diameter * 0.175;
  } else if (settings.circleArrangement === "circular") {
    const radius = distance / (2 * Math.sin(Math.PI / count));
    const angle = -Math.PI / 2 + 2 * Math.PI * segment / count;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
  }
  const variation = settings.variation;
  x += (seededUnit(segment + 71, seed) - 0.5) * variation * diameter * 0.35;
  y += (seededUnit(segment + 83, seed) - 0.5) * variation * diameter * 0.35;
  const r = diameter / 2 * (sizes.get(segment) || 100) / 100
    * (1 + (seededUnit(segment + 97, seed) - 0.5) * variation * 0.6);
  return { x: CENTER + x, y: CENTER + y, r };
}

function createInterlockingCircles(settings) {
  return Array.from({ length: settings.segments }, function (_, segment) {
    if (emptyGroups.has(segment) || emptyCells.has(cellKey(0, segment))) return null;
    const circle = circleGeometry(settings, segment, compositionSeed, circleSizes);
    const left = pointString({ x: circle.x - circle.r, y: circle.y });
    const right = pointString({ x: circle.x + circle.r, y: circle.y });
    const r = rounded(circle.r);
    return { ring: 0, segment: segment, patternX:circle.x, patternY:circle.y, patternRotation:0,
      d: "M " + left + " A " + r + " " + r + " 0 1 0 " + right + " A " + r + " " + r + " 0 1 0 " + left + " Z",
      fill: cellColor(settings, 0, segment),
      offset: segmentOffsets.get(segment) || { x: 0, y: 0 } };
  }).filter(Boolean);
}

function render() {
  renderComposition();
  updatePreviewFrame();
}

function renderComposition() {
  beginPatternRender();
  const settings = readSettings();
  if (settings.type === "orbital") { renderOrbital(settings); return; }
  if (settings.type === "triangular") { renderTriangular(settings); return; }
  if (settings.type === "modular") { renderModular(settings); return; }
  if (settings.type === "contour") { renderContour(settings); return; }
  activeGroup = Math.min(activeGroup, settings.segments - 1);
  renderGroupSwatches(settings.segments);
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
  art.style.isolation = "isolate";
  art.setAttribute("transform", "rotate(" + settings.rotation + " " + CENTER + " " + CENTER + ")");

  if (settings.background) {
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("width", "600");
    background.setAttribute("height", "600");
    background.setAttribute("fill", "#FFFFFF");
    art.append(background);
  }

  const drawnSegments = settings.type === "interlocking" ? createInterlockingCircles(settings) : settings.type === "radiating" ? createRadiatingBands(settings) : [];
  if (settings.type === "concentric") {
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
          patternRotation: groupRotation + ring * offset,
          d: createRingSegment(outer, inner, start, end),
          fill: cellColor(settings, ring, segment),
          offset: segmentOffsets.get(segment) || { x: 0, y: 0 }
        });
      }
    }
  }

  const groupLayers = Array.from({ length: settings.segments }, function () { return []; });
  drawnSegments.forEach(function (item) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", item.d);
    path.setAttribute("fill", svgPatternFill("cell:"+item.ring+":"+item.segment,item.fill,{
      x:item.patternX??CENTER,y:item.patternY??CENTER,rotation:item.patternRotation??(segmentRotations.get(item.segment)||0),
      offsetX:item.offset.x,offsetY:item.offset.y
    }));
    path.setAttribute("transform", "translate(" + item.offset.x + " " + item.offset.y + ")");
    path.setAttribute("fill-rule", "evenodd");
    path.dataset.ring = String(item.ring + 1);
    path.dataset.segment = String(item.segment + 1);
    path.setAttribute("role", "button");
    path.setAttribute("tabindex", "0");
    path.setAttribute("aria-label", settings.type !== "concentric"
      ? objectName(settings.type) + " " + (item.segment + 1)
      : "Ring " + (item.ring + 1) + ", group " + (item.segment + 1));
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

  if (settings.overlapMode === "transparent") {
    const defs = document.createElementNS(SVG_NS, "defs");
    for (let segment = 0; segment < settings.segments; segment += 1) {
      const mask = document.createElementNS(SVG_NS, "mask");
      mask.id = "group-mask-" + (segment + 1);
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      mask.setAttribute("x", "-4000");
      mask.setAttribute("y", "-4000");
      mask.setAttribute("width", "8000");
      mask.setAttribute("height", "8000");
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
    if (settings.overlapMode === "transparent") group.setAttribute("mask", "url(#group-mask-" + (segment + 1) + ")");
    if (settings.overlapMode === "multiply") group.style.mixBlendMode = "multiply";
    groupLayers[segment].forEach(function (path) { group.append(path); });
    art.append(group);
  }

  if (settings.dotVisible && settings.dotSize > 0) {
    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", String(CENTER + settings.dotX));
    core.setAttribute("cy", String(CENTER + settings.dotY));
    core.setAttribute("r", String(rounded(dotRadius)));
    core.setAttribute("fill", svgPatternFill("dot",settings.dotColor,{x:CENTER+settings.dotX,y:CENTER+settings.dotY}));
    art.append(core);
  }

  outputs.circleCount.value = settings.segments + " circles";
  outputs.circleDiameter.value = settings.circleDiameter + " px";
  outputs.circleSpacing.value = settings.circleSpacing + "% of diameter";
  outputs.rings.value = settings.rings + (settings.rings === 1 ? " ring" : " rings");
  outputs.segments.value = settings.segments + (settings.type !== "concentric" ? " " + objectName(settings.type) + "s" : settings.segments === 1 ? " group" : " groups");
  outputs.spacing.value = settings.spacing + " px";
  outputs.clearance.value = Math.round(settings.clearance * 100) + "% of radius";
  outputs.dotSize.value = Math.round(settings.dotSize * 100) + "% of diameter";
  outputs.variation.value = Math.round(settings.variation * 100) + "%";
  outputs.calculatedBandWidth.value = rounded(ringWidth) + " px";
  outputs.bandCount.value = settings.segments + " bands";
  outputs.bandSpan.value = settings.bandSpan + " px";
  outputs.fanAngle.value = settings.fanAngle + "°";
  outputs.bandLength.value = settings.bandLength + " px";
  outputs.bandWidth.value = settings.bandWidth + " px";
  outputs.baselineY.value = settings.baselineY + " px";
  outputs.scale.value = Math.round(settings.scale * 100) + "%";
  outputs.rotation.value = settings.rotation + "°";
  outputs.dotX.value = settings.dotX + " units";
  outputs.dotY.value = settings.dotY + " units";
  const itemName = objectName(settings.type);
  updateColourTrigger(controls.dotColor, settings.dotColor, "Centre dot colour");
  paintFillSwatch(controls.dotColor,"dot");
  document.querySelector("#shape-count").textContent = settings.type !== "concentric"
    ? settings.segments + " " + itemName + "s"
    : settings.rings + (settings.rings === 1 ? " ring" : " rings");
  document.querySelector("#variation-readout").textContent = Math.round(settings.variation * 100) + "% variation";
  stage.classList.toggle("has-background", settings.background);
  preview.querySelector("#shape-desc").textContent = settings.type !== "concentric"
    ? settings.segments + " " + settings.type + " " + itemName + "s with " + Math.round(settings.variation * 100) + " percent variation."
    : settings.rings + " concentric rings arranged in " + settings.segments + " colour groups, with " + Math.round(settings.variation * 100) + " percent variation.";
  renderSegmentEditor(settings);
  refreshRangeInputs();
}

function refreshRangeInputs() {
  document.querySelectorAll('input[type="range"]').forEach(function (input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const percentage = max === min ? 100 : ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", percentage + "%");
    const number = rangeNumbers.get(input.id);
    if (number && document.activeElement !== number) number.value = input.value;
  });
}

function renderSegmentEditor(settings) {
  const independent = settings.type !== "concentric";
  const unit = objectName(settings.type);
  const labelName = unit[0].toUpperCase() + unit.slice(1);
  document.querySelector("#segment-editor-title").textContent = independent ? "Individual " + unit + "s" : "Individual sections";
  document.querySelector("#segment-editor-help").textContent = independent
    ? "Choose a " + unit + " to adjust its colour or visibility."
    : "Choose a ring and group. Each section can use its own colour or be left empty.";
  document.querySelector("#group-palette-legend").textContent = "Default " + unit + " colours";
  document.querySelector("#position-help").textContent = settings.type === "interlocking"
    ? "Move or resize the selected circle."
    : independent ? "Move or rotate the selected band along the baseline."
    : "Move or rotate every ring section in the active group.";
  selectedCell.ring = Math.min(selectedCell.ring, settings.rings - 1);
  selectedCell.segment = Math.min(selectedCell.segment, settings.segments - 1);
  activeGroup = Math.min(activeGroup, settings.segments - 1);
  segmentGrid.replaceChildren();
  segmentGrid.style.setProperty("--segment-columns", String(settings.segments));

  const heading = document.createElement("div");
  heading.className = "segment-grid-row segment-grid-heading";
  const corner = document.createElement("span");
  corner.className = "segment-grid-label";
  corner.textContent = independent ? labelName : "Ring";
  heading.append(corner);
  for (let segment = 0; segment < settings.segments; segment += 1) {
    const label = document.createElement("span");
    label.className = "segment-column-label";
    label.textContent = independent ? String(segment + 1) : "G" + (segment + 1);
    heading.append(label);
  }
  segmentGrid.append(heading);

  for (let ring = 0; ring < settings.rings; ring += 1) {
    const row = document.createElement("div");
    row.className = "segment-grid-row";
    const rowLabel = document.createElement("span");
    rowLabel.className = "segment-grid-label";
    rowLabel.textContent = independent ? "Colour" : String(ring + 1);
    row.append(rowLabel);

    for (let segment = 0; segment < settings.segments; segment += 1) {
      const key = cellKey(ring, segment);
      const empty = emptyGroups.has(segment) || emptyCells.has(key);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "segment-cell" + (empty ? " is-empty" : "");
      cell.style.setProperty("--cell-color", cellColor(settings, ring, segment));
      cell.textContent = empty ? "∅" : "";
      cell.setAttribute("aria-label", independent
        ? labelName + " " + (segment + 1) + (empty ? ", empty" : ", " + cellColor(settings, ring, segment))
        : "Ring " + (ring + 1) + ", group " + (segment + 1) + (empty ? ", empty" : ", " + cellColor(settings, ring, segment)));
      paintFillSwatch(cell,"cell:"+ring+":"+segment);
      cell.setAttribute("aria-pressed", String(selectedCell.ring === ring && selectedCell.segment === segment));
      if (selectedCell.ring === ring && selectedCell.segment === segment) cell.classList.add("is-selected");
      cell.addEventListener("click", function () { selectCell(ring, segment); });
      row.append(cell);
    }
    segmentGrid.append(row);
  }

  cellEditor.label.textContent = independent
    ? labelName + " " + (selectedCell.segment + 1)
    : "Ring " + (selectedCell.ring + 1) + " · Group " + (selectedCell.segment + 1);
  const position = segmentOffsets.get(activeGroup) || { x: 0, y: 0 };
  cellEditor.positionTitle.textContent = labelName + " " + (activeGroup + 1);
  const size = circleSizes.get(activeGroup) || 100;
  document.querySelector("#circle-size").value = String(size);
  document.querySelector("#circle-size-output").value = size + "% of diameter";
  cellEditor.x.value = String(position.x);
  cellEditor.y.value = String(position.y);
  const groupRotation = segmentRotations.get(activeGroup) || 0;
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

function seededUnit(value, seed) {
  const seedValue = seed === undefined ? compositionSeed : seed;
  const x = Math.sin(value * 127.1 + seedValue) * 43758.5453;
  return x - Math.floor(x);
}

// Measure in SVG user coordinates, not CSS pixels. The original frame stays
// included; rotated paths use conservative bounds to avoid cutting artwork.
function updatePreviewFrame() {
  const show = controls.showAll.checked;
  preview.querySelectorAll(".expanded-frame-background, .artboard-guide").forEach(e=>e.remove());
  const originalBackground=Array.from(art.children).find(e=>e.tagName.toLowerCase()==="rect" && e.getAttribute("width")==="600" && e.getAttribute("height")==="600");
  if(originalBackground) originalBackground.style.display=show?"none":"";
  let left=0,top=0,right=600,bottom=600;
  if(show && !document.querySelector("#main").hidden){
    const root=preview.getCTM();
    if(root){
      const inverse=root.inverse();
      for(const shape of art.querySelectorAll("path,rect,circle,polygon")){
        if(shape.closest("defs,mask,clipPath,pattern,[data-editor-only]"))continue;
        if(shape.parentNode===art && shape.tagName.toLowerCase()==="rect" && shape.getAttribute("width")==="600" && shape.getAttribute("height")==="600")continue;
        const matrix=shape.getCTM();if(!matrix)continue;
        const m=inverse.multiply(matrix), b=shape.getBBox(), stroke=Number(shape.getAttribute("stroke-width")||0)/2;
        const include=(x,y)=>{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);};
        if(shape.tagName.toLowerCase()==="circle"){
          const x=Number(shape.getAttribute("cx")),y=Number(shape.getAttribute("cy")),r=Number(shape.getAttribute("r"))+stroke;
          const cx=m.a*x+m.c*y+m.e,cy=m.b*x+m.d*y+m.f,rx=r*Math.hypot(m.a,m.c),ry=r*Math.hypot(m.b,m.d);
          include(cx-rx,cy-ry);include(cx+rx,cy+ry);
        } else {
          for(const x of [b.x-stroke,b.x+b.width+stroke])for(const y of [b.y-stroke,b.y+b.height+stroke])include(m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f);
        }
      }
    }
  }
  left=Math.floor(left+1e-7);top=Math.floor(top+1e-7);right=Math.ceil(right-1e-7);bottom=Math.ceil(bottom-1e-7);
  const w=right-left,h=bottom-top,max=Math.max(w,h);
  preview.setAttribute("viewBox",[left,top,w,h].join(" "));
  preview.style.width=(100*w/max)+"%";preview.style.height=(100*h/max)+"%";preview.style.aspectRatio=w+" / "+h;
  document.querySelector(".preview-size").textContent=w+" × "+h;
  if(show){
    if(controls.background.checked){
      const bg=document.createElementNS(SVG_NS,"rect");bg.classList.add("expanded-frame-background");
      for(const [key,value] of Object.entries({x:left,y:top,width:w,height:h,fill:"#fff"}))bg.setAttribute(key,value);
      preview.insertBefore(bg,art);
    }
    const guide=document.createElementNS(SVG_NS,"rect");guide.classList.add("artboard-guide");
    for(const [key,value] of Object.entries({x:0,y:0,width:600,height:600,fill:"none",stroke:"#a7a8a9","stroke-width":1,"stroke-dasharray":"5 4","vector-effect":"non-scaling-stroke","pointer-events":"none","aria-hidden":"true"}))guide.setAttribute(key,value);
    preview.append(guide);
  }
}

function buildExportSvg() {
  updatePreviewFrame();
  const settings = readSettings();
  const clone = preview.cloneNode(true);
  stripOrbitalEditorDecoration(clone);
  clone.querySelector("#shape-title")?.remove();
  clone.querySelector("#shape-desc")?.remove();
  clone.setAttribute("xmlns", SVG_NS);
  clone.querySelector(".artboard-guide")?.remove();
  clone.removeAttribute("style");
  const [, , width, height] = preview.getAttribute("viewBox").split(" ");
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  clone.setAttribute("role", "img");
  clone.setAttribute("aria-labelledby", "export-title export-desc");

  const title = document.createElementNS(SVG_NS, "title");
  title.setAttribute("id", "export-title");
  title.textContent = "Pressbooks Shapes " + (settings.type === "concentric" ? "concentric ring composition" : settings.type + " composition");
  const description = document.createElementNS(SVG_NS, "desc");
  description.setAttribute("id", "export-desc");
  const overlapDescription = settings.overlapMode === "transparent"
    ? " with overlapping areas removed"
    : settings.overlapMode === "multiply" ? " with overlapping colours multiplied" : "";
  description.textContent = settings.type === "orbital" ? orbitalState.count + " circular outlines" + overlapDescription + "." : settings.type === "triangular" ? triangleState.rows + " rows and " + triangleState.columns + " columns of proportional right triangles." : settings.type === "modular" ? modularState.rows + " rows and " + modularState.columns + " columns of rounded rectangles across " + modularState.layers + " layers" + overlapDescription + "." : settings.type === "contour" ? contourState.count + " parallel contour lines and " + contourState.accents + " accent circles." : settings.type !== "concentric"
    ? settings.segments + " " + settings.type + " " + objectName(settings.type) + "s" + overlapDescription + "."
    : settings.rings + " concentric rings and " + settings.segments + " groups" + overlapDescription + ".";
  clone.insertBefore(description, clone.firstChild);
  clone.insertBefore(title, clone.firstChild);

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function downloadSvg() {
  const blob = new Blob([buildExportSvg()], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pressbooks-" + (designTypeSelect.value === "concentric" ? "concentric-rings" : designTypeSelect.value === "contour" ? "contour-lines" : designTypeSelect.value === "modular" ? "modular-grid" : designTypeSelect.value === "triangular" ? "triangular-grid" : designTypeSelect.value + "-" + objectName() + "s") + ".svg";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildPresetPayload() {
  const settings = readSettings();
  if (settings.type === "orbital") return {
    format: "pressbooks-shapes-preset", version: 2, designType: "orbital", randomSeed: compositionSeed,
    settings: {rotationDegrees: settings.rotation, scalePercent: Math.round(settings.scale * 100), background: settings.background, overlapMode: settings.overlapMode, showAll: settings.showAll},
    orbital: orbitalClone()
  };
  if (settings.type === "triangular") return {
    format: "pressbooks-shapes-preset", version: 2, designType: "triangular", randomSeed: compositionSeed,
    patterns: clonePatternFills(),
    settings: {rotationDegrees: settings.rotation, scalePercent: Math.round(settings.scale * 100), background: settings.background, showAll: settings.showAll},
    triangular: triangleClone()
  };
  if (settings.type === "modular") return {
    format: "pressbooks-shapes-preset", version: 2, designType: "modular", randomSeed: compositionSeed,
    patterns: clonePatternFills(),
    settings: {rotationDegrees: settings.rotation, scalePercent: Math.round(settings.scale * 100), background: settings.background, overlapMode: settings.overlapMode, showAll: settings.showAll},
    modular: modularClone()
  };
  if (settings.type === "contour") return {
    format: "pressbooks-shapes-preset", version: 2, designType: "contour", randomSeed: compositionSeed,
    patterns: clonePatternFills(),
    settings: {rotationDegrees: settings.rotation, scalePercent: Math.round(settings.scale * 100), background: settings.background, showAll: settings.showAll},
    contour: contourClone()
  };
  return {
    format: "pressbooks-shapes-preset",
    version: 2,
    designType: settings.type,
    randomSeed: compositionSeed,
    patterns: clonePatternFills(),
    settings: {
      rings: settings.rings,
      groups: settings.segments,
      ringSpacingPx: settings.spacing,
      innerClearancePercent: Math.round(settings.clearance * 100),
      variationPercent: Math.round(settings.variation * 100),
      scalePercent: Math.round(settings.scale * 100),
      rotationDegrees: settings.rotation,
      background: settings.background,
      showAll: settings.showAll,
      overlapMode: settings.overlapMode,
      radiating: {
        baselineSpanPx: settings.bandSpan,
        fanSpreadDegrees: settings.fanAngle,
        bandLengthPx: settings.bandLength,
        bandWidthPx: settings.bandWidth,
        baselineY: settings.baselineY
      },
      ...(settings.type === "interlocking" ? { interlocking: {
        diameterPx: settings.circleDiameter, spacingPercent: settings.circleSpacing, arrangement: settings.circleArrangement
      }} : {}),
      ...(settings.type === "concentric" ? { centreDot: {
        visible: settings.dotVisible,
        sizePercent: Math.round(settings.dotSize * 100),
        colour: settings.dotColor,
        horizontalPosition: settings.dotX,
        verticalPosition: settings.dotY
      }} : {})
    },
    groups: Array.from({ length: settings.segments }, function (_, segment) {
      const offset = segmentOffsets.get(segment) || { x: 0, y: 0 };
      return {
        index: segment + 1,
        colour: settings.colors[segment],
        empty: emptyGroups.has(segment),
        horizontalOffset: offset.x,
        verticalOffset: offset.y,
        rotationDegrees: segmentRotations.get(segment) || 0,
        ...(settings.type === "interlocking" ? { diameterPercent: circleSizes.get(segment) || 100 } : {}),
        sections: Array.from({ length: settings.rings }, function (__, ring) {
          const key = cellKey(ring, segment);
          return {
            ring: ring + 1,
            empty: emptyCells.has(key),
            colour: cellColors.has(key) ? cellColors.get(key).toUpperCase() : null
          };
        })
      };
    })
  };
}

function exportPresetSettings() {
  const payload = buildPresetPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pressbooks-shapes-" + designTypeSelect.value + "-preset.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}

function isIntegerBetween(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isBrandColour(value) {
  return typeof value === "string" && ALL_PALETTE_COLOURS.includes(value.toUpperCase());
}

function validatePresetPayload(payload) {
  if (payload?.settings?.showAll !== undefined && typeof payload.settings.showAll !== "boolean") throw new Error("Invalid Show all setting.");
  if (payload?.format === "pressbooks-shapes-preset" && payload.designType === "orbital") {
    if (!validOrbitalPreset(payload)) throw new Error("This orbital preset has unsupported settings or geometry.");
    return payload;
  }
  if (payload && !validPatternFills(payload.patterns,payload.designType)) throw new Error("This preset has unsupported pattern fills.");
  if (payload?.format === "pressbooks-shapes-preset" && payload.designType === "triangular") {
    if (!validTriangularPreset(payload)) throw new Error("This triangular preset has unsupported settings or geometry.");
    return payload;
  }
  if (payload?.format === "pressbooks-shapes-preset" && payload.designType === "modular") {
    if (!validModularPreset(payload)) throw new Error("This modular preset has unsupported settings or geometry.");
    return payload;
  }
  if (payload?.format === "pressbooks-shapes-preset" && payload.designType === "contour") {
    if (!validContourPreset(payload)) throw new Error("This contour preset has unsupported settings or geometry.");
    return payload;
  }
  const supportedDesign = payload && (payload.designType === "concentric"
    || payload.version === 2 && ["radiating", "interlocking"].includes(payload.designType));
  if (!payload || payload.format !== "pressbooks-shapes-preset" || ![1, 2].includes(payload.version) || !supportedDesign) {
    throw new Error("Choose a supported Pressbooks Shapes preset JSON file.");
  }

  const settings = payload.settings;
  const dot = settings && settings.centreDot;
  const radiating = settings && settings.radiating;
  const interlocking = settings && settings.interlocking;
  const settingsValid = settings
    && isIntegerBetween(settings.rings, 1, 8)
    && isIntegerBetween(settings.groups, 1, 8)
    && isIntegerBetween(settings.ringSpacingPx, 0, 24)
    && isIntegerBetween(settings.innerClearancePercent, 15, 60)
    && isIntegerBetween(settings.variationPercent, 0, 100)
    && isIntegerBetween(settings.scalePercent, 70, 150)
    && isIntegerBetween(settings.rotationDegrees, 0, 359)
    && typeof settings.background === "boolean"
    && (payload.version === 1
      ? typeof settings.excludeOverlaps === "boolean"
      : ["normal", "transparent", "multiply"].includes(settings.overlapMode))
    && (payload.designType !== "radiating" || payload.version === 2
      && isIntegerBetween(settings.rings, 1, 1)
      && radiating
      && isIntegerBetween(radiating.baselineSpanPx, 80, 360)
      && isIntegerBetween(radiating.fanSpreadDegrees, 0, 70)
      && isIntegerBetween(radiating.bandLengthPx, 140, 520)
      && isIntegerBetween(radiating.bandWidthPx, 8, 72)
      && isIntegerBetween(radiating.baselineY, 280, 600))
    && (payload.designType !== "interlocking" || settings.rings === 1
      && isIntegerBetween(settings.groups, 2, 8) && interlocking
      && isIntegerBetween(interlocking.diameterPx, 40, 600)
      && isIntegerBetween(interlocking.spacingPercent, 5, 150)
      && ["linear", "alternating", "circular"].includes(interlocking.arrangement))
    && (payload.designType !== "concentric" || dot
    && typeof dot.visible === "boolean"
    && isIntegerBetween(dot.sizePercent, 0, 30)
    && isBrandColour(dot.colour)
    && isIntegerBetween(dot.horizontalPosition, -250, 250)
    && isIntegerBetween(dot.verticalPosition, -250, 250));
  if (!settingsValid || !isIntegerBetween(payload.randomSeed, 1, 1000000000)
    || !Array.isArray(payload.groups) || payload.groups.length !== settings.groups) {
    throw new Error("This preset has unsupported settings or Pressbooks colours.");
  }

  const groupsValid = payload.groups.every(function (group, index) {
    return group
      && group.index === index + 1
      && isBrandColour(group.colour)
      && typeof group.empty === "boolean"
      && isIntegerBetween(group.horizontalOffset, -100, 100)
      && isIntegerBetween(group.verticalOffset, -100, 100)
      && isIntegerBetween(group.rotationDegrees, -180, 180)
      && (payload.designType !== "interlocking" || isIntegerBetween(group.diameterPercent, 25, 200))
      && Array.isArray(group.sections)
      && group.sections.length === settings.rings
      && group.sections.every(function (section, ring) {
        return section
          && section.ring === ring + 1
          && typeof section.empty === "boolean"
          && (section.colour === null || isBrandColour(section.colour));
      });
  });
  if (!groupsValid) throw new Error("This preset has unsupported group or section data.");
  return payload;
}

function applyPresetPayload(payload) {
  const settings = payload.settings;
  setDesignType(payload.designType, true, false);
  controls.showAll.checked = Boolean(settings.showAll);
  if (payload.designType === "orbital") {
    applyOrbitalCandidate({orbital:payload.orbital,seed:payload.randomSeed,settings:{rotation:settings.rotationDegrees,scale:settings.scalePercent,background:settings.background,overlapMode:settings.overlapMode}});
    return;
  }
  restorePatternFills(payload.patterns);
  if (payload.designType === "triangular") {
    applyTriangularCandidate({triangular: payload.triangular, seed: payload.randomSeed, patterns: payload.patterns,
      settings: {rotation: settings.rotationDegrees, scale: settings.scalePercent, background: settings.background, showAll: settings.showAll}});
    return;
  }
  if (payload.designType === "modular") {
    applyModularCandidate({modular: payload.modular, seed: payload.randomSeed, patterns: payload.patterns,
      settings: {rotation: settings.rotationDegrees, scale: settings.scalePercent, background: settings.background, overlapMode: settings.overlapMode, showAll: settings.showAll}});
    return;
  }
  if (payload.designType === "contour") {
    applyContourCandidate({contour: payload.contour, seed: payload.randomSeed, patterns: payload.patterns,
      settings: {rotation: settings.rotationDegrees, scale: settings.scalePercent, background: settings.background, showAll: settings.showAll}});
    return;
  }
  controls.rings.value = String(settings.rings);
  controls.segments.value = String(settings.groups);
  if (payload.designType === "radiating") {
    controls.bandCount.value = String(settings.groups);
    controls.bandSpan.value = String(settings.radiating.baselineSpanPx);
    controls.fanAngle.value = String(settings.radiating.fanSpreadDegrees);
    controls.bandLength.value = String(settings.radiating.bandLengthPx);
    controls.bandWidth.value = String(settings.radiating.bandWidthPx);
    controls.baselineY.value = String(settings.radiating.baselineY);
  }
  if (payload.designType === "interlocking") {
    controls.circleCount.value = String(settings.groups);
    controls.circleDiameter.value = String(settings.interlocking.diameterPx);
    controls.circleSpacing.value = String(settings.interlocking.spacingPercent);
    controls.circleArrangement.value = settings.interlocking.arrangement;
  }
  controls.spacing.value = String(settings.ringSpacingPx);
  controls.clearance.value = String(settings.innerClearancePercent);
  controls.variation.value = String(settings.variationPercent);
  controls.scale.value = String(settings.scalePercent);
  controls.rotation.value = String(settings.rotationDegrees);
  if (payload.designType === "concentric") {
    controls.dotVisible.checked = settings.centreDot.visible;
    controls.dotSize.value = String(settings.centreDot.sizePercent);
    controls.dotColor.dataset.color = settings.centreDot.colour.toUpperCase();
    controls.dotX.value = String(settings.centreDot.horizontalPosition);
    controls.dotY.value = String(settings.centreDot.verticalPosition);
  }
  controls.background.checked = settings.background;
  const overlapMode = payload.version === 1
    ? settings.excludeOverlaps ? "transparent" : "normal"
    : settings.overlapMode;
  controls.overlapModes.forEach(function (input) { input.checked = input.value === overlapMode; });

  groupColours.splice(0, groupColours.length, ...payload.groups.map(function (group) { return group.colour.toUpperCase(); }));
  cellColors.clear();
  emptyCells.clear();
  emptyGroups.clear();
  segmentOffsets.clear();
  segmentRotations.clear();
  circleSizes.clear();
  payload.groups.forEach(function (group, segment) {
    if (group.empty) emptyGroups.add(segment);
    if (group.horizontalOffset || group.verticalOffset) {
      segmentOffsets.set(segment, { x: group.horizontalOffset, y: group.verticalOffset });
    }
    if (group.rotationDegrees) segmentRotations.set(segment, group.rotationDegrees);
    if (payload.designType === "interlocking") circleSizes.set(segment, group.diameterPercent);
    group.sections.forEach(function (section, ring) {
      const key = cellKey(ring, segment);
      if (section.empty) emptyCells.add(key);
      if (section.colour !== null) cellColors.set(key, section.colour.toUpperCase());
    });
  });

  compositionSeed = payload.randomSeed;
  selectedCell = { ring: 0, segment: 0 };
  activeGroup = 0;
  pendingGroupIndex = null;
  groupInspector.classList.remove("is-fading-out");
  closePalette(false);
  render();
}

let presetNoticeTimer;
function showPresetNotice(message, isError) {
  window.clearTimeout(presetNoticeTimer);
  presetNotice.textContent = message;
  presetNotice.classList.toggle("is-error", Boolean(isError));
  presetNotice.hidden = false;
  presetNoticeTimer = window.setTimeout(function () { presetNotice.hidden = true; }, 5000);
}

async function importPresetFile(file) {
  try {
    const payload = validatePresetPayload(JSON.parse(await file.text()));
    applyPresetPayload(payload);
    showEditor(payload.designType);
    showPresetNotice("Preset imported. The current composition has been replaced.", false);
  } catch (error) {
    showPresetNotice(error instanceof SyntaxError ? "This file is not valid JSON." : error.message, true);
  }
  presetFileInput.value = "";
  document.querySelector("#preset-menu-toggle").focus();
}

function createSurpriseCandidate(type = designTypeSelect.value) {
  if (type === "triangular") return createTriangularCandidate();
  if (type === "modular") return createModularCandidate();
  if (type === "contour") return createContourCandidate();
  if (type === "radiating") return createRadiatingCandidate();
  if (type === "interlocking") return createInterlockingCandidate();
  const rings = randomInteger(3, 8);
  const segments = randomInteger(2, 8);
  const settings = {
    rings: rings,
    segments: segments,
    spacing: randomInteger(2, 18),
    clearance: randomInteger(22, 48),
    variation: Math.random() < 0.24 ? 0 : randomInteger(4, 30),
    scale: randomInteger(85, 120),
    rotation: randomInteger(0, 359),
    dotSize: Math.random() < 0.2 ? 0 : randomInteger(6, 24),
    dotVisible: Math.random() < 0.78,
    dotX: randomInteger(-30, 30, 5),
    dotY: randomInteger(-30, 30, 5),
    background: Math.random() < 0.28,
    overlapMode: segments > 1 ? randomChoice(["normal", "normal", "normal", "transparent", "multiply"]) : "normal",
    dotColor: randomChoice(BRAND_100_COLOURS)
  };
  const familyCount = randomInteger(2, Math.min(4, segments));
  const colourFamilies = shuffled(BRAND_PALETTE).slice(0, familyCount);
  const colours = Array.from({ length: segments }, function (_, segment) {
    const family = colourFamilies[segment % colourFamilies.length];
    const tone = Math.random() < 0.78 ? "100" : randomChoice(["80", "120"]);
    return family.values.find(function (entry) { return entry[0] === tone; })[1].toUpperCase();
  });

  const candidate = {
    type: "concentric",
    settings: settings,
    colours: colours,
    cellColours: new Map(),
    emptyCells: new Set(),
    emptyGroups: new Set(),
    groupOffsets: new Map(),
    groupRotations: new Map(),
    seed: randomInteger(1, 1000000000)
  };
  for (let segment = 1; segment < segments; segment += 1) {
    if (Math.random() < 0.12) candidate.emptyGroups.add(segment);
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      if (candidate.emptyGroups.has(segment)) continue;
      const key = cellKey(ring, segment);
      const roll = Math.random();
      if (roll < 0.055) candidate.emptyCells.add(key);
      else if (roll < 0.13) candidate.cellColours.set(key, randomChoice(ALL_PALETTE_COLOURS));
    }
  }
  candidate.emptyCells.delete(cellKey(0, 0));

  for (let segment = 0; segment < segments; segment += 1) {
    if (Math.random() < 0.62) {
      const offset = { x: randomInteger(-28, 28, 4), y: randomInteger(-28, 28, 4) };
      if (offset.x || offset.y) candidate.groupOffsets.set(segment, offset);
    }
    if (Math.random() < 0.58) {
      const rotation = randomInteger(-35, 35, 5);
      if (rotation) candidate.groupRotations.set(segment, rotation);
    }
  }
  return candidate;
}

function createRadiatingCandidate() {
  const segments = randomInteger(4, 8);
  const settings = {
    type: "radiating",
    rings: 1,
    segments: segments,
    spacing: 0,
    clearance: randomInteger(22, 48),
    variation: Math.random() < 0.22 ? 0 : randomInteger(4, 24),
    scale: randomInteger(88, 112),
    rotation: randomInteger(0, 359),
    background: Math.random() < 0.28,
    overlapMode: randomChoice(["normal", "normal", "multiply", "multiply", "transparent"]),
    bandSpan: randomInteger(160, 300, 10),
    fanAngle: randomInteger(20, 56),
    bandLength: randomInteger(260, 440, 10),
    bandWidth: randomInteger(18, 48, 2),
    baselineY: randomInteger(500, 590, 10)
  };
  const familyCount = randomInteger(2, Math.min(4, segments));
  const colourFamilies = shuffled(BRAND_PALETTE).slice(0, familyCount);
  const colours = Array.from({ length: segments }, function (_, segment) {
    const family = colourFamilies[segment % colourFamilies.length];
    const tone = Math.random() < 0.78 ? "100" : randomChoice(["80", "120"]);
    return family.values.find(function (entry) { return entry[0] === tone; })[1].toUpperCase();
  });
  const candidate = {
    type: "radiating",
    settings: settings,
    colours: colours,
    cellColours: new Map(),
    emptyCells: new Set(),
    emptyGroups: new Set(),
    groupOffsets: new Map(),
    groupRotations: new Map(),
    seed: randomInteger(1, 1000000000)
  };
  for (let segment = 1; segment < segments; segment += 1) {
    if (Math.random() < 0.08) candidate.emptyGroups.add(segment);
  }
  for (let segment = 0; segment < segments; segment += 1) {
    if (Math.random() < 0.5) {
      const offset = { x: randomInteger(-20, 20, 4), y: randomInteger(-20, 20, 4) };
      if (offset.x || offset.y) candidate.groupOffsets.set(segment, offset);
    }
    if (Math.random() < 0.35) {
      const rotation = randomInteger(-15, 15, 3);
      if (rotation) candidate.groupRotations.set(segment, rotation);
    }
  }
  return candidate;
}

function createInterlockingCandidate(reference = false) {
  const arrangement = reference ? "linear" : randomChoice(["linear", "linear", "alternating", "circular"]);
  const segments = reference ? 3 : randomInteger(2, arrangement === "circular" ? 8 : 6);
  const settings = {
    type: "interlocking", rings: 1, segments,
    circleDiameter: reference ? 340 : randomInteger(150, 430, 10),
    circleSpacing: reference ? 65 : randomInteger(40, 95, 5),
    circleArrangement: arrangement,
    variation: reference ? 0 : randomChoice([0, 0, 5, 10, 15, 25]),
    scale: reference ? 100 : randomInteger(85, 115, 5),
    rotation: reference ? 0 : randomChoice([0, 0, 30, 45, 90, 135, 180, 270]),
    background: reference || Math.random() < 0.35,
    overlapMode: reference ? "multiply" : randomChoice(["multiply", "multiply", "normal", "transparent"])
  };
  const families = shuffled(BRAND_PALETTE).slice(0, Math.min(segments, randomInteger(2, 4)));
  const colours = reference ? INTERLOCKING_DEFAULT_COLOURS.slice() : Array.from({ length: segments }, function (_, i) {
    const family = families[i % families.length];
    return family.values.find(function (entry) { return entry[0] === "100"; })[1];
  });
  const candidate = { type: "interlocking", settings, colours,
    cellColours: new Map(), emptyCells: new Set(), emptyGroups: new Set(),
    groupOffsets: new Map(), groupRotations: new Map(), circleSizes: new Map(),
    seed: reference ? 4821 : randomInteger(1, 1000000000) };
  if (!reference && Math.random() < 0.35) {
    const index = randomInteger(0, segments - 1);
    candidate.circleSizes.set(index, randomInteger(75, 125, 5));
  }
  return candidate;
}

function evaluateInterlockingCandidate(candidate) {
  const raw = candidate.settings;
  const settings = { ...raw, scale: raw.scale / 100, variation: raw.variation / 100 };
  const circles = Array.from({ length: settings.segments }, function (_, i) {
    return circleGeometry(settings, i, candidate.seed, candidate.circleSizes);
  });
  const angle = -settings.rotation * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const grid = 32;
  let painted = 0, totalCovered = 0, overlap = 0, sx = 0, sy = 0;
  const visible = new Set();
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const x = (col + .5) * 600 / grid, y = (row + .5) * 600 / grid;
      const dx = x - CENTER, dy = y - CENTER;
      const ax = CENTER + dx * cos - dy * sin, ay = CENTER + dx * sin + dy * cos;
      let hits = 0;
      circles.forEach(function (circle, i) {
        if ((ax - circle.x) ** 2 + (ay - circle.y) ** 2 <= circle.r ** 2) { hits++; visible.add(i); }
      });
      if (hits) totalCovered++;
      if (hits > 1) overlap++;
      if (settings.overlapMode === "transparent" ? hits !== 1 : hits === 0) continue;
      painted++; sx += x; sy += y;
    }
  }
  const coverage = painted / (grid * grid);
  const overlapShare = overlap / Math.max(1, totalCovered);
  const centroid = painted ? Math.hypot(sx / painted - CENTER, sy / painted - CENTER) / CENTER : 1;
  const radii = circles.map(c => c.r);
  const consistency = Math.min(...radii) / Math.max(...radii);
  return scoreDesignCandidate({
    palette: scorePaletteHarmony(candidate),
    balance: clamp01(1 - centroid / .35),
    negativeSpace: clamp01(1 - Math.abs(coverage - .48) / .48),
    restraint: .55 * consistency + .45 * clamp01(1 - Math.abs(overlapShare - .25) / .5),
    valid: visible.size === settings.segments && coverage >= .12 && coverage <= .82 && overlapShare >= .04 && overlapShare <= .65
  });
}

function paletteEntry(hex) {
  for (let family = 0; family < BRAND_PALETTE.length; family += 1) {
    const value = BRAND_PALETTE[family].values.find(function (entry) { return entry[1].toUpperCase() === hex.toUpperCase(); });
    if (value) return { family: family, tone: Number(value[0]) };
  }
  return null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function scorePaletteHarmony(candidate) {
  const entries = candidate.colours.map(paletteEntry).filter(Boolean);
  const uniqueFamilies = new Set(entries.map(function (entry) { return entry.family; })).size;
  const diversity = clamp01(uniqueFamilies / Math.min(3, candidate.settings.segments));
  const baseToneShare = entries.length
    ? entries.filter(function (entry) { return entry.tone === 100; }).length / entries.length
    : 0;
  let distinctNeighbours = 1;
  if (entries.length > 1) {
    let distinctCount = 0;
    for (let index = 0; index < entries.length; index += 1) {
      const current = entries[index];
      const next = entries[(index + 1) % entries.length];
      if (current.family !== next.family || Math.abs(current.tone - next.tone) >= 20) distinctCount += 1;
    }
    distinctNeighbours = distinctCount / entries.length;
  }
  const overrideShare = candidate.cellColours.size / Math.max(1, candidate.settings.rings * candidate.settings.segments);
  const overrideRestraint = clamp01(1 - overrideShare / 0.25);
  return 0.4 * diversity + 0.3 * baseToneShare + 0.2 * distinctNeighbours + 0.1 * overrideRestraint;
}

// Every composition family supplies the same normalized measures here. Keep
// these weights and the retry logic shared as new shape generators are added.
function scoreDesignCandidate(metrics) {
  const palette = clamp01(metrics.palette);
  const balance = clamp01(metrics.balance);
  const negativeSpace = clamp01(metrics.negativeSpace);
  const restraint = clamp01(metrics.restraint);
  const valid = metrics.valid !== false;
  const score = 0.30 * palette + 0.25 * balance + 0.25 * negativeSpace + 0.20 * restraint;
  return { score: score, valid: valid, parts: { palette: palette, balance: balance, negativeSpace: negativeSpace, restraint: restraint } };
}

function scoreConcentricCandidate(candidate, geometry) {
  const palette = scorePaletteHarmony(candidate);
  const balance = clamp01(1 - geometry.centroidOffset / 0.2);
  const negativeSpace = clamp01(1 - Math.abs(geometry.coverage - 0.36) / 0.36);
  const offsets = Array.from({ length: candidate.settings.segments }, function (_, index) {
    return candidate.groupOffsets.get(index) || { x: 0, y: 0 };
  });
  const rotations = Array.from({ length: candidate.settings.segments }, function (_, index) {
    return Math.abs(candidate.groupRotations.get(index) || 0);
  });
  const meanOffset = offsets.reduce(function (sum, offset) { return sum + Math.hypot(offset.x, offset.y) / 40; }, 0) / offsets.length;
  const meanRotation = rotations.reduce(function (sum, rotation) { return sum + rotation / 45; }, 0) / rotations.length;
  const variation = candidate.settings.variation / 30;
  const scaleChange = Math.abs(candidate.settings.scale - 100) / 30;
  const restraint = clamp01(1 - (0.35 * meanOffset + 0.25 * meanRotation + 0.2 * variation + 0.2 * scaleChange));
  const valid = geometry.visibleSections >= Math.min(3, candidate.settings.rings)
    && geometry.coverage >= 0.1
    && geometry.coverage <= 0.72
    && geometry.edgeShare <= 0.16;

  return scoreDesignCandidate({ palette: palette, balance: balance, negativeSpace: negativeSpace, restraint: restraint, valid: valid });
}

function chooseHarmoniousCandidate(generateCandidate, evaluateCandidate, attempts, threshold) {
  const maxAttempts = attempts || 16;
  const minimumScore = threshold === undefined ? 0.72 : threshold;
  let best = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateCandidate();
    const quality = evaluateCandidate(candidate);
    candidate.quality = quality;
    if (!quality.valid) continue;
    if (!best || quality.score > best.quality.score) best = candidate;
    if (quality.score >= minimumScore) return candidate;
  }
  if (best) return best;
  const fallback = generateCandidate();
  fallback.quality = evaluateCandidate(fallback);
  return fallback;
}

function measureConcentricCandidate(candidate) {
  const settings = candidate.settings;
  const outerRadius = 245 * settings.scale / 100;
  const innerRadius = outerRadius * settings.clearance / 100;
  const radialSpace = Math.max(1, outerRadius - innerRadius);
  const gap = Math.min(settings.spacing, radialSpace / (settings.rings * 2));
  const ringWidth = (radialSpace - gap * (settings.rings - 1)) / settings.rings;
  const segmentAngle = 360 / settings.segments;
  const globalAngle = -settings.rotation * Math.PI / 180;
  const cosGlobal = Math.cos(globalAngle);
  const sinGlobal = Math.sin(globalAngle);
  const gridSize = 32;
  let paintedCount = 0;
  let sumX = 0;
  let sumY = 0;
  let edgeCount = 0;
  const visibleSections = new Set();

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const screenX = (column + 0.5) * 600 / gridSize;
      const screenY = (row + 0.5) * 600 / gridSize;
      const dx = screenX - CENTER;
      const dy = screenY - CENTER;
      const artX = CENTER + dx * cosGlobal - dy * sinGlobal;
      const artY = CENTER + dx * sinGlobal + dy * cosGlobal;
      let coveredGroups = 0;
      for (let segment = 0; segment < settings.segments; segment += 1) {
        if (candidate.emptyGroups.has(segment)) continue;
        const offset = candidate.groupOffsets.get(segment) || { x: 0, y: 0 };
        const localX = artX - offset.x - CENTER;
        const localY = artY - offset.y - CENTER;
        const radius = Math.hypot(localX, localY);
        const ring = Math.floor((outerRadius - radius) / (ringWidth + gap));
        if (ring < 0 || ring >= settings.rings) continue;
        const ringOuter = outerRadius - ring * (ringWidth + gap);
        const ringInner = ringOuter - ringWidth;
        if (radius > ringOuter || radius < ringInner) continue;
        const jitter = settings.variation === 0 ? 0 : (seededUnit(ring + 1, candidate.seed) * 2 - 1) * (settings.variation / 100) * segmentAngle * 0.3;
        const start = 180 + (candidate.groupRotations.get(segment) || 0) + ring * jitter + segment * segmentAngle;
        const angle = (Math.atan2(localY, localX) * 180 / Math.PI + 360) % 360;
        const relativeAngle = ((angle - start) % 360 + 360) % 360;
        if (relativeAngle >= segmentAngle) continue;
        const key = cellKey(ring, segment);
        if (candidate.emptyCells.has(key)) continue;
        coveredGroups += 1;
        visibleSections.add(key);
      }

      let painted = settings.overlapMode === "transparent" ? coveredGroups === 1 : coveredGroups > 0;
      if (settings.dotVisible && settings.dotSize > 0) {
        const dotX = CENTER + settings.dotX;
        const dotY = CENTER + settings.dotY;
        const dotDx = artX - dotX;
        const dotDy = artY - dotY;
        const dotRadius = outerRadius * settings.dotSize / 100;
        if (dotDx * dotDx + dotDy * dotDy <= dotRadius * dotRadius) painted = true;
      }
      if (!painted) continue;
      paintedCount += 1;
      sumX += screenX;
      sumY += screenY;
      if (row === 0 || column === 0 || row === gridSize - 1 || column === gridSize - 1) edgeCount += 1;
    }
  }

  const totalSamples = gridSize * gridSize;
  const centroidX = paintedCount ? sumX / paintedCount : CENTER;
  const centroidY = paintedCount ? sumY / paintedCount : CENTER;
  return {
    coverage: paintedCount / totalSamples,
    centroidOffset: Math.hypot(centroidX - CENTER, centroidY - CENTER) / 300,
    edgeShare: paintedCount ? edgeCount / paintedCount : 1,
    visibleSections: visibleSections.size,
    valid: visibleSections.size >= Math.min(3, settings.rings)
      && paintedCount / totalSamples >= 0.1
      && paintedCount / totalSamples <= 0.72
      && (paintedCount ? edgeCount / paintedCount : 1) <= 0.16
  };
}

function evaluateConcentricCandidate(candidate) {
  const geometry = measureConcentricCandidate(candidate);
  return scoreConcentricCandidate(candidate, geometry);
}

function evaluateRadiatingCandidate(candidate) {
  const settings = candidate.settings;
  const gridSize = 32;
  const scale = settings.scale / 100;
  const baseline = CENTER + (settings.baselineY - CENTER) * scale;
  const globalAngle = -settings.rotation * Math.PI / 180;
  const cosGlobal = Math.cos(globalAngle);
  const sinGlobal = Math.sin(globalAngle);
  const visibleBands = new Set();
  let paintedCount = 0;
  let sumX = 0;
  let sumY = 0;
  let edgeCount = 0;

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const screenX = (column + 0.5) * 600 / gridSize;
      const screenY = (row + 0.5) * 600 / gridSize;
      const dx = screenX - CENTER;
      const dy = screenY - CENTER;
      const artX = CENTER + dx * cosGlobal - dy * sinGlobal;
      const artY = CENTER + dx * sinGlobal + dy * cosGlobal;
      let coveredBands = 0;
      for (let segment = 0; segment < settings.segments; segment += 1) {
        if (candidate.emptyGroups.has(segment) || candidate.emptyCells.has(cellKey(0, segment))) continue;
        const position = settings.segments === 1 ? 0.5 : segment / (settings.segments - 1);
        const variation = settings.variation / 100;
        const angleJitter = (seededUnit(segment + 11, candidate.seed) - 0.5) * variation * 18;
        const lengthFactor = Math.max(0.35, 0.64 + 0.36 * Math.sin(Math.PI * position) + (seededUnit(segment + 29, candidate.seed) - 0.5) * variation * 0.5);
        const widthFactor = 1 + (seededUnit(segment + 47, candidate.seed) - 0.5) * variation * 0.4;
        const angle = ((position - 0.5) * settings.fanAngle + angleJitter + (candidate.groupRotations.get(segment) || 0)) * Math.PI / 180;
        const offset = candidate.groupOffsets.get(segment) || { x: 0, y: 0 };
        const anchorX = CENTER + (position - 0.5) * settings.bandSpan * scale + offset.x;
        const baselineY = baseline + offset.y;
        const localX = artX - anchorX;
        const localY = artY - baselineY;
        const along = localX * Math.sin(angle) - localY * Math.cos(angle);
        const across = localX * Math.cos(angle) + localY * Math.sin(angle);
        const length = settings.bandLength * scale * lengthFactor;
        const width = settings.bandWidth * scale * widthFactor;
        if (along < 0 || along > length || Math.abs(across) > width / 2) continue;
        coveredBands += 1;
        visibleBands.add(segment);
      }
      const painted = settings.overlapMode === "transparent" ? coveredBands === 1 : coveredBands > 0;
      if (!painted) continue;
      paintedCount += 1;
      sumX += screenX;
      sumY += screenY;
      if (row === 0 || column === 0 || row === gridSize - 1 || column === gridSize - 1) edgeCount += 1;
    }
  }

  const totalSamples = gridSize * gridSize;
  const centroidX = paintedCount ? sumX / paintedCount : CENTER;
  const centroidY = paintedCount ? sumY / paintedCount : CENTER;
  const geometry = {
    coverage: paintedCount / totalSamples,
    centroidOffset: Math.hypot(centroidX - CENTER, centroidY - CENTER) / 300,
    edgeShare: paintedCount ? edgeCount / paintedCount : 1,
    visibleBands: visibleBands.size
  };
  const palette = scorePaletteHarmony(candidate);
  const balance = clamp01(1 - geometry.centroidOffset / 0.3);
  const negativeSpace = clamp01(1 - Math.abs(geometry.coverage - 0.28) / 0.28);
  const restraint = clamp01(1 - (0.35 * settings.fanAngle / 70
    + 0.3 * settings.variation / 35
    + 0.2 * Math.abs(settings.scale - 100) / 25
    + 0.15 * settings.bandWidth / 72));
  const valid = geometry.visibleBands >= Math.min(3, settings.segments)
    && geometry.coverage >= 0.08
    && geometry.coverage <= 0.72
    && geometry.edgeShare <= 0.35;
  return scoreDesignCandidate({ palette: palette, balance: balance, negativeSpace: negativeSpace, restraint: restraint, valid: valid });
}

function applySurpriseCandidate(candidate) {
  restorePatternFills(candidate.patterns);
  if (candidate.type === "orbital") { applyOrbitalCandidate(candidate); return; }
  if (candidate.type === "triangular") { applyTriangularCandidate(candidate); return; }
  if (candidate.type === "modular") { applyModularCandidate(candidate); return; }
  if (candidate.type === "contour") { applyContourCandidate(candidate); return; }
  const settings = candidate.settings;
  if (candidate.type === "interlocking") {
    controls.circleCount.value = String(settings.segments);
    controls.circleDiameter.value = String(settings.circleDiameter);
    controls.circleSpacing.value = String(settings.circleSpacing);
    controls.circleArrangement.value = settings.circleArrangement;
  } else if (candidate.type === "radiating") {
    controls.bandCount.value = String(settings.segments);
    controls.bandSpan.value = String(settings.bandSpan);
    controls.fanAngle.value = String(settings.fanAngle);
    controls.bandLength.value = String(settings.bandLength);
    controls.bandWidth.value = String(settings.bandWidth);
    controls.baselineY.value = String(settings.baselineY);
  } else {
    controls.rings.value = String(settings.rings);
    controls.segments.value = String(settings.segments);
    controls.spacing.value = String(settings.spacing);
    controls.clearance.value = String(settings.clearance);
  }
  controls.variation.value = String(settings.variation);
  controls.scale.value = String(settings.scale);
  controls.rotation.value = String(settings.rotation);
  if (candidate.type === "concentric") {
    controls.dotSize.value = String(settings.dotSize);
    controls.dotVisible.checked = settings.dotVisible;
    controls.dotX.value = String(settings.dotX);
    controls.dotY.value = String(settings.dotY);
    controls.dotColor.dataset.color = settings.dotColor;
  }
  controls.background.checked = settings.background;
  controls.overlapModes.forEach(function (input) { input.checked = input.value === settings.overlapMode; });

  groupColours.splice(0, groupColours.length, ...candidate.colours);
  cellColors.clear();
  candidate.cellColours.forEach(function (colour, key) { cellColors.set(key, colour); });
  emptyCells.clear();
  candidate.emptyCells.forEach(function (key) { emptyCells.add(key); });
  emptyGroups.clear();
  candidate.emptyGroups.forEach(function (group) { emptyGroups.add(group); });
  segmentOffsets.clear();
  candidate.groupOffsets.forEach(function (offset, group) { segmentOffsets.set(group, offset); });
  segmentRotations.clear();
  candidate.groupRotations.forEach(function (rotation, group) { segmentRotations.set(group, rotation); });
  circleSizes.clear();
  candidate.circleSizes?.forEach(function (size, index) { circleSizes.set(index, size); });
  compositionSeed = candidate.seed;
  selectedCell = { ring: 0, segment: 0 };
  activeGroup = 0;
  render();
}

function harmoniousComposition(type) {
  const candidate = baseHarmoniousComposition(type);
  candidate.patterns = randomCandidatePatterns(candidate);
  return candidate;
}

function baseHarmoniousComposition(type) {
  if (type === "orbital") {
    const c=chooseHarmoniousCandidate(createOrbitalCandidate,evaluateOrbitalCandidate,16,.72);
    return c.quality.valid ? c : createOrbitalCandidate(true);
  }
  if (type === "triangular") {
    const candidate = chooseHarmoniousCandidate(createTriangularCandidate, evaluateTriangularCandidate, 16, 0.72);
    if (candidate.quality.valid) return candidate;
    const fallback = createTriangularCandidate(true);
    fallback.quality = evaluateTriangularCandidate(fallback);
    return fallback;
  }
  if (type === "modular") {
    const candidate = chooseHarmoniousCandidate(createModularCandidate, evaluateModularCandidate, 16, 0.72);
    if (candidate.quality.valid) return candidate;
    const fallback = createModularCandidate(true);
    fallback.quality = evaluateModularCandidate(fallback);
    return fallback;
  }
  if (type === "contour") {
    const candidate = chooseHarmoniousCandidate(createContourCandidate, evaluateContourCandidate, 16, 0.72);
    if (candidate.quality.valid) return candidate;
    const fallback = createContourCandidate(true);
    fallback.quality = evaluateContourCandidate(fallback);
    return fallback;
  }
  const candidate = chooseHarmoniousCandidate(
    function () { return createSurpriseCandidate(type); },
    type === "interlocking" ? evaluateInterlockingCandidate : type === "radiating" ? evaluateRadiatingCandidate : evaluateConcentricCandidate,
    16,
    0.72
  );
  if (type === "interlocking" && !candidate.quality.valid) {
    const fallback = createInterlockingCandidate(true);
    fallback.quality = evaluateInterlockingCandidate(fallback);
    return fallback;
  }
  return candidate;
}

function generateSurprise() {
  closePalette(false);
  pendingGroupIndex = null;
  groupInspector.classList.remove("is-fading-out");
  const independent = designTypeSelect.value !== "concentric";
  const candidate = harmoniousComposition(designTypeSelect.value);
  applySurpriseCandidate(candidate);
  const settings = candidate.settings;
  if (candidate.type === "orbital") {
    document.querySelector("#surprise-status").textContent = "New composition generated with " + candidate.orbital.count + " circular outlines.";
    return;
  }
  if (candidate.type === "triangular") {
    document.querySelector("#surprise-status").textContent = "New composition generated with " + candidate.triangular.rows + " rows and " + candidate.triangular.columns + " columns.";
    return;
  }
  if (candidate.type === "modular") {
    document.querySelector("#surprise-status").textContent = "New composition generated with " + candidate.modular.rows + " rows and " + candidate.modular.columns + " columns.";
    return;
  }
  if (candidate.type === "contour") {
    document.querySelector("#surprise-status").textContent = "New composition generated with " + candidate.contour.count + " parallel lines.";
    return;
  }
  document.querySelector("#surprise-status").textContent = independent
    ? "New composition generated with " + settings.segments + " " + objectName() + "s. Harmony score " + Math.round(candidate.quality?.score * 100 || 0) + " out of 100."
    : "New composition generated with " + settings.rings + " rings and " + settings.segments + " groups. Harmony score " + Math.round(candidate.quality?.score * 100 || 0) + " out of 100.";
}

Object.values(controls).forEach(function (control) {
  if (Array.isArray(control)) {
    control.forEach(function (input) {
      if (input.type !== "button") {
        input.addEventListener("input", render);
        input.addEventListener("change", render);
      }
    });
  } else if (control && control.type !== "checkbox" && control.type !== "color" && control.type !== "button") {
    control.addEventListener("input", render);
    if (control.tagName === "SELECT") control.addEventListener("change", render);
  } else if (control) {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  }
});
document.querySelector("#download-svg").addEventListener("click", downloadSvg);
document.querySelector("#export-settings").addEventListener("click", function () {
  presetMenu.open = false;
  exportPresetSettings();
});
document.querySelector("#import-preset").addEventListener("click", function () {
  presetMenu.open = false;
  presetFileInput.click();
});
presetFileInput.addEventListener("change", function () {
  const file = presetFileInput.files && presetFileInput.files[0];
  if (file) importPresetFile(file);
});
document.addEventListener("click", function (event) {
  if (!presetMenu.contains(event.target)) presetMenu.open = false;
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && presetMenu.open) {
    presetMenu.open = false;
    document.querySelector("#preset-menu-toggle").focus();
  }
});
const surpriseButton = document.querySelector("#surprise-me");
let surpriseAnimationTimer;
surpriseButton.addEventListener("click", function () {
  window.clearTimeout(surpriseAnimationTimer);
  surpriseButton.classList.remove("is-bursting");
  void surpriseButton.offsetWidth;
  surpriseButton.classList.add("is-bursting");
  surpriseAnimationTimer = window.setTimeout(function () {
    surpriseButton.classList.remove("is-bursting");
  }, 900);
  generateSurprise();
});
controls.dotColor.addEventListener("click", function () { openPalette(controls.dotColor, "dot"); });
function updateSegmentRotation(value) {
  segmentRotations.set(activeGroup, Number(value));
  render();
}
cellEditor.rotation.addEventListener("input", function () { updateSegmentRotation(cellEditor.rotation.value); });
document.querySelector("#circle-size").addEventListener("input", function (event) {
  circleSizes.set(activeGroup, Number(event.target.value));
  render();
});
document.querySelector("#reference-circles").addEventListener("click", function () {
  closePalette(false);
  pendingGroupIndex = null;
  groupInspector.classList.remove("is-fading-out");
  applySurpriseCandidate(createInterlockingCandidate(true));
});

function updateSegmentOffset(axis, value) {
  const current = segmentOffsets.get(activeGroup) || { x: 0, y: 0 };
  segmentOffsets.set(activeGroup, { ...current, [axis]: Number(value) });
  render();
}
cellEditor.x.addEventListener("input", function () { updateSegmentOffset("x", cellEditor.x.value); });
cellEditor.y.addEventListener("input", function () { updateSegmentOffset("y", cellEditor.y.value); });
document.querySelector("#reset-group-position").addEventListener("click", function () {
  segmentOffsets.delete(activeGroup);
  segmentRotations.delete(activeGroup);
  render();
});
attachNumericInputs();
initContour();
initModular();
initTriangular();
initOrbital();
initFillEditor();
cellEditor.empty.addEventListener("change", function () {
  if (!paletteTarget) return;
  if (paletteTarget.type === "triangular") {
    const key = paletteTarget.index;
    triangleOverride(key).visible = !cellEditor.empty.checked;
    closePalette(false);
    render();
    const trigger = trianglePaletteTrigger(key);
    if (trigger) openPalette(trigger, "triangular", key);
    return;
  }
  if (paletteTarget.type === "modular") {
    const key = paletteTarget.index;
    setModularEmpty(key, cellEditor.empty.checked);
    closePalette(false);
    render();
    const trigger = modularPaletteTrigger(key);
    if (trigger) openPalette(trigger, "modular", key);
    return;
  }
  if (paletteTarget.type === "group") {
    if (cellEditor.empty.checked) emptyGroups.add(paletteTarget.index);
    else emptyGroups.delete(paletteTarget.index);
  } else if (paletteTarget.type === "cell") {
    const key = cellKey(paletteTarget.ring, paletteTarget.segment);
    if (cellEditor.empty.checked) emptyCells.add(key);
    else emptyCells.delete(key);
    cellEditor.reset.disabled = !cellColors.has(key) && !emptyCells.has(key) && !patternFills.has(patternKey(paletteTarget));
  } else {
    return;
  }
  render();
  if (paletteTarget) {
    const trigger = paletteTarget.type === "group"
      ? groupPaletteButtons[paletteTarget.index]
      : segmentGrid.querySelector('.segment-cell[aria-pressed="true"]');
    if (trigger) {
      paletteTarget.trigger = trigger;
      trigger.setAttribute("aria-expanded", "true");
      positionPalette();
    }
  }
});
cellEditor.reset.addEventListener("click", function () {
  if (!paletteTarget) return;
  const target = paletteTarget;
  if (patternEligible(target)) patternFills.delete(patternKey(target));
  if (target.type === "triangular") {
    resetTriangle(target.index);
    closePalette(false);
    render();
    trianglePaletteTrigger(target.index)?.focus();
    return;
  }
  if (target.type === "modular") {
    resetModularModule(target.index);
    closePalette(false);
    render();
    modularPaletteTrigger(target.index)?.focus();
    return;
  }
  if (target.type === "cell") {
    cellColors.delete(cellKey(target.ring, target.segment));
    emptyCells.delete(cellKey(target.ring, target.segment));
  } else if (target.type === "group") {
    groupColours[target.index] = defaultColourFor(target.index);
  } else {
    return;
  }
  render();
  closePalette(false);
  (target.type === "group" ? groupPaletteButtons[target.index] : segmentGrid.querySelector('.segment-cell[aria-pressed="true"]'))?.focus();
});
groupInspector.addEventListener("transitionend", function (event) {
  if (event.target !== groupInspector || event.propertyName !== "opacity" || pendingGroupIndex === null) return;
  activeGroup = pendingGroupIndex;
  pendingGroupIndex = null;
  render();
  groupInspector.classList.remove("is-fading-out");
});
const homeScreen = document.querySelector("#home");
const editorScreen = document.querySelector("#main");
const galleryTypes = Array.from(document.querySelectorAll(".gallery-card[data-design]"), function (card) { return card.dataset.design; });

function updateGalleryThumbnail(type) {
  // Copy the rendered SVG into an isolated image so mask IDs cannot collide
  // with the editor or another thumbnail.
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("viewBox", "0 0 600 600");
  const artwork = art.cloneNode(true);
  stripOrbitalEditorDecoration(artwork);
  artwork.removeAttribute("id");
  Array.from(artwork.children).filter(e=>e.tagName.toLowerCase()==="rect" && e.getAttribute("width")==="600" && e.getAttribute("height")==="600").forEach(e=>e.style.removeProperty("display"));
  artwork.querySelectorAll("[tabindex], [role], [aria-label], .is-selected").forEach(function (element) {
    element.removeAttribute("tabindex");
    element.removeAttribute("role");
    element.removeAttribute("aria-label");
    element.classList.remove("is-selected");
  });
  svg.append(artwork);
  const source = new XMLSerializer().serializeToString(svg);
  document.querySelector("#gallery-" + type).src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
}

function shuffleGallery(announce = true) {
  closePalette(false);
  const initialType = activeDesignType;
  // The editor is hidden during generation. Use the exact existing renderer
  // and persist the complete resulting state, including the seed.
  galleryTypes.forEach(function (type) {
    setDesignType(type, true, true);
    applySurpriseCandidate(harmoniousComposition(type));
    designSnapshots[type] = captureDesignState();
    updateGalleryThumbnail(type);
  });
  setDesignType(initialType, true, true);
  document.title = "Pressbooks Shapes · Create a composition";
  if (announce) document.querySelector("#surprise-status").textContent = "New gallery compositions generated.";
}

function updateScreen(editor) {
  homeScreen.hidden = editor;
  editorScreen.hidden = !editor;
  document.querySelector("#download-svg").hidden = !editor;
  document.querySelector("#export-settings").hidden = !editor;
  presetMenu.open = false;
}

function navigateTo(hash, replace = false) {
  if (window.location.hash === hash) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", hash);
}

function showHome(changeHistory = true) {
  if (!editorScreen.hidden) {
    closePalette(false);
    designSnapshots[activeDesignType] = captureDesignState();
    updateGalleryThumbnail(activeDesignType);
  }
  updateScreen(false);
  document.title = "Pressbooks Shapes · Create a composition";
  if (changeHistory) navigateTo("#home");
  document.querySelector("#gallery-title").focus();
}

function showEditor(type, changeHistory = true) {
  setDesignType(type, true, true);
  updateScreen(true);
  updateDesignChrome();
  render();
  if (changeHistory) navigateTo("#editor/" + type);
  activateEditorTab(editorTabs[0], false);
  designTypeSelect.focus();
}

document.querySelector(".brand").addEventListener("click", function (event) {
  event.preventDefault();
  showHome();
});
document.querySelector("#shuffle-gallery").addEventListener("click", function () { shuffleGallery(); });
document.querySelectorAll(".gallery-card[data-design]").forEach(function (card) {
  card.addEventListener("click", function () { showEditor(card.dataset.design); });
});
designTypeSelect.addEventListener("change", function () {
  setDesignType(designTypeSelect.value, true, true);
  navigateTo("#editor/" + activeDesignType, true);
});
window.addEventListener("popstate", function () {
  const type = window.location.hash.split("/")[1];
  if (window.location.hash.startsWith("#editor/") && galleryTypes.includes(type)) showEditor(type, false);
  else showHome(false);
});
updateDesignChrome();
render();
shuffleGallery(false);
navigateTo("#home", true);
updateScreen(false);
