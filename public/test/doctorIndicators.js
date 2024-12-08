// Fetch and populate the doctor selection dropdown
d3.json('/api/doctors').then(doctors => {
    const select = d3.select('#doctor-select');
    select.selectAll('option')
        .data(doctors)
        .enter()
        .append('option')
        .attr('value', d => d.id)
        .text(d => `${d.firstName} ${d.lastName}`);

    // Load indicators for the initially selected doctor
    const initialDoctorId = select.node().value;
    updateDoctorIndicators(initialDoctorId);

    // Update indicators when a new doctor is selected
    select.on('change', function() {
        const doctorId = this.value;
        updateDoctorIndicators(doctorId);
    });
});

// Function to update the doctor's indicators
function updateDoctorIndicators(doctorId) {
    // Clear existing charts
    d3.select("#consultations-chart").selectAll("*").remove();

    // Fetch and display consultations per month for the selected doctor
    d3.json(`/api/doctor-indicators/${doctorId}/consultations`).then(data => {
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };
        const width = 1000 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select("#consultations-chart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.consultation_count)])
            .nice()
            .range([height, 0]);

        const y2 = d3.scaleLinear()
            .domain([0, d3.max(data, d => Math.max(d.cumulative_new_patients, d.returning_patients))])
            .nice()
            .range([height, 0]);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip");

        // Bar chart for consultations
        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.month))
            .attr("y", d => y(d.consultation_count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.consultation_count))
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`Consultations: ${d.consultation_count}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        // Line chart for cumulative new patients
        const lineNewPatients = d3.line()
            .x(d => x(d.month) + x.bandwidth() / 2)
            .y(d => y2(d.cumulative_new_patients));

        svg.append("path")
            .datum(data)
            .attr("class", "line-new-patients")
            .attr("d", lineNewPatients);

        // Line chart for returning patients
        const lineReturningPatients = d3.line()
            .x(d => x(d.month) + x.bandwidth() / 2)
            .y(d => y2(d.returning_patients));

        svg.append("path")
            .datum(data)
            .attr("class", "line-returning-patients")
            .attr("d", lineReturningPatients);

        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${width}, 0)`)
            .call(d3.axisRight(y2));

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Consultations");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", width + margin.right - 20)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Patients");

        // Add legends
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 150},${-margin.top})`);

        const legendData = [
            { label: "Consultations", color: "steelblue" },
            { label: "Cumulative New Patients", color: "blue" },
            { label: "Returning Patients", color: "green" }
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
}
