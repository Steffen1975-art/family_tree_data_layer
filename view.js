// view.js

// FINALE, KORRIGIERTE VERSION - Löst das "multiple roots" Problem endgültig
let svg, g, zoom, detailPanel;
let root, selectedNode;
let showDetailPanelTimer, hideDetailPanelTimer;
let allPeopleData = [];
let allPeopleMap = new Map();

let width = window.innerWidth;
let height = window.innerHeight;

const cardWidth = 180;
const cardHeight = 70;

const treeLayout = d3.tree().nodeSize([cardHeight + 120, cardWidth + 160]);

export function initializeView(loadedPeopleData) {
    allPeopleData = loadedPeopleData;
    allPeopleMap.clear();
    allPeopleData.forEach(p => {
        p.details = { geboren: p.details?.birthDate, gestorben: p.details?.deathDate, info: p.details?.notes };
        allPeopleMap.set(p.id, p);
    });

    initializeControls();
    renderTree("Koller_AI_Studio.json");

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        const currentView = d3.select('.view-btn.active')?.attr('data-view') || "Koller_AI_Studio.json";
        renderTree(currentView);
    });
}

function renderTree(viewKey, targetIdToSelect = null) {
    const titles = {
        "Koller_AI_Studio.json": "Stammbaum Familie Koller",
        "Holl_AI_Studio.json": "Stammbaum Familie Holl",
        "moergenthaler_AI_Studio.json": "Stammbaum Familie Mörgenthaler",
        "maier_wolfgang_AI_Studio.json": "Stammbaum Maier (Wolfgang)",
        "ahnentafel": "Ahnentafel"
    };

    initializeVisualization();
    hideDetailPanel();

    let dataForStratify = [...allPeopleData];
    let startNodeId;

    // *** HIER IST DIE ENTSCHEIDENDE KORREKTUR ***
    // 1. Erstelle eine virtuelle Wurzel
    const virtualRootId = 'VIRTUAL_ROOT_ID';
    dataForStratify.push({ id: virtualRootId, name: 'root', parents: [] });

    // 2. d3.stratify bekommt IMMER ALLE Daten und die Logik für die virtuelle Wurzel
    const fullHierarchy = d3.stratify()
        .id(d => d.id)
        .parentId(d => {
            if (d.id === virtualRootId) return null; // Die virtuelle Wurzel hat keinen Parent
            if (d.parents && d.parents.length > 0) return d.parents[0]; // Normaler Fall
            return virtualRootId; // Jede Person ohne Eltern wird an die virtuelle Wurzel gehängt
        })
        (dataForStratify);
    
    // Ab hier arbeiten wir mit der korrekt erstellten Gesamthierarchie
    if (viewKey === 'ahnentafel') {
        startNodeId = targetIdToSelect || 54087;
        const person = allPeopleMap.get(startNodeId);
        d3.select('#main-title').text(`${titles.ahnentafel} für ${person ? person.name : ''}`);
        
        const startNodeInFullHierarchy = fullHierarchy.find(d => d.id === startNodeId);
        const ancestorIds = new Set(startNodeInFullHierarchy.ancestors().map(d => d.id));
        const ahnentafelData = allPeopleData.filter(p => ancestorIds.has(p.id));
        
        // Für die Ahnentafel bauen wir den Baum nur mit den relevanten Personen neu auf
        root = d3.stratify().id(d => d.id).parentId(d => (d.parents && d.parents.length > 0) ? d.parents[0] : null)(ahnentafelData);

    } else {
        startNodeId = getRootIdForStamm(viewKey);
        d3.select('#main-title').text(titles[viewKey]);
        
        if (!startNodeId) {
            g.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("Startpunkt für diesen Stamm nicht gefunden.");
            return;
        }
        
        // Finde den spezifischen Startknoten, den wir anzeigen wollen
        root = fullHierarchy.find(d => d.id === startNodeId);
        if (root) {
            root.parent = null; // Wichtig: Wir "kappen" die Verbindung nach oben
        }
    }
    
    if (!root) {
        g.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text(`Ansicht konnte nicht erstellt werden.`);
        return;
    }
    
    selectedNode = null;
    d3.select('#selection-info').html('');
    
    d3.selectAll('.view-btn').classed('active', false);
    d3.select(`.view-btn[data-view="${viewKey}"]`).classed('active', true);
    if(viewKey === 'ahnentafel') d3.select('.view-btn-ahnen').classed('active', true);
    
    root.x0 = width / 2;
    root.y0 = 0;
    
    update(root);
    zoomToFit();

    if (targetIdToSelect) {
        setTimeout(() => findAndShowPerson(targetIdToSelect), 750);
    }
}

