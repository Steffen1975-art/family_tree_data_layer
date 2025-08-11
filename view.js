// view.js

// Globale Variablen, die das gesamte Modul kennt
let svg, g, zoom, detailPanel;
let root, selectedNode;
let showDetailPanelTimer, hideDetailPanelTimer;
let allPeopleData = []; // Hier werden die geladenen Daten gespeichert
let allPeopleMap = new Map();

let width = window.innerWidth;
let height = window.innerHeight;

const cardWidth = 180;
const cardHeight = 70;

const treeLayout = d3.tree().nodeSize([cardHeight + 110, cardWidth + 160]);

// Die einzige exportierte Funktion, die als Einstiegspunkt dient
export function initializeView(loadedPeopleData) {
    allPeopleData = loadedPeopleData;
    allPeopleMap.clear();
    allPeopleData.forEach(p => allPeopleMap.set(p.id, p));

    initializeControls();
    renderTree("Koller_AI_Studio.json"); // Starte mit der Koller-Ansicht

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        const currentView = d3.select('.view-btn.active').attr('data-view');
        renderTree(currentView);
    });
}

function initializeVisualization() {
    d3.select("#tree-container").html('');
    svg = d3.select("#tree-container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .on("click", () => {
            selectedNode = null;
            highlightBranch(null);
            d3.select('#selection-info').html('');
        });

    g = svg.append("g");
    detailPanel = d3.select("#detail-panel")
        .on("mouseover", () => clearTimeout(hideDetailPanelTimer))
        .on("mouseout", () => { hideDetailPanelTimer = setTimeout(hideDetailPanel, 300); });

    zoom = d3.zoom().scaleExtent([0.1, 3]).on("zoom", (event) => {
        g.attr("transform", event.transform);
        if (detailPanel.classed('visible')) positionDetailPanel(selectedNode);
    });
    svg.call(zoom);
}

function createNodeHTML(d) {
    const person = d.data;
    const name = person.name || 'Unbekannt';
    const born = person.details?.geboren || '?';
    const died = person.details?.gestorben || 'Heute';
    const bridgeIcon = person.isBridge ? ' <span class="bridge-icon" title="Verbindung zwischen Stämmen">🌉</span>' : '';

    return `<div class="w-full h-full p-3 flex flex-col items-center justify-center rounded-xl shadow-lg border border-slate-200 node-card">
                <p class="font-bold text-slate-800 text-sm leading-tight text-center whitespace-normal break-words" title="${name}">${name}${bridgeIcon}</p>
                <p class="text-xs text-slate-500 mt-1">${born} - ${died}</p>
            </div>`;
}

function elbow(s, d) {
    return `M${s.x},${s.y + cardHeight / 2}V${(s.y + d.y - cardHeight) / 2}H${d.x}V${d.y - cardHeight / 2}`;
}

function update(source) {
    const duration = 500;
    const treeData = treeLayout(root);
    
    const nodes = treeData.descendants();
    const links = treeData.links();

    const node = g.selectAll("g.node").data(nodes, d => d.data.id);

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", `translate(${source.x0 || source.x},${source.y0 || source.y})`)
        .on("click", (event, d) => {
            event.stopPropagation();
            centerOnNode(d);
        })
        .on("mouseover", (event, d) => {
            clearTimeout(hideDetailPanelTimer);
            showDetailPanelTimer = setTimeout(() => showDetailPanel(d), 500);
        })
        .on("mouseout", () => {
            clearTimeout(showDetailPanelTimer);
            hideDetailPanelTimer = setTimeout(hideDetailPanel, 300);
        });

    nodeEnter.append("foreignObject")
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("x", -cardWidth / 2)
        .attr("y", -cardHeight / 2)
        .style("overflow", "visible")
        .html(d => createNodeHTML(d));

    const nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition().duration(duration).attr("transform", d => `translate(${d.x},${d.y})`);

    node.exit().transition().duration(duration)
        .attr("transform", `translate(${source.x},${source.y})`).remove();

    const link = g.selectAll("path.link").data(links, d => d.target.data.id);

    const linkEnter = link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", () => {
            const o = { x: source.x0 || source.x, y: source.y0 || source.y};
            return elbow(o, o);
        });

    linkEnter.merge(link).transition().duration(duration).attr("d", d => elbow(d.source, d.target));

    link.exit().transition().duration(duration)
        .attr("d", () => {
            const o = { x: source.x, y: source.y };
            return elbow(o, o);
        }).remove();
    
    highlightBranch(selectedNode);
    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
}

