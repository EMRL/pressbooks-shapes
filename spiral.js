// A sequence of similar shapes, each scaled and rotated relative to the last.
const SPIRAL_SHAPES = ["triangle","square","pentagon","hexagon","circle"];
const spiralLimits = {count:[3,30],diameter:[100,800],ratio:[55,98],turn:[-90,90],drift:[0,300],direction:[0,359],weight:[1,35],groups:[1,6]};
let spiralState = referenceSpiralState();
let activeSpiral = 0;
let hoveredSpiral = null;
function referenceSpiralState(){
  return {shape:"square",count:12,diameter:700,ratio:84,turn:17,drift:0,direction:0,weight:5,groups:3,appearance:"solid",sequence:"cycle",
    colours:["#bb2026","#f4af23","#f1d2d4","#5da3b2","#00a47d","#25282a"],objects:{}};
}
function spiralClone(){return JSON.parse(JSON.stringify(spiralState));}
function restoreSpiralState(state){spiralState=JSON.parse(JSON.stringify(state));activeSpiral=0;hoveredSpiral=null;}
function spiralObject(s,i){return s.objects[i]||{};}
function spiralOverride(i){return spiralState.objects[i] ||= {};}
function spiralGroup(s,i){return s.sequence==="blocks"?Math.min(s.groups-1,Math.floor(i*s.groups/s.count)):i%s.groups;}
function spiralColour(key){
  if(String(key).startsWith("group:"))return spiralState.colours[Number(key.split(":")[1])];
  return spiralObject(spiralState,key).colour||spiralState.colours[spiralGroup(spiralState,Number(key))];
}
function spiralGeometry(s,i){
  const o=spiralObject(s,i), a=s.direction*Math.PI/180;
  const t=i/Math.max(1,s.count-1), step=s.drift*t;
  const x=300+step*Math.cos(a)+(o.x||0),y=300+step*Math.sin(a)+(o.y||0);
  const r=s.diameter/2*Math.pow(s.ratio/100,i)*(o.size??100)/100;
  const angle=i*s.turn+(o.rotation||0);
  const sides={triangle:3,square:4,pentagon:5,hexagon:6,circle:0}[s.shape];
  const points=Array.from({length:sides},(_,j)=>{
    const theta=(angle-90+ (s.shape==="square"?45:0))*Math.PI/180+j*2*Math.PI/sides;
    return [x+r*Math.cos(theta),y+r*Math.sin(theta)];
  });
  return {x,y,r,angle,sides,points,visible:o.visible!==false,colour:o.colour||s.colours[spiralGroup(s,i)]};
}
function spiralSvgShape(o){
  const shape=document.createElementNS(SVG_NS,o.sides?"polygon":"circle");
  if(o.sides)shape.setAttribute("points",o.points.map(p=>p.join(",")).join(" "));
  else {shape.setAttribute("cx",o.x);shape.setAttribute("cy",o.y);shape.setAttribute("r",o.r);}
  return shape;
}
function renderSpiral(settings){
  const s=spiralState;
  art.replaceChildren();art.removeAttribute("transform");art.style.isolation="isolate";hoveredSpiral=null;
  if(settings.background)art.append(svgElement("rect",{width:600,height:600,fill:"#fff"}));
  const geometry=svgElement("g",{transform:"translate(300 300) rotate("+settings.rotation+") scale("+settings.scale+") translate(-300 -300)","data-spiral-geometry":""});
  const shapes=[];
  for(let i=0;i<s.count;i++){
    const o=spiralGeometry(s,i);if(!o.visible)continue;
    const shape=spiralSvgShape(o);
    shape.setAttribute("fill",s.appearance==="solid"?svgPatternFill("spiral:"+i,o.colour,{x:o.x,y:o.y,rotation:o.angle}):"none");
    if(s.appearance==="outline"){shape.setAttribute("stroke",o.colour);shape.setAttribute("stroke-width",s.weight);shape.setAttribute("stroke-linejoin","round");}
    if(settings.overlapMode==="multiply")shape.style.mixBlendMode="multiply";
    shape.dataset.spiralIndex=i;shape.setAttribute("role","button");shape.setAttribute("tabindex","0");shape.setAttribute("aria-label","Shape "+(i+1));
    const select=()=>{closePalette(false);selectSpiralShape(i,true);};
    shape.addEventListener("click",select);shape.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}});
    shapes.push({shape,o});geometry.append(shape);
  }
  if(settings.overlapMode==="transparent"){
    const defs=svgElement("defs",{});
    shapes.forEach(({shape},i)=>{
      const mask=svgElement("mask",{id:"spiral-mask-"+i,maskUnits:"userSpaceOnUse",x:-4000,y:-4000,width:8000,height:8000});
      mask.append(svgElement("rect",{x:-4000,y:-4000,width:8000,height:8000,fill:"white"}));
      shapes.forEach(({o},j)=>{
        if(i===j)return;
        const cut=spiralSvgShape(o);
        cut.setAttribute("fill",s.appearance==="solid"?"black":"none");
        if(s.appearance==="outline"){cut.setAttribute("stroke","black");cut.setAttribute("stroke-width",s.weight);cut.setAttribute("stroke-linejoin","round");}
        mask.append(cut);
      });
      defs.append(mask);shape.setAttribute("mask","url(#spiral-mask-"+i+")");
    });
    art.append(defs);
  }
  art.append(geometry);
  stage.classList.toggle("has-background",settings.background);
  document.querySelector("#shape-count").textContent=shapes.length+" shapes";
  document.querySelector("#variation-readout").textContent=s.ratio+"% scale progression";
  document.querySelector("#shape-desc").textContent=shapes.length+" progressively scaled and rotated "+s.shape+" shapes.";
  for(const key of ["shape","appearance","sequence"])document.querySelector("#spiral-"+key).value=s[key];
  Object.keys(spiralLimits).forEach(key=>{
    document.querySelector("#spiral-"+key).value=s[key];
    document.querySelector("#spiral-"+key+"-output").value=s[key]+(["diameter","drift","weight"].includes(key)?" px":key==="ratio"?"%":["turn","direction"].includes(key)?"°":"");
  });
  document.querySelector("#spiral-weight-row").hidden=s.appearance!=="outline";
  outputs.scale.value=Math.round(settings.scale*100)+"%";outputs.rotation.value=settings.rotation+"°";
  renderSpiralEditor();refreshRangeInputs();updateSpiralHighlight();
}
function renderSpiralEditor(){
  activeSpiral=Math.min(activeSpiral,spiralState.count-1);
  const groups=document.querySelector("#spiral-group-list");groups.replaceChildren();
  for(let i=0;i<spiralState.groups;i++){
    const button=document.createElement("button");button.type="button";button.className="color-trigger";
    button.dataset.spiralColour="group:"+i;button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","palette-popover");
    const swatch=document.createElement("span");swatch.className="color-swatch";button.append(swatch);
    updateColourTrigger(button,spiralState.colours[i],"Colour group "+(i+1));
    if(spiralState.appearance==="solid")paintFillSwatch(button,"spiral:group:"+i);
    button.addEventListener("click",()=>openPalette(button,"spiral","group:"+i));groups.append(button);
  }
  const list=document.querySelector("#spiral-list");list.replaceChildren();
  for(let i=0;i<spiralState.count;i++){
    const item=createObjectSelector(i,"Shape "+(i+1),()=>{closePalette(false);selectSpiralShape(i);},button=>{selectSpiralShape(i);openPalette(button,"spiral",i);},visible=>{activeSpiral=i;spiralOverride(i).visible=visible;render();});
    item.colour.dataset.spiralColour=i;item.card.dataset.spiralCard=i;
    item.card.addEventListener("pointerenter",()=>{hoveredSpiral=i;updateSpiralHighlight();});
    item.card.addEventListener("pointerleave",()=>{hoveredSpiral=null;updateSpiralHighlight();});
    updateObjectSelector(item,"Shape "+(i+1),spiralColour(i),spiralObject(spiralState,i).visible!==false,i===activeSpiral);
    if(spiralState.appearance==="solid")paintFillSwatch(item.colour,"spiral:"+i);
    list.append(item.card);
  }
  updateSpiralSelectionControls();
}
function updateSpiralSelectionControls(){
  const o=spiralObject(spiralState,activeSpiral);
  document.querySelector("#spiral-object-title").textContent="Shape "+(activeSpiral+1)+" of "+spiralState.count+(o.visible===false?" (hidden)":"");
  for(const key of ["x","y","size","rotation"]){
    const v=o[key]??(key==="size"?100:0);
    document.querySelector("#spiral-object-"+key).value=v;
    document.querySelector("#spiral-object-"+key+"-output").value=v+(key==="size"?"%":key==="rotation"?"°":" px");
  }
}
function selectSpiralShape(index,openEditor=false){
  activeSpiral=(index+spiralState.count)%spiralState.count;hoveredSpiral=null;
  if(openEditor)activateEditorTab(document.querySelector("#spiral-editor-tab"),false);
  document.querySelectorAll("[data-spiral-card]").forEach(card=>{
    const active=Number(card.dataset.spiralCard)===activeSpiral;
    card.classList.toggle("is-active",active);card.querySelector(".object-selector-select").setAttribute("aria-pressed",String(active));
    if(active){const list=card.parentElement,r=list.getBoundingClientRect(),c=card.getBoundingClientRect();if(c.top<r.top)list.scrollTop+=c.top-r.top;else if(c.bottom>r.bottom)list.scrollTop+=c.bottom-r.bottom;}
  });
  updateSpiralSelectionControls();refreshRangeInputs();updateSpiralHighlight();
}
function updateSpiralHighlight(){
  const editing=designTypeSelect.value==="spiral"&&document.querySelector("#spiral-editor-tab").getAttribute("aria-selected")==="true";
  preview.classList.toggle("spiral-editing",editing);
  const g=art.querySelector("[data-spiral-geometry]");if(!g)return;
  g.querySelectorAll("[data-editor-only]").forEach(e=>e.remove());
  const index=hoveredSpiral??activeSpiral;
  g.querySelectorAll("[data-spiral-index]").forEach(e=>e.classList.toggle("spiral-highlighted",editing&&Number(e.dataset.spiralIndex)===index));
  if(!editing||spiralObject(spiralState,index).visible===false)return;
  const outline=spiralSvgShape(spiralGeometry(spiralState,index));
  for(const [k,v] of Object.entries({fill:"none",stroke:spiralColour(index),"stroke-width":2,"stroke-dasharray":"5 3","vector-effect":"non-scaling-stroke","pointer-events":"none","data-editor-only":"","aria-hidden":"true"}))outline.setAttribute(k,v);
  g.append(outline);
}
function stripSpiralEditorDecoration(root){
  root.classList.remove("spiral-editing");
  root.querySelectorAll(".spiral-highlighted").forEach(e=>e.classList.remove("spiral-highlighted"));
  root.querySelectorAll("[data-editor-only]").forEach(e=>e.remove());
}
function initSpiral(){
  Object.keys(spiralLimits).forEach(key=>document.querySelector("#spiral-"+key).addEventListener("input",e=>{closePalette(false);spiralState[key]=Number(e.target.value);render();}));
  for(const key of ["shape","appearance","sequence"])document.querySelector("#spiral-"+key).addEventListener("change",e=>{closePalette(false);spiralState[key]=e.target.value;render();});
  for(const key of ["x","y","size","rotation"])document.querySelector("#spiral-object-"+key).addEventListener("input",e=>{spiralOverride(activeSpiral)[key]=Number(e.target.value);render();});
  document.querySelector("#spiral-prev").addEventListener("click",()=>{closePalette(false);selectSpiralShape(activeSpiral-1);});
  document.querySelector("#spiral-next").addEventListener("click",()=>{closePalette(false);selectSpiralShape(activeSpiral+1);});
  document.querySelector("#reset-spiral").addEventListener("click",()=>{const o=spiralOverride(activeSpiral);for(const k of ["x","y","size","rotation"])delete o[k];render();});
  document.querySelector("#reference-spiral").addEventListener("click",()=>{closePalette(false);applySpiralCandidate(createSpiralCandidate(true));});
}
function createSpiralCandidate(reference=false){
  const s=referenceSpiralState();
  if(!reference){
    s.shape=randomChoice(["triangle","square","square","pentagon","hexagon","circle"]);
    s.count=randomInteger(7,16);s.diameter=randomInteger(480,750,10);
    // Keep the final form substantial even when there are many iterations.
    s.ratio=Math.min(98,Math.max(55,Math.round(100*Math.pow(randomChoice([.17,.22,.28,.35,.4]),1/(s.count-1)))));
    s.turn=s.shape==="circle"?0:randomChoice([-25,-18,-12,-8,8,12,18,25]);s.drift=randomChoice([0,0,0,30,65,110]);s.direction=randomInteger(0,359);
    s.appearance=randomChoice(["solid","solid","solid","outline"]);s.weight=randomInteger(2,8);
    s.groups=randomChoice([2,2,3,3,4]);s.sequence=randomChoice(["cycle","cycle","blocks"]);
    const family=randomChoice(BRAND_PALETTE.slice(0,4));
    const accent=randomChoice(BRAND_PALETTE.filter(f=>f!==family));
    const colours=[family.values[4][1],family.values[1][1],accent.values[4][1],family.values[5][1],accent.values[2][1],family.values[0][1]];
    s.colours=colours;
  }
  return {type:"spiral",spiral:s,seed:reference?4821:randomInteger(1,1000000000),settings:{rotation:reference?0:randomChoice([0,0,15,30,45,90]),scale:100,background:reference||Math.random()<.5,overlapMode:"normal"}};
}
function evaluateSpiralCandidate(c){
  const s=c.spiral,outer=spiralGeometry(s,0),inner=spiralGeometry(s,s.count-1);
  const painted=(s.shape==="circle"?Math.PI:outer.sides*Math.sin(2*Math.PI/outer.sides)/2)*outer.r*outer.r/360000;
  const coverage=s.appearance==="outline"?Math.min(1,2*Math.PI*s.weight*outer.r*(1-Math.pow(s.ratio/100,s.count))/(1-s.ratio/100)/360000):painted;
  return scoreDesignCandidate({palette:1,balance:1-s.drift/400,negativeSpace:1-Math.abs(coverage-.42)/.65,restraint:1-Math.abs(s.turn)/120,valid:inner.r>=12&&coverage>=.045&&coverage<=1.1});
}
function applySpiralCandidate(c){
  restorePatternFills(c.patterns);restoreSpiralState(c.spiral);compositionSeed=c.seed;
  controls.rotation.value=c.settings.rotation;controls.scale.value=c.settings.scale;controls.background.checked=c.settings.background;
  controls.overlapModes.forEach(i=>i.checked=i.value===c.settings.overlapMode);render();
}
function validSpiralPreset(p){
  const s=p.spiral,t=p.settings;
  return p.version===2&&s&&t&&isIntegerBetween(p.randomSeed,1,1000000000)&&isIntegerBetween(t.rotationDegrees,0,359)&&isIntegerBetween(t.scalePercent,70,150)&&typeof t.background==="boolean"&&["normal","multiply","transparent"].includes(t.overlapMode)&&SPIRAL_SHAPES.includes(s.shape)&&["solid","outline"].includes(s.appearance)&&["cycle","blocks"].includes(s.sequence)&&Object.entries(spiralLimits).every(([k,v])=>isIntegerBetween(s[k],...v))&&Array.isArray(s.colours)&&s.colours.length===6&&s.colours.every(isBrandColour)&&s.objects&&typeof s.objects==="object"&&!Array.isArray(s.objects)&&Object.entries(s.objects).every(([k,o])=>/^(0|[12]?[0-9])$/.test(k)&&o&&typeof o==="object"&&(o.colour===undefined||isBrandColour(o.colour))&&(o.visible===undefined||typeof o.visible==="boolean")&&["x","y"].every(k=>o[k]===undefined||isIntegerBetween(o[k],-200,200))&&(o.size===undefined||isIntegerBetween(o.size,25,200))&&(o.rotation===undefined||isIntegerBetween(o.rotation,-180,180)));
}
