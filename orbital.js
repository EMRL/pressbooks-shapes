// Circular outlines retain their proportions in every arrangement.
const ORBITAL_MODES = ["concentric","drift","orbit","spiral","cluster","scatter"];
const orbitalLimits = {count:[2,60],diameter:[40,800],inner:[5,95],weight:[1,40],progression:[-90,90],displacement:[0,300],angle:[0,359],variation:[0,100],groups:[1,6]};
let orbitalState = referenceOrbitalState();
let activeOrbit = 0;
let hoveredOrbit = null;
function referenceOrbitalState(){
  return {arrangement:"drift",count:18,diameter:600,inner:35,weight:9,progression:65,displacement:55,angle:35,variation:12,groups:2,
    colours:["#25282a","#bb2026","#5da3b2","#f4af23","#00a47d","#a7a8a9"],objects:{}};
}
function orbitalClone(){return JSON.parse(JSON.stringify(orbitalState));}
function restoreOrbitalState(state){orbitalState=JSON.parse(JSON.stringify(state));activeOrbit=0;hoveredOrbit=null;}
function orbitalObject(state,i){return state.objects[i] || {};}
function orbitalColour(i){if(String(i).startsWith("group:")) return orbitalState.colours[Number(i.split(":")[1])];return orbitalObject(orbitalState,i).colour || orbitalState.colours[i%orbitalState.groups];}
function orbitalOverride(i){return orbitalState.objects[i] ||= {};}
function orbitalGeometry(s,i,seed){
  const t=i/(s.count-1), a=s.angle*Math.PI/180, u=seededUnit(i+1,seed), v=seededUnit(i+81,seed);
  const jitter=s.variation/100, d=s.displacement;
  let x=0,y=0,r=s.diameter/2*(s.inner/100+(1-s.inner/100)*t);
  if(s.arrangement==="drift"){x=d*(t-.5);y=d*(t-.5)*.3;}
  if(s.arrangement==="orbit"){x=d*Math.cos(t*Math.PI*2);y=d*Math.sin(t*Math.PI*2);r=s.diameter/2*(.35+.65*t);}
  if(s.arrangement==="spiral"){x=d*t*Math.cos(t*Math.PI*4);y=d*t*Math.sin(t*Math.PI*4);}
  if(s.arrangement==="cluster"){const k=i%s.groups,theta=k*2*Math.PI/s.groups;x=d*Math.cos(theta);y=d*Math.sin(theta);r=s.diameter/2*(s.inner/100+(1-s.inner/100)*Math.floor(i/s.groups)/Math.max(1,Math.ceil(s.count/s.groups)-1));}
  if(s.arrangement==="scatter"){x=d*(u-.5)*2;y=d*(v-.5)*2;r=s.diameter/2*(s.inner/100+(1-s.inner/100)*seededUnit(i+151,seed));}
  if(s.arrangement!=="concentric"){x+=(u-.5)*d*jitter*.4;y+=(v-.5)*d*jitter*.4;}
  const o=orbitalObject(s,i);
  return {x:300+x*Math.cos(a)-y*Math.sin(a)+(o.x||0),y:300+x*Math.sin(a)+y*Math.cos(a)+(o.y||0),r:Math.max(1,r*(o.size??100)/100),weight:Math.max(.5,s.weight*(1+s.progression/100*(2*t-1))*(1+(u-.5)*jitter*.5)),colour:o.colour||s.colours[i%s.groups],visible:o.visible!==false};
}
function renderOrbital(settings){
  const s=orbitalState;
  hoveredOrbit=null;
  art.replaceChildren();art.removeAttribute("transform");art.style.isolation="isolate";
  if(settings.background){const bg=document.createElementNS(SVG_NS,"rect");bg.setAttribute("width","600");bg.setAttribute("height","600");bg.setAttribute("fill","#fff");art.append(bg);}
  const g=document.createElementNS(SVG_NS,"g");g.setAttribute("transform","translate(300 300) rotate("+settings.rotation+") scale("+settings.scale+") translate(-300 -300)");
  g.dataset.orbitalGeometry = "";
  const shapes=[];
  for(let i=0;i<s.count;i++){
    const o=orbitalGeometry(s,i,compositionSeed);if(!o.visible)continue;
    const circle=document.createElementNS(SVG_NS,"circle");
    for(const [key,value] of Object.entries({cx:o.x,cy:o.y,r:o.r,fill:"none",stroke:o.colour,"stroke-width":o.weight}))circle.setAttribute(key,value);
    if(settings.overlapMode==="multiply")circle.style.mixBlendMode="multiply";
    circle.setAttribute("role","button");circle.setAttribute("tabindex","0");circle.setAttribute("aria-label","Circle "+(i+1));
    circle.dataset.orbitalIndex=i;
    circle.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectOrbitalCircle(i,true);}});
    shapes.push(circle);g.append(circle);
  }
  if(settings.overlapMode==="transparent"){
    const defs=document.createElementNS(SVG_NS,"defs");
    shapes.forEach((circle,i)=>{
      const mask=document.createElementNS(SVG_NS,"mask");mask.id="orbital-mask-"+i;
      for(const [k,v] of Object.entries({maskUnits:"userSpaceOnUse",x:-4000,y:-4000,width:8000,height:8000}))mask.setAttribute(k,v);
      const white=document.createElementNS(SVG_NS,"rect");for(const [k,v] of Object.entries({x:-4000,y:-4000,width:8000,height:8000,fill:"white"}))white.setAttribute(k,v);mask.append(white);
      shapes.forEach((other,j)=>{if(i===j)return;const cut=other.cloneNode();cut.setAttribute("stroke","black");cut.removeAttribute("mask");cut.removeAttribute("style");cut.removeAttribute("data-orbital-index");cut.removeAttribute("role");cut.removeAttribute("tabindex");cut.removeAttribute("aria-label");mask.append(cut);});
      defs.append(mask);circle.setAttribute("mask","url(#"+mask.id+")");
    });art.append(defs);
  }
  art.append(g);
  stage.classList.toggle("has-background",settings.background);
  document.querySelector("#shape-count").textContent=shapes.length+" circles";
  document.querySelector("#variation-readout").textContent=s.variation+"% variation";
  document.querySelector("#shape-desc").textContent=shapes.length+" circular outlines in a "+s.arrangement+" arrangement.";
  document.querySelector("#orbital-arrangement").value=s.arrangement;
  Object.keys(orbitalLimits).forEach(key=>{document.querySelector("#orbital-"+key).value=s[key];document.querySelector("#orbital-"+key+"-output").value=s[key]+(["diameter","weight","displacement"].includes(key)?" px":["inner","progression","variation"].includes(key)?"%":key==="angle"?"°":"");});
  outputs.scale.value=Math.round(settings.scale*100)+"%";outputs.rotation.value=settings.rotation+"°";
  renderOrbitalEditor();refreshRangeInputs();updateOrbitalHighlight();
}
function renderOrbitalEditor(){
  activeOrbit=Math.min(activeOrbit,orbitalState.count-1);
  const groups=document.querySelector("#orbital-group-list");groups.replaceChildren();
  for(let i=0;i<orbitalState.groups;i++){
    const button=document.createElement("button");button.type="button";button.className="color-trigger";
    button.dataset.orbitalColour="group:"+i;button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","palette-popover");
    const swatch=document.createElement("span");swatch.className="color-swatch";button.append(swatch);
    updateColourTrigger(button,orbitalState.colours[i],"Colour group "+(i+1));button.addEventListener("click",()=>openPalette(button,"orbital","group:"+i));groups.append(button);
  }
  const list=document.querySelector("#orbital-list");list.replaceChildren();
  for(let i=0;i<orbitalState.count;i++){
    const item=createObjectSelector(i,"Circle "+(i+1),()=>{closePalette(false);selectOrbitalCircle(i);},button=>{selectOrbitalCircle(i);openPalette(button,"orbital",i);},visible=>{activeOrbit=i;orbitalOverride(i).visible=visible;render();});
    item.colour.dataset.orbitalColour=i;
    item.card.dataset.orbitalCard=i;
    item.card.addEventListener("pointerenter",()=>{hoveredOrbit=i;updateOrbitalHighlight();});
    item.card.addEventListener("pointerleave",()=>{hoveredOrbit=null;updateOrbitalHighlight();});
    updateObjectSelector(item,"Circle "+(i+1),orbitalColour(i),orbitalObject(orbitalState,i).visible!==false,i===activeOrbit);
    list.append(item.card);
  }
  updateOrbitalSelectionControls();
}
function updateOrbitalSelectionControls(){
  const o=orbitalObject(orbitalState,activeOrbit);
  document.querySelector("#orbital-object-title").textContent="Circle "+(activeOrbit+1)+" of "+orbitalState.count+(o.visible===false?" (hidden)":"");
  for(const key of ["x","y","size"]){const value=o[key]??(key==="size"?100:0);document.querySelector("#orbital-object-"+key).value=value;document.querySelector("#orbital-object-"+key+"-output").value=value+(key==="size"?"%":" px");}
}
// Keep preview highlights separate from the rendered composition and masks.
function updateOrbitalHighlight(){
  const editing=designTypeSelect.value==="orbital" && document.querySelector("#orbital-editor-tab").getAttribute("aria-selected")==="true";
  preview.classList.toggle("orbital-editing",editing);
  const geometry=art.querySelector("[data-orbital-geometry]");
  if(!geometry)return;
  geometry.querySelectorAll("[data-editor-only]").forEach(e=>e.remove());
  const index=hoveredOrbit??activeOrbit;
  const circles=geometry.querySelectorAll("[data-orbital-index]");
  circles.forEach(circle=>circle.classList.toggle("orbital-highlighted",editing&&Number(circle.dataset.orbitalIndex)===index));
  if(!editing)return;
  const selected=geometry.querySelector('[data-orbital-index="'+index+'"]');
  if(!selected)return;
  // The overlay keeps the highlighted circle visible even where a transparent
  // overlap mask or another circle would otherwise conceal its stroke.
  const overlay=selected.cloneNode(false);
  overlay.removeAttribute("data-orbital-index");
  overlay.removeAttribute("mask");
  overlay.removeAttribute("role");
  overlay.removeAttribute("tabindex");
  overlay.removeAttribute("aria-label");
  overlay.removeAttribute("style");
  overlay.setAttribute("class","orbital-focus-outline");
  overlay.setAttribute("data-editor-only","");
  overlay.setAttribute("aria-hidden","true");
  overlay.setAttribute("pointer-events","none");
  geometry.append(overlay);
}
function selectOrbitalCircle(index,openEditor=false){
  activeOrbit=(index+orbitalState.count)%orbitalState.count;
  hoveredOrbit=null;
  if(openEditor)activateEditorTab(document.querySelector("#orbital-editor-tab"),false);
  document.querySelectorAll("[data-orbital-card]").forEach(card=>{
    const active=Number(card.dataset.orbitalCard)===activeOrbit;
    card.classList.toggle("is-active",active);
    card.querySelector(".object-selector-select").setAttribute("aria-pressed",String(active));
    if(active){
      const list=card.parentElement;
      const listRect=list.getBoundingClientRect(), cardRect=card.getBoundingClientRect();
      if(cardRect.top<listRect.top)list.scrollTop+=cardRect.top-listRect.top;
      else if(cardRect.bottom>listRect.bottom)list.scrollTop+=cardRect.bottom-listRect.bottom;
    }
  });
  updateOrbitalSelectionControls();
  refreshRangeInputs();
  updateOrbitalHighlight();
}
function selectOrbitalAtPoint(event){
  if(designTypeSelect.value!=="orbital" || event.detail===0)return;
  const geometry=art.querySelector("[data-orbital-geometry]");
  const matrix=geometry?.getScreenCTM();if(!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const scale=Math.hypot(matrix.a,matrix.b);
  if(!scale)return;
  let best=null,bestDistance=Infinity;
  geometry.querySelectorAll("[data-orbital-index]").forEach(circle=>{
    const distance=Math.abs(Math.hypot(point.x-Number(circle.getAttribute("cx")),point.y-Number(circle.getAttribute("cy")))-Number(circle.getAttribute("r")));
    // Use an eight-screen-pixel tolerance, independent of zoom or stroke width.
    const tolerance=Math.max(8/scale,Number(circle.getAttribute("stroke-width"))/2);
    if(distance<=tolerance && distance<bestDistance){best=Number(circle.dataset.orbitalIndex);bestDistance=distance;}
  });
  if(best!==null){closePalette(false);selectOrbitalCircle(best,true);}
}
function stripOrbitalEditorDecoration(root){
  root.classList.remove("orbital-editing");
  root.querySelectorAll("[data-editor-only]").forEach(e=>e.remove());
  root.querySelectorAll(".orbital-highlighted").forEach(e=>e.classList.remove("orbital-highlighted"));
}
function initOrbital(){
  preview.addEventListener("click",selectOrbitalAtPoint);
  document.querySelector("#orbital-prev").addEventListener("click",()=>{closePalette(false);selectOrbitalCircle(activeOrbit-1);});
  document.querySelector("#orbital-next").addEventListener("click",()=>{closePalette(false);selectOrbitalCircle(activeOrbit+1);});
  Object.keys(orbitalLimits).forEach(key=>document.querySelector("#orbital-"+key).addEventListener("input",e=>{closePalette(false);orbitalState[key]=Number(e.target.value);render();}));
  document.querySelector("#orbital-arrangement").addEventListener("change",e=>{orbitalState.arrangement=e.target.value;render();});
  for(const key of ["x","y","size"])document.querySelector("#orbital-object-"+key).addEventListener("input",e=>{orbitalOverride(activeOrbit)[key]=Number(e.target.value);render();});
  document.querySelector("#reset-orbital").addEventListener("click",()=>{const o=orbitalOverride(activeOrbit);delete o.x;delete o.y;delete o.size;render();});
  document.querySelector("#reference-orbital").addEventListener("click",()=>{closePalette(false);applyOrbitalCandidate(createOrbitalCandidate(true));});
}
function createOrbitalCandidate(reference=false){
  const s=referenceOrbitalState();
  if(!reference){
    s.arrangement=randomChoice(ORBITAL_MODES);s.count=randomInteger(9,35);s.diameter=randomInteger(340,700,20);s.inner=randomInteger(15,65,5);s.weight=randomInteger(2,13);s.progression=randomInteger(-55,80,5);s.displacement=randomInteger(30,190,10);s.angle=randomInteger(0,359);s.variation=randomInteger(0,35,5);s.groups=randomChoice([1,1,2,2,3]);s.colours=shuffled(BRAND_100_COLOURS).slice(0,6);
  }
  return {type:"orbital",orbital:s,seed:reference?4821:randomInteger(1,1000000000),settings:{rotation:reference?0:randomInteger(0,359),scale:100,background:reference||Math.random()<.5,overlapMode:reference?"normal":randomChoice(["normal","normal","multiply"])}};
}
function evaluateOrbitalCandidate(c){
  const s=c.orbital, shapes=Array.from({length:s.count},(_,i)=>orbitalGeometry(s,i,c.seed));
  let hits=0,sx=0,sy=0;const n=40;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(x+.5)*600/n-300,dy=(y+.5)*600/n-300,a=-c.settings.rotation*Math.PI/180,px=300+dx*Math.cos(a)-dy*Math.sin(a),py=300+dx*Math.sin(a)+dy*Math.cos(a);
    if(shapes.some(o=>Math.abs(Math.hypot(px-o.x,py-o.y)-o.r)<=o.weight/2)){hits++;sx+=dx;sy+=dy;}}
  const coverage=hits/(n*n);
  return scoreDesignCandidate({palette:s.groups<=3?1:.7,balance:hits?1-Math.hypot(sx/hits,sy/hits)/180:0,negativeSpace:1-Math.abs(coverage-.28)/.45,restraint:1-s.variation/120,valid:coverage>.055&&coverage<.68});
}
function applyOrbitalCandidate(c){restorePatternFills();restoreOrbitalState(c.orbital);compositionSeed=c.seed;controls.rotation.value=c.settings.rotation;controls.scale.value=c.settings.scale;controls.background.checked=c.settings.background;controls.overlapModes.forEach(i=>i.checked=i.value===c.settings.overlapMode);render();}
function validOrbitalPreset(p){
  const s=p.orbital,t=p.settings;
  return p.version===2&&s&&t&&isIntegerBetween(p.randomSeed,1,1000000000)&&isIntegerBetween(t.rotationDegrees,0,359)&&isIntegerBetween(t.scalePercent,70,150)&&typeof t.background==="boolean"&&["normal","multiply","transparent"].includes(t.overlapMode)&&ORBITAL_MODES.includes(s.arrangement)&&Object.entries(orbitalLimits).every(([k,v])=>isIntegerBetween(s[k],...v))&&Array.isArray(s.colours)&&s.colours.length===6&&s.colours.every(isBrandColour)&&s.objects&&typeof s.objects==="object"&&!Array.isArray(s.objects)&&Object.entries(s.objects).every(([k,o])=>/^(0|[1-5]?[0-9])$/.test(k)&&o&&typeof o==="object"&&(o.colour===undefined||isBrandColour(o.colour))&&(o.visible===undefined||typeof o.visible==="boolean")&&["x","y"].every(k=>o[k]===undefined||isIntegerBetween(o[k],-300,300))&&(o.size===undefined||isIntegerBetween(o.size,25,200)));
}
