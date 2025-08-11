// view.js

// Globale Variablen für das View-Modul
let svg, g, zoom, detailPanel;
let root, selectedNode, initialTransform;
let showDetailPanelTimer, hideDetailPanelTimer;
let allPeopleData = []; // Wird die komplett geladene Datenliste halten
let allPeopleMap = new Map();

let width = window.innerWidth;
let height = window.innerHeight;

const cardWidth = 180;
const cardHeight = 70;

const treeLayout = d3.tree().nodeSize([cardHeight + 110, cardWidth + 160]);

// Hauptfunktion, die vom main.js aufgerufen wird
export function initializeView(peopleData) {
    allPeopleData = peopleData;
    allPeopleMap.clear();
    allPeopleData.forEach(p => {
        // Sicherstellen, dass die Details-Struktur existiert, wie im Originalcode
        p.details = { geboren: p.details?.birthDate, gestorben: p.details?.deathDate, info: p.details?.notes };
        allPeopleMap.set(p.id, p);
    });

    initializeControls();
    renderTree('Koller_AI_Studio.json'); // Starte mit der Koller-Ansicht

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

    zoom = d3.zoom().scaleExtent([0.1, 3]).on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
}

function generateAhnentafel(startId) {
    const startPerson = allPeopleMap.get(startId);
    if (!startPerson) return null;

    const ahnenData = [];
    const visited = new Set();
    
    function buildAncestors(personId) {
        if (!personId || visited.has(personId)) return;
        visited.add(personId);
        const person = allPeopleMap.get(personId);
        if (person) {
            ahnenData.push(person);
            if (person.parents) {
                person.parents.forEach(pId => buildAncestors(pId));
            }
        }
    }
    buildAncestors(startId);
    return ahnenData;
}

function createNodeHTML(d) {
    const person = d.data;
    const name = person.name || 'Unbekannt';
    const born = person.details?.geboren || '?';
    const died = person.details?.gestorben || 'Heute';
    const bridgeIcon = person.isBridge ? ' <span class="bridge-icon">🌉</span>' : '';

    return `<div class="w-full h-full p-3 flex flex-col items-center justify-center rounded-xl shadow-lg border border-slate-200 node-card">
                <p class="font-bold text-slate-800 text-sm leading-tight text-center whitespace-normal break-words" title="${name}">${name}${bridgeIcon}</p>
                <p class="text-xs text-slate-500 mt-1">${born} - ${died}</p>
            </div>`;
}

