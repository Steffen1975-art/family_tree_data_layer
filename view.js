// view.js

// FINALE, FUNKTIONIERENDE VERSION - Löst das "multiple roots" Problem
export function createFamilyTree(data) {
    // 1. Die "Fake Root" Lösung: Erstelle eine künstliche Hauptwurzel
    const virtualRootId = 'VIRTUAL_ROOT';
    data.push({ id: virtualRootId, name: 'Familien' }); // Diese Wurzel wird nicht gezeichnet

    const width = 1600;
    const height = 1000;

    const root = d3.stratify()
        .id(d => d.id)
        // 2. Angepasste Logik: Wer keine Eltern hat, wird an die virtuelle Wurzel gehängt
        .parentId(d => {
            if (d.id === virtualRootId) return null; // Die virtuelle Wurzel hat keine Eltern
            if (d.parents && d.parents.length > 0) return d.parents[0]; // Nimm den ersten Elternteil
            return virtualRootId; // Hänge Personen ohne Eltern an die virtuelle Wurzel
        })
        (data);

    // Verstecke die künstliche Wurzel und ihre direkte Verbindung
    const descendants = root.descendants().filter(d => d.id !== virtualRootId);
    const links = root.links().filter(l => l.source.id !== virtualRootId);

    const tree = d3.tree().size([height, width - 400]);
    tree(root);

    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g")
        .attr("transform", "translate(200,0)");

    const link = g.selectAll(".link")
        .data(links) // Benutze die gefilterten Links
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            return "M" + d.target.y + "," + d.target.x
                + "C" + (d.target.y + d.source.y) / 2 + "," + d.target.x
                + " " + (d.target.y + d.source.y) / 2 + "," + d.source.x
                + " " + d.source.y + "," + d.source.x;
        });

    const node = g.selectAll(".node")
        .data(descendants) // Benutze die gefilterten Knoten
        .enter().append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

    node.append("circle").attr("r", 4);

    node.append("text")
        .attr("dy", 3)
        .attr("x", d => d.children ? -12 : 12)
        .style("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.name)
        .append("tspan")
        .attr("class", "bridge-icon")
        .style("font-size", "1.1em")
        .text(d => d.data.isBridge ? ' 🌉' : '');
}