function centerOnNode(d) {
    const scale = 0.8;
    const transform = d3.zoomIdentity
        .translate(width / 2 - d.x * scale, height / 3 - d.y * scale)
        .scale(scale);
    svg.transition().duration(750).call(zoom.transform, transform);
    selectedNode = d;
    highlightBranch(d);
    d3.select('#selection-info')
      .html(`<span class="font-semibold text-slate-500">Selektion: </span><span class="font-bold text-sky-600">${d.data.name} (Gen. ${d.depth})</span>`);
}

function zoomToFit(duration = 750) {
    const bounds = g.node().getBBox();
    if (bounds.width === 0 || bounds.height === 0) return;
    const fullWidth = width;
    const fullHeight = height;
    const scale = Math.min(fullWidth / bounds.width, fullHeight / bounds.height) * 0.9;
    const translate = [
        fullWidth / 2 - (bounds.x + bounds.width / 2) * scale,
        fullHeight / 2 - (bounds.y + bounds.height / 2) * scale
    ];
    const transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
    svg.transition().duration(duration).call(zoom.transform, transform);
}

function handleSearch(event) {
    const value = event.target.value.toLowerCase();
    const resultsContainer = d3.select('.search-results');
    resultsContainer.html('');
    if (value.length < 2) return;
    const results = allPeopleData.filter(p => p.name.toLowerCase().includes(value));
    results.forEach(res => {
        const stammName = res.origin.split('_')[0].charAt(0).toUpperCase() + res.origin.split('_')[0].slice(1);
        resultsContainer.append('div')
            .attr('class', 'search-result-item')
            .text(`${res.name} (${stammName})`)
            .on('click', () => {
                navigateToPerson(res.id, res.origin);
                resultsContainer.html('');
                event.target.value = '';
            });
    });
}

function findAndShowPerson(personId) {
    let targetNode = null;
    root.each(node => { if (node.data.id === personId) targetNode = node; });
    if (targetNode) centerOnNode(targetNode);
}

function navigateToPerson(personId, targetStamm) {
    hideDetailPanel();
    const currentView = d3.select('.view-btn.active').attr('data-view');
    if (targetStamm && currentView !== targetStamm) {
        renderTree(targetStamm, personId);
    } else {
        findAndShowPerson(personId);
    }
}