function update(source) {
    const duration = 500;
    const treeData = treeLayout(root);
    
    const nodes = treeData.descendants();
    const links = treeData.links();

    const node = g.selectAll("g.node").data(nodes, d => d.data.id);

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.x0 || source.x},${source.y0 || source.y})`)
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

    const nodeExit = node.exit().transition().duration(duration)
        .attr("transform", d => `translate(${source.x},${source.y})`).remove();

    const link = g.selectAll("path.link").data(links, d => d.target.data.id);

    const linkEnter = link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", d => {
            const o = { x: source.x0 || source.x, y: source.y0 || source.y};
            return `M${o.x},${o.y}C${o.x},${(o.y + o.y) / 2} ${o.x},${(o.y + o.y) / 2} ${o.x},${o.y}`;
        });

    linkEnter.merge(link).transition().duration(duration).attr("d", d => `M${d.source.x},${d.source.y}C${d.source.x},${(d.source.y + d.target.y) / 2} ${d.target.x},${(d.source.y + d.target.y) / 2} ${d.target.x},${d.target.y}`);

    link.exit().transition().duration(duration)
        .attr("d", d => {
            const o = { x: source.x, y: source.y };
            return `M${o.x},${o.y}C${o.x},${(o.y + o.y) / 2} ${o.x},${(o.y + o.y) / 2} ${o.x},${o.y}`;
        }).remove();
    
    highlightBranch(selectedNode);
    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
}

function highlightBranch(d) {
    d3.selectAll('.node').classed('highlight descendant-highlight ancestor-highlight', false);
    d3.selectAll('.link').classed('descendant-highlight ancestor-highlight', false);
    if (!d) return;
    const ancestors = d.ancestors();
    const ancestorIds = new Set(ancestors.map(n => n.data.id));
    const descendantNodes = d.descendants();
    const descendantIds = new Set(descendantNodes.map(n => n.data.id));
    d3.selectAll('.node').each(function(node_d) {
        const gNode = d3.select(this);
        gNode.classed('highlight', node_d.data.id === d.data.id);
        gNode.classed('descendant-highlight', descendantIds.has(node_d.data.id) && node_d.data.id !== d.data.id);
        gNode.classed('ancestor-highlight', ancestorIds.has(node_d.data.id) && node_d.data.id !== d.data.id);
    });
    d3.selectAll('.link').each(function(link_d) {
        const isDescendantLink = descendantIds.has(link_d.source.data.id) && descendantIds.has(link_d.target.data.id);
        const isAncestorLink = ancestorIds.has(link_d.source.data.id) && ancestorIds.has(link_d.target.data.id);
        d3.select(this).classed('descendant-highlight', isDescendantLink).classed('ancestor-highlight', isAncestorLink);
    });
}

function zoomToFit(duration = 750) {
    const visibleNodes = root.descendants();
    if (visibleNodes.length === 0) return;
    const bounds = g.node().getBBox();
    const parent = g.node().parentElement;
    const fullWidth = parent.clientWidth;
    const fullHeight = parent.clientHeight;
    const scale = Math.min(fullWidth / bounds.width, fullHeight / bounds.height) * 0.9;
    const translate = [
        fullWidth / 2 - (bounds.x + bounds.width / 2) * scale,
        fullHeight / 2 - (bounds.y + bounds.height / 2) * scale,
    ];
    const transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
    svg.transition().duration(duration).call(zoom.transform, transform);
}

function centerOnNode(d) {
    const scale = 1;
    const translateX = width / 2 - d.x * scale;
    const translateY = height / 4 - d.y * scale;
    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    svg.transition().duration(750).call(zoom.transform, transform);
    selectedNode = d;
    highlightBranch(d);
    showDetailPanel(d);
    d3.select('#selection-info')
      .html(`<span class="font-semibold text-slate-500">Selektion: </span><span class="font-bold text-sky-600">${d.data.name} (Gen. ${d.depth})</span>`);
}

function handleSearch(event) {
    const value = event.target.value.toLowerCase();
    const resultsContainer = d3.select('.search-results');
    resultsContainer.html('');
    if (value.length < 2) return;
    const results = allPeopleData.filter(p => p.name.toLowerCase().includes(value));
    results.forEach(res => {
        resultsContainer.append('div')
            .attr('class', 'search-result-item')
            .text(`${res.name} (${res.origin.split('_')[0]})`)
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
    if (targetNode) { centerOnNode(targetNode); }
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

function positionDetailPanel(d) {
    if (!d) return;
    const transform = d3.zoomTransform(svg.node());
    const [tx, ty] = transform.apply([d.x, d.y]);
    const panelWidth = 350;
    const panelHeight = detailPanel.node().getBoundingClientRect().height;
    const margin = 15;
    let finalX = tx + (cardWidth / 2) * transform.k + margin;
    let finalY = ty - panelHeight / 2;
    if (finalX + panelWidth + margin > window.innerWidth) { finalX = tx - ((cardWidth / 2) * transform.k) - panelWidth - margin; }
    if (finalY < margin) { finalY = margin; }
    detailPanel.style('left', `${finalX}px`).style('top', `${finalY}px`);
}

function showDetailPanel(d) {
    const person = d.data;
    let panelHTML = `<div class="p-6"><h3 class="text-2xl font-bold text-slate-800">${person.name}</h3>`;
    panelHTML += `<div class="mt-6 border-t border-slate-200 pt-6"><dl class="space-y-3 text-sm">`;
    if (person.details.geboren) panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Geboren</dt><dd>${person.details.geboren}</dd></div>`;
    if (person.details.gestorben) panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Gestorben</dt><dd>${person.details.gestorben}</dd></div>`;
    if (person.spouses && person.spouses.length > 0) {
        const spouses = person.spouses.map(id => allPeopleMap.get(id)).filter(Boolean);
        panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Partner</dt><dd>${spouses.map(s => `<span class="detail-link" data-id="${s.id}" data-stamm="${s.origin}">${s.name}</span>`).join('<br>')}</dd></div>`;
    }
    if (person.details.info) panelHTML += `<div class="flex"><dt class="w-24 font-medium text-slate-500">Info</dt><dd>${person.details.info}</dd></div>`;
    panelHTML += `</dl></div>`;
    panelHTML += `<div class="p-6 bg-slate-50 rounded-b-xl border-t border-slate-200"><a href="#" class="font-medium text-sky-600 hover:underline detail-link" data-action="ahnentafel" data-id="${person.id}">Ahnentafel zeigen</a></div></div>`;
    detailPanel.html(panelHTML).classed('visible', true);
    positionDetailPanel(d);
    detailPanel.selectAll('.detail-link').on('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        const targetId = parseInt(this.dataset.id);
        const action = this.dataset.action;
        const targetStamm = this.dataset.stamm;
        if (action === 'ahnentafel') { renderTree('ahnentafel', targetId); }
        else { navigateToPerson(targetId, targetStamm); }
    });
}

