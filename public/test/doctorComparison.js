d3.json('/api/doctor-comparison/comparison').then(data => {
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#doctor-comparison-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x0 = d3.scaleBand()
        .domain(data.map(d => d.doctor_name))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(['total_consultations', 'new_patients', 'returning_patients'])
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.total_consultations, d.new_patients, d.returning_patients))])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(['total_consultations', 'new_patients', 'returning_patients'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    svg.selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("transform", d => `translate(${x0(d.doctor_name)},0)`)
        .selectAll("rect")
        .data(d => ['total_consultations', 'new_patients', 'returning_patients'].map(key => ({ key, value: d[key] })))
        .enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key))
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`${d.key.replace('_', ' ')}: ${d.value}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition().duration(500).style("opacity", 0);
        });

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Add legends
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150},${-margin.top})`);

    const legendData = [
        { label: "Total Consultations", color: "#1f77b4" },
        { label: "New Patients", color: "#ff7f0e" },
        { label: "Returning Patients", color: "#2ca02c" }
    ];

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 12)
        .text(d => d.label)
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");
});