// Alle anderen Funktionen (initializeControls, update, showDetailPanel etc.)
// bleiben exakt so, wie in meinem letzten Vorschlag.
// Hier sind sie der Vollständigkeit halber noch einmal (minifiziert zur Platzersparnis):
function initializeControls(){d3.selectAll(".view-btn").on("click",function(){renderTree(this.dataset.view)}),d3.select("#search-input").on("input",handleSearch);const e=document.getElementById("fab-toggle"),t=document.getElementById("cockpit-options"),n=document.getElementById("fab-icon-open"),o=document.getElementById("fab-icon-close");e.addEventListener("click",()=>{t.classList.toggle("opacity-0"),t.classList.toggle("translate-y-4"),t.classList.toggle("pointer-events-none"),n.classList.toggle("hidden"),o.classList.toggle("hidden")})}
function initializeVisualization(){d3.select("#tree-container").html(""),svg=d3.select("#tree-container").append("svg").attr("width",width).attr("height",height).on("click",()=>{selectedNode=null,highlightBranch(null),d3.select("#selection-info").html("")}),g=svg.append("g"),detailPanel=d3.select("#detail-panel").on("mouseover",()=>clearTimeout(hideDetailPanelTimer)).on("mouseout",()=>{hideDetailPanelTimer=setTimeout(hideDetailPanel,300)}),zoom=d3.zoom().scaleExtent([.1,3]).on("zoom",e=>{g.attr("transform",e.transform),detailPanel.classed("visible")&&positionDetailPanel(selectedNode)}),svg.call(zoom)}
function createNodeHTML(e){const t=e.data,n=t.name||"Unbekannt",o=t.details?.geboren||"?",a=t.details?.gestorben||"Heute",i=t.isBridge?' <span class="bridge-icon" title="Verbindung zwischen Stämmen">🌉</span>':"";return`<div class="w-full h-full p-3 flex flex-col items-center justify-center rounded-xl shadow-lg border border-slate-200 node-card">\n                <p class="font-bold text-slate-800 text-sm leading-tight text-center whitespace-normal break-words" title="${n}">${n}${i}</p>\n                <p class="text-xs text-slate-500 mt-1">${o} - ${a}</p>\n            </div>`}
function update(e){const t=500,n=treeLayout(root),o=n.descendants(),a=n.links(),i=g.selectAll("g.node").data(o,e=>e.data.id),d=i.enter().append("g").attr("class","node").attr("transform",`translate(${e.x0||e.x},${e.y0||e.y})`).on("click",(t,n)=>{t.stopPropagation(),centerOnNode(n)}).on("mouseover",(e,t)=>{clearTimeout(hideDetailPanelTimer),showDetailPanelTimer=setTimeout(()=>showDetailPanel(t),500)}).on("mouseout",()=>{clearTimeout(showDetailPanelTimer),hideDetailPanelTimer=setTimeout(hideDetailPanel,300)});d.append("foreignObject").attr("width",cardWidth).attr("height",cardHeight).attr("x",-cardWidth/2).attr("y",-cardHeight/2).style("overflow","visible").html(e=>createNodeHTML(e));const l=d.merge(i);l.transition().duration(t).attr("transform",e=>`translate(${e.x},${e.y})`),i.exit().transition().duration(t).attr("transform",`translate(${e.x},${e.y})`).remove();const c=g.selectAll("path.link").data(a,e=>e.target.data.id),s=c.enter().insert("path","g").attr("class","link").attr("d",()=>{const t={x:e.x0||e.x,y:e.y0||e.y};return`M${t.x},${t.y}C${t.x},${(t.y+t.y)/2} ${t.x},${(t.y+t.y)/2} ${t.x},${t.y}`});s.merge(c).transition().duration(t).attr("d",e=>`M${e.source.x},${e.source.y}C${e.source.x},${(e.source.y+e.target.y)/2} ${e.target.x},${(e.source.y+e.target.y)/2} ${e.target.x},${e.target.y}`),c.exit().transition().duration(t).attr("d",()=>{const t={x:e.x,y:e.y};return`M${t.x},${t.y}C${t.x},${(t.y+t.y)/2} ${t.x},${(t.y+t.y)/2} ${t.x},${t.y}`}).remove(),highlightBranch(selectedNode),o.forEach(t=>{t.x0=t.x,t.y0=t.y})}
function centerOnNode(e){const t=.8,n=d3.zoomIdentity.translate(width/2-e.x*t,height/3-e.y*t).scale(t);svg.transition().duration(750).call(zoom.transform,n),selectedNode=e,highlightBranch(e),d3.select("#selection-info").html(`<span class="font-semibold text-slate-500">Selektion: </span><span class="font-bold text-sky-600">${e.data.name} (Gen. ${e.depth})</span>`)}
function zoomToFit(e=750){const t=g.node().getBBox();if(0===t.width||0===t.height)return;const n=g.node().parentElement,o=n.clientWidth,a=n.clientHeight,i=Math.min(o/t.width,a/t.height)*.9,d=[o/2-(t.x+t.width/2)*i,a/2-(t.y+t.height/2)*i],l=d3.zoomIdentity.translate(d[0],d[1]).scale(i);svg.transition().duration(e).call(zoom.transform,l)}
function handleSearch(e){const t=e.target.value.toLowerCase(),n=d3.select(".search-results");n.html("");if(t.length<2)return;const o=allPeopleData.filter(e=>e.name.toLowerCase().includes(t));o.forEach(t=>{const o=t.origin.split("_")[0].charAt(0).toUpperCase()+t.origin.split("_")[0].slice(1);n.append("div").attr("class","search-result-item").text(`${t.name} (${o})`).on("click",()=>{navigateToPerson(t.id,t.origin),n.html(""),e.target.value=""})})}
function findAndShowPerson(e){let t=null;root.each(n=>{n.data.id===e&&(t=n)}),t&&centerOnNode(t)}
function navigateToPerson(e,t){hideDetailPanel();const n=d3.select(".view-btn.active").attr("data-view");t&&n!==t?renderTree(t,e):findAndShowPerson(e)}
function showDetailPanel(e){const t=e.data;selectedNode=e;let n=`<div class="p-6"><h3 class="text-2xl font-bold text-slate-800">${t.name}</h3>`;n+=`<div class="mt-6 border-t border-slate-200 pt-6"><dl class="space-y-3 text-sm">`,t.details?.geboren&&(n+=`<div class="flex"><dt class="w-24 font-medium text-slate-500">Geboren</dt><dd>${t.details.geboren}</dd></div>`),t.details?.gestorben&&(n+=`<div class="flex"><dt class="w-24 font-medium text-slate-500">Gestorben</dt><dd>${t.details.gestorben}</dd></div>`),t.spouses&&t.spouses.length>0&&(spouses=t.spouses.map(e=>allPeopleMap.get(e)).filter(Boolean),n+=`<div class="flex"><dt class="w-24 font-medium text-slate-500">Partner</dt><dd>${spouses.map(e=>`<span class="detail-link" data-id="${e.id}" data-stamm="${e.origin}">${e.name}</span>`).join("<br>")}</dd></div>`),t.details?.info&&(n+=`<div class="flex"><dt class="w-24 font-medium text-slate-500">Info</dt><dd>${t.details.info}</dd></div>`),n+="</dl></div>",n+=`<div class="p-6 bg-slate-50 rounded-b-xl border-t border-slate-200"><a href="#" class="font-medium text-sky-600 hover:underline detail-link" data-action="ahnentafel" data-id="${t.id}">Ahnentafel zeigen</a></div></div>`,detailPanel.html(n).classed("visible",!0),positionDetailPanel(e),detailPanel.selectAll(".detail-link").on("click",function(e){e.preventDefault(),e.stopPropagation();const t=parseInt(this.dataset.id),n=this.dataset.action,o=this.dataset.stamm;"ahnentafel"===n?renderTree("ahnentafel",t):navigateToPerson(t,o)})}
function hideDetailPanel(){detailPanel&&detailPanel.classed("visible",!1)}
function positionDetailPanel(e){if(!e)return;const t=d3.zoomTransform(svg.node()),[n,o]=t.apply([e.x,e.y]),a=350,i=detailPanel.node().getBoundingClientRect().height,d=15;let l=n+cardWidth/2*t.k+d,c=o-i/2;l+a+d>window.innerWidth&&(l=n-cardWidth/2*t.k-a-d),c<d&&(c=d),c+i+d>window.innerHeight&&(c=window.innerHeight-i-d),detailPanel.style("left",`${l}px`).style("top",`${c}px`)}
function highlightBranch(e){d3.selectAll(".node").classed("highlight descendant-highlight ancestor-highlight",!1),d3.selectAll(".link").classed("descendant-highlight ancestor-highlight",!1);if(!e)return;const t=e.ancestors(),n=new Set(t.map(e=>e.data.id)),o=e.descendants(),a=new Set(o.map(e=>e.data.id));d3.selectAll(".node").each(function(t){const o=d3.select(this);o.classed("highlight",t.data.id===e.data.id),o.classed("descendant-highlight",a.has(t.data.id)&&t.data.id!==e.data.id),o.classed("ancestor-highlight",n.has(t.data.id)&&t.data.id!==e.data.id)}),d3.selectAll(".link").each(function(t){const o=a.has(t.source.data.id)&&a.has(t.target.data.id),i=n.has(t.source.data.id)&&n.has(t.target.data.id);d3.select(this).classed("descendant-highlight",o),d3.select(this).classed("ancestor-highlight",i)})}
function getRootIdForStamm(e){const t=allPeopleData.filter(t=>t.origin===e),n=new Set;return t.forEach(e=>{e.parents&&e.parents.forEach(o=>{t.some(e=>e.id===o)&&n.add(e.id)})}),(o=t.find(e=>!n.has(e.id)))?o.id:t.length>0?t[0].id:null;var o}
