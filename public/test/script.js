const width = 800;
const height = 600;

const svg = d3.select("svg")
              .attr("width", width)
              .attr("height", height);

const simulation = d3.forceSimulation()
                     .force("link", d3.forceLink().id(d => d.id).distance(100))
                     .force("charge", d3.forceManyBody().strength(-300))
                     .force("center", d3.forceCenter(width / 2, height / 2));

d3.json('/data').then(data => {
    const nodes = [];
    const links = [];

    // Préparation des noeuds et des liens
    data.forEach(row => {
        if (!nodes.find(n => n.id === row.patient_id)) {
            nodes.push({
                id: row.patient_id,
                name: row.patient_name,
                type: "patient",
                amountSpent: +row.total_spent
            });
        }
        if (!nodes.find(n => n.id === row.doctor_id)) {
            nodes.push({
                id: row.doctor_id,
                name: row.doctor_name,
                type: "doctor"
            });
        }
        links.push({
            source: row.patient_id,
            target: row.doctor_id,
            visits: +row.visits
        });
    });

    const link = svg.append("g")
                    .attr("class", "links")
                    .selectAll("line")
                    .data(links)
                    .enter().append("line")
                    .attr("stroke-width", d => Math.sqrt(d.visits));

    const node = svg.append("g")
                    .attr("class", "nodes")
                    .selectAll("circle")
                    .data(nodes)
                    .enter().append("circle")
                    .attr("r", d => d.type === "patient" ? d.amountSpent / 50 : 10)
                    .attr("fill", d => d.type === "patient" ? "orange" : "lightblue")
                    .call(d3.drag()
                            .on("start", dragstarted)
                            .on("drag", dragged)
                            .on("end", dragended));

    // Tooltip pour afficher les noms
    node.append("title")
        .text(d => `${d.name} (${d.type === 'patient' ? 'Patient' : 'Doctor'})`);

    simulation
      .nodes(nodes)
      .on("tick", ticked);

    simulation.force("link")
      .links(links);

    function ticked() {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
});