function hideDetailPanel() {
    if (detailPanel) detailPanel.classed('visible', false);
}

function initializeControls() {
    d3.selectAll('.view-btn').on('click', function() { renderTree(this.dataset.view); });
    d3.select('#search-input').on('input', handleSearch);
    const fabToggle = document.getElementById('fab-toggle');
    const fabOptions = document.getElementById('cockpit-options');
    const fabIconOpen = document.getElementById('fab-icon-open');
    const fabIconClose = document.getElementById('fab-icon-close');
    fabToggle.addEventListener('click', () => {
        fabOptions.classList.toggle('opacity-0');
        fabOptions.classList.toggle('translate-y-4');
        fabOptions.classList.toggle('pointer-events-none');
        fabIconOpen.classList.toggle('hidden');
        fabIconClose.classList.toggle('hidden');
    });
}

function renderTree(viewKey, targetIdToSelect = null) {
    let dataForTree, title;
    initializeVisualization();
    hideDetailPanel();
    
    const rootIds = {
        "Koller_AI_Studio.json": 54087, // ID von Steffen Koller als Beispiel
        "Holl_AI_Studio.json": 16997,  // ID von Georg Holl als Beispiel
        "moergenthaler_AI_Studio.json": 23641, // ID von Reinhold Mörgenthaler
        "maier_wolfgang_AI_Studio.json": 23648, // ID von Ernst Maier
    };
    const titles = {
        "Koller_AI_Studio.json": "Stammbaum Familie Koller",
        "Holl_AI_Studio.json": "Stammbaum Familie Holl",
        "moergenthaler_AI_Studio.json": "Stammbaum Familie Mörgenthaler",
        "maier_wolfgang_AI_Studio.json": "Stammbaum Maier (Wolfgang)",
        "ahnentafel": "Ahnentafel"
    };

    if (viewKey === 'ahnentafel') {
        const startPersonId = targetIdToSelect || (selectedNode ? selectedNode.data.id : 54087);
        dataForTree = generateAhnentafel(startPersonId);
        title = `${titles[viewKey]} für ${allPeopleMap.get(startPersonId)?.name}`;
    } else {
        const rootId = rootIds[viewKey];
        const originPeople = allPeopleData.filter(p => p.origin === viewKey);
        // Da die Hierarchie über Elter-Verknüpfungen läuft, brauchen wir alle verbundenen Personen
        const allRelevantPeopleIds = new Set(originPeople.map(p => p.id));
        let newIdsAdded = true;
        while(newIdsAdded) {
            newIdsAdded = false;
            allPeopleData.forEach(p => {
                if (!allRelevantPeopleIds.has(p.id)) {
                    if (p.parents.some(parentId => allRelevantPeopleIds.has(parentId)) ||
                        p.spouses.some(spouseId => allRelevantPeopleIds.has(spouseId))) {
                        allRelevantPeopleIds.add(p.id);
                        newIdsAdded = true;
                    }
                }
            });
        }
        dataForTree = allPeopleData.filter(p => allRelevantPeopleIds.has(p.id));
        title = titles[viewKey];
    }
    
    d3.select('#main-title').text(title);
    selectedNode = null;
    d3.select('#selection-info').html('');
    
    if (!dataForTree || dataForTree.length === 0) {
        g.append("text").attr("x", width/2).attr("y", height/2).attr("text-anchor", "middle").text("Daten für diese Ansicht nicht verfügbar.");
        return;
    }

    // Virtuelle Wurzel für D3 Stratify, falls es mehrere gibt
    const virtualRootId = 'VIRTUAL_ROOT_ID';
    dataForTree.push({ id: virtualRootId, name: 'root', parents: [] });
    root = d3.stratify()
        .id(d => d.id)
        .parentId(d => {
            if (d.id === virtualRootId) return null;
            if (d.parents && d.parents.length > 0 && dataForTree.some(p => p.id === d.parents[0])) return d.parents[0];
            return virtualRootId;
        })
        (dataForTree);

    // Virtuelle Wurzel entfernen, damit sie nicht gezeichnet wird
    root = root.children[0];
    root.parent = null;

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
