import { checkAuth } from "../utilities/utils.js";

export function loadAppointmentStatus(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    // Fetch data from API
    fetch(`/api/rendezvous?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Process data for area chart
        const chartData = data.rendezvous_by_month || [];
        drawAreaChart(chartData);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawAreaChart(data) {
    // Clear previous chart
    d3.select("#appointment-status-chart").selectAll("*").remove();
    d3.select("body").selectAll(".tooltip.appointment-status").remove();

    const margin = { top: 40, right: 50, bottom: 60, left: 70 };
    const width = 1050 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select("#appointment-status-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip appointment-status")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(255, 255, 255, 0.95)")
        .style("color", "#1F2937")
        .style("padding", "12px 16px")
        .style("border-radius", "8px")
        .style("font-size", "13px")
        .style("box-shadow", "0 6px 20px rgba(0,0,0,0.15)")
        .style("border", "1px solid #E5E7EB")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Prepare data
    const stackData = data.map(d => ({
        mois: d.mois_prise,
        'Confirmés': d.rendezvous_meme_mois || 0,
        'Futurs': d.rendezvous_mois_suivants || 0,
        total: (d.rendezvous_meme_mois || 0) + (d.rendezvous_mois_suivants || 0)
    }));

    // Scales
    const x = d3.scalePoint()
        .domain(stackData.map(d => d.mois))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stackData, d => d.total) * 1.1])
        .nice()
        .range([height, 0]);

    // Stack data
    const stack = d3.stack()
        .keys(['Confirmés', 'Futurs']);

    const stackedData = stack(stackData);

    // Define area generator
    const area = d3.area()
        .x(d => x(d.data.mois))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveMonotoneX);

    // Define line generator
    const line = d3.line()
        .x(d => x(d.data.mois))
        .y(d => y(d[1]))
        .curve(d3.curveMonotoneX);

    // Colors with gradient
    const colors = {
        'Confirmés': '#06B6D4',
        'Futurs': '#8B5CF6'
    };

    // Define gradients
    const defs = svg.append("defs");

    const gradient1 = defs.append("linearGradient")
        .attr("id", "gradient-confirmes")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");

    gradient1.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#06B6D4")
        .attr("stop-opacity", 0.6);

    gradient1.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#06B6D4")
        .attr("stop-opacity", 0.1);

    const gradient2 = defs.append("linearGradient")
        .attr("id", "gradient-futurs")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");

    gradient2.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#8B5CF6")
        .attr("stop-opacity", 0.6);

    gradient2.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#8B5CF6")
        .attr("stop-opacity", 0.1);

    // Grid lines
    svg.append("g")
        .attr("class", "grid")
        .style("stroke", "#E5E7EB")
        .style("stroke-opacity", 0.3)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    // Areas
    svg.selectAll(".area")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", (d, i) => i === 0 ? "url(#gradient-confirmes)" : "url(#gradient-futurs)")
        .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.08))")
        .attr("opacity", 0.85);

    // Lines
    svg.selectAll(".line-path")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "line-path")
        .attr("d", line)
        .attr("stroke", (d, i) => i === 0 ? '#06B6D4' : '#8B5CF6')
        .attr("stroke-width", 3)
        .attr("fill", "none")
        .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.12))");

    // Points for interactivity
    svg.selectAll(".points")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "points")
        .selectAll("circle")
        .data(d => d.map((point, i) => ({
            ...point,
            key: d.key,
            index: i,
            mois: d.data ? Object.keys(d.data).find(k => !['total'].includes(k)) : null
        })))
        .enter()
        .append("circle")
        .attr("cx", d => x(d.data.mois))
        .attr("cy", d => y(d[1]))
        .attr("r", 5)
        .attr("fill", d => colors[d.key])
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.12))")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition().duration(200)
                .attr("r", 8);

            const value = d[1] - d[0];
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <div style="border-bottom: 2px solid ${colors[d.key]}; padding-bottom: 8px; margin-bottom: 8px;">
                    <strong style="font-size: 15px; color: ${colors[d.key]}">📅 ${d.data.mois}</strong>
                </div>
                <div style="line-height: 1.8;">
                    <div><span style="color: ${colors[d.key]}">●</span> <strong>${d.key}:</strong> ${value}</div>
                </div>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition().duration(200)
                .attr("r", 5);

            tooltip.transition().duration(300).style("opacity", 0);
        });

    // Axes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "11px")
        .style("fill", "#6B7280");

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(8))
        .selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#6B7280");

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -(height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .text("Nombre de rendez-vous");

    // Legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 220}, -30)`);

    const legendData = [
        { label: "Confirmés", color: "#06B6D4" },
        { label: "Futurs", color: "#8B5CF6" }
    ];

    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 110}, 0)`);

    legendItems.append("rect")
        .attr("width", 16)
        .attr("height", 16)
        .attr("rx", 3)
        .attr("fill", d => d.color)
        .attr("opacity", 0.7)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    legendItems.append("text")
        .attr("x", 22)
        .attr("y", 13)
        .text(d => d.label)
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#374151")
        .attr("alignment-baseline", "middle");
}