function showDetailPanel(d) {
    const person = d.data;
    selectedNode = d; // Wichtig für die Neupositionierung beim Zoomen
    let panelHTML = `<div class="p-6"><h3 class="text-2xl font-bold text-slate-800">${person.name}</h3>`;
    panelHTML += `<div class="mt-6 border-t border-slate-200 pt-6"><dl class="space-y-3 text-sm">`;
    if (person.details?.geboren) panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Geboren</dt><dd>${person.details.geboren}</dd></div>`;
    if (person.details?.gestorben) panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Gestorben</dt><dd>${person.details.gestorben}</dd></div>`;
    if (person.spouses && person.spouses.length > 0) {
        const spouses = person.spouses.map(id => allPeopleMap.get(id)).filter(Boolean);
        panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Partner</dt><dd>${spouses.map(s => `<span class="detail-link" data-id="${s.id}" data-stamm="${s.origin}">${s.name}</span>`).join('<br>')}</dd></div>`;
    }
    if (person.details?.info) panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Info</dt><dd>${person.details.info}</dd></div>`;
    panelHTML += `</dl></div>`;
    panelHTML += `<div class="p-6 bg-slate-50 rounded-b-xl border-t border-slate-200"><a href="#" class="font-medium text-sky-600 hover:underline detail-link" data-action="ahnentafel" data-id="${person.id}">Ahnentafel zeigen</a></div></div>`;
    detailPanel.html(panelHTML).classed('visible', true);
    positionDetailPanel(d);
    detailPanel.selectAll('.detail-link').on('click', function(event) {
        event.preventDefault(); event.stopPropagation();
        const targetId = parseInt(this.dataset.id);
        const action = this.dataset.action;
        const targetStamm = this.dataset.stamm;
        if (action === 'ahnentafel') renderTree('ahnentafel', targetId);
        else navigateToPerson(targetId, targetStamm);
    });
}

function hideDetailPanel() { if (detailPanel) detailPanel.classed('visible', false); }
function positionDetailPanel(d) { /* Identisch zur vorherigen Version */ if(!d) return; const transform=d3.zoomTransform(svg.node()),[tx,ty]=transform.apply([d.x,d.y]),panelWidth=350,panelHeight=detailPanel.node().getBoundingClientRect().height,margin=15;let finalX=tx+cardWidth/2*transform.k+margin,finalY=ty-panelHeight/2;if(finalX+panelWidth+margin>window.innerWidth){finalX=tx-cardWidth/2*transform.k-panelWidth-margin}if(finalY<margin){finalY=margin}if(finalY+panelHeight+margin>window.innerHeight){finalY=window.innerHeight-panelHeight-margin}detailPanel.style('left',`${finalX}px`).style('top',`${finalY}px`)}
function highlightBranch(d) { /* Identisch zur vorherigen Version */ d3.selectAll(".node").classed("highlight descendant-highlight ancestor-highlight",!1),d3.selectAll(".link").classed("descendant-highlight ancestor-highlight",!1);if(!d)return;const e=d.ancestors(),t=new Set(e.map(e=>e.data.id)),s=d.descendants(),n=new Set(s.map(e=>e.data.id));d3.selectAll(".node").each(function(e){const s=d3.select(this);s.classed("highlight",e.data.id===d.data.id),s.classed("descendant-highlight",n.has(e.data.id)&&e.data.id!==d.data.id),s.classed("ancestor-highlight",t.has(e.data.id)&&e.data.id!==d.data.id)}),d3.selectAll(".link").each(function(e){const s=n.has(e.source.data.id)&&n.has(e.target.data.id),a=t.has(e.source.data.id)&&t.has(e.target.data.id);d3.select(this).classed("descendant-highlight",s),d3.select(this).classed("ancestor-highlight",a)})}

function initializeControls() {
    d3.selectAll('.view-btn').on('click', function() { renderTree(this.dataset.view); });
    d3.select('#search-input').on('input', handleSearch);
    const fabToggle = document.getElementById('fab-toggle'), fabOptions = document.getElementById('cockpit-options'), fabIconOpen = document.getElementById('fab-icon-open'), fabIconClose = document.getElementById('fab-icon-close');
    fabToggle.addEventListener('click', () => { fabOptions.classList.toggle('opacity-0'), fabOptions.classList.toggle('translate-y-4'), fabOptions.classList.toggle('pointer-events-none'), fabIconOpen.classList.toggle('hidden'), fabIconClose.classList.toggle('hidden'); });
}

function getRootIdForStamm(stammOrigin) {
    const peopleFromStamm = allPeopleData.filter(p => p.origin === stammOrigin);
    // Finde die Person, die von niemandem aus diesem Stamm als Kind geführt wird.
    const childrenIdsInStamm = new Set();
    peopleFromStamm.forEach(p => {
        if (p.parents) {
            p.parents.forEach(parentId => {
                // Nur parentIds aus demselben Stamm berücksichtigen
                if (peopleFromStamm.some(parent => parent.id === parentId)) {
                    childrenIdsInStamm.add(p.id);
                }
            });
        }
    });
    const rootPerson = peopleFromStamm.find(p => !childrenIdsInStamm.has(p.id));
    return rootPerson ? rootPerson.id : (peopleFromStamm.length > 0 ? peopleFromStamm[0].id : null);
}

function buildTreeFromFlatData(startId) {
    if (!startId) return null;
    const treeData = [];
    const visited = new Set();
    function recurse(personId) {
        if (!personId || visited.has(personId)) return;
        visited.add(personId);
        const person = allPeopleMap.get(personId);
        if (person) {
            treeData.push(person);
            allPeopleData.forEach(p => {
                if(p.parents && p.parents.includes(personId)) {
                    recurse(p.id);
                }
            })
        }
    }
    recurse(startId);
    return treeData;
}

function renderTree(viewKey, targetIdToSelect = null) {
    let dataForTree, title;
    const titles = {
        "Koller_AI_Studio.json": "Stammbaum Familie Koller",
        "Holl_AI_Studio.json": "Stammbaum Familie Holl",
        "moergenthaler_AI_Studio.json": "Stammbaum Familie Mörgenthaler",
        "maier_wolfgang_AI_Studio.json": "Stammbaum Maier (Wolfgang)",
        "ahnentafel": "Ahnentafel"
    };

    initializeVisualization();
    hideDetailPanel();

    if (viewKey === 'ahnentafel') {
        const startPersonId = targetIdToSelect || (selectedNode ? selectedNode.data.id : 54087);
        dataForTree = buildTreeFromFlatData(startPersonId).map(p => ({...p, parents: p.family ? [p.family.fatherId, p.family.motherId].filter(Boolean) : [] }));
        title = `${titles[viewKey]} für ${allPeopleMap.get(startPersonId)?.name}`;
    } else {
        const rootId = getRootIdForStamm(viewKey);
        dataForTree = buildTreeFromFlatData(rootId);
        title = titles[viewKey];
    }
    
    d3.select('#main-title').text(title);
    selectedNode = null;
    d3.select('#selection-info').html('');
    
    if (!dataForTree || dataForTree.length === 0) {
        g.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("Daten für diese Ansicht nicht verfügbar.");
        return;
    }
    
    root = d3.stratify().id(d => d.id).parentId(d => (d.parents && d.parents.length > 0) ? d.parents[0] : null)(dataForTree);
    
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
