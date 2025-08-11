// view.js

export function createFamilyTree(data) {
    const width = 1600;
    const height = 1000;
    const root = d3.stratify()
        .id(d => d.id)
        .parentId(d => d.parents ? d.parents[0] : null)
        (data);
    const tree = d3.tree().size([height, width - 400]);
    tree(root);
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
    const g = svg.append("g")
        .attr("transform", "translate(200,0)");
    const link = g.selectAll(".link")
        .data(root.descendants().slice(1))
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            return "M" + d.y + "," + d.x
                + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                + " " + d.parent.y + "," + d.parent.x;
        });
    const node = g.selectAll(".node")
        .data(root.descendants())
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
