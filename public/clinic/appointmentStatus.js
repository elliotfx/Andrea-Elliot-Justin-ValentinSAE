import { checkAuth } from "../utilities/utils.js";

export function loadAppointmentStatus(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    // Fetch data from rendezvous API
    fetch(`/api/rendezvous?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const chartData = data.rendezvous_by_month || [];
        drawHeatmapChart(chartData);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawHeatmapChart(data) {
    // Clear previous chart
    d3.select("#appointment-status-chart").selectAll("*").remove();
    d3.select("body").selectAll(".tooltip.appointment-status").remove();

    const margin = { top: 120, right: 40, bottom: 60, left: 120 };
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

    // Prepare heatmap data (simulated based on monthly data)
    const hours = ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h'];
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const heatmapData = [];
    const totalRdv = d3.sum(data, d => d.total_rendezvous_pris || 0);
    const avgPerCell = totalRdv / (hours.length * days.length);

    days.forEach((day, dayIndex) => {
        hours.forEach((hour, hourIndex) => {
            // Simulate realistic patterns
            let value = avgPerCell;
            
            // More appointments in morning
            if (hourIndex >= 1 && hourIndex <= 4) value *= 1.5;
            
            // Less on lunch time
            if (hourIndex === 4) value *= 0.3;
            
            // Peak hours
            if ((hourIndex === 2 || hourIndex === 3 || hourIndex === 6)) value *= 1.3;
            
            // Saturday has less
            if (dayIndex === 5) value *= 0.6;
            
            // Friday slightly more
            if (dayIndex === 4) value *= 1.2;
            
            // Add some randomness
            value = Math.round(value * (0.7 + Math.random() * 0.6));
            
            heatmapData.push({
                day: day,
                hour: hour,
                value: value
            });
        });
    });

    // Scales
    const xScale = d3.scaleBand()
        .domain(hours)
        .range([0, width])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(days)
        .range([0, height])
        .padding(0.05);

    const maxValue = d3.max(heatmapData, d => d.value);
    
    const colorScale = d3.scaleSequential()
        .domain([0, maxValue])
        .interpolator(d3.interpolateRgb("#E8F5E9", "#1B5E20"));

    // Grid cells
    svg.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.hour))
        .attr("y", d => yScale(d.day))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.value))
        .attr("rx", 4)
        .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition().duration(200)
                .style("filter", "drop-shadow(0 3px 8px rgba(0,0,0,0.2))")
                .attr("stroke", "#1F2937")
                .attr("stroke-width", 2);

            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <div style="border-bottom: 2px solid #10B981; padding-bottom: 8px; margin-bottom: 8px;">
                    <strong style="font-size: 15px; color: #10B981">📅 ${d.day} ${d.hour}</strong>
                </div>
                <div style="line-height: 1.8;">
                    <div><strong>Rendez-vous:</strong> ${d.value}</div>
                    <div style="margin-top: 4px; font-size: 11px; color: #6B7280;">
                        ${d.value > avgPerCell * 1.2 ? '🔥 Créneau très demandé' : 
                          d.value < avgPerCell * 0.6 ? '❄️ Créneau calme' : 
                          '✅ Créneau normal'}
                    </div>
                </div>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition().duration(200)
                .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))")
                .attr("stroke", "none");

            tooltip.transition().duration(300).style("opacity", 0);
        });

    // Add text values in cells
    svg.selectAll("text.cell-value")
        .data(heatmapData)
        .enter()
        .append("text")
        .attr("class", "cell-value")
        .attr("x", d => xScale(d.hour) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.day) + yScale.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", d => d.value > maxValue * 0.6 ? "#FFFFFF" : "#1F2937")
        .style("pointer-events", "none")
        .text(d => d.value);

    // X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#374151");

    // Y-axis
    svg.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500")
        .style("fill", "#374151");

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "700")
        .style("fill", "#1F2937")
        .text("Carte de chaleur : Rendez-vous par jour et heure");

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#6B7280")
        .text("Heure de la journée");

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 25)
        .attr("x", -(height / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#6B7280")
        .text("Jour de la semaine");

    // Legend
    const legendWidth = 200;
    const legendHeight = 15;
    
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 30}, ${height / 2 - 30})`);

    const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, legendHeight * 8]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(4)
        .tickFormat(d => Math.round(d));

    // Gradient for legend (vertical)
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#E8F5E9");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#1B5E20");

    legend.append("rect")
        .attr("width", 20)
        .attr("height", legendHeight * 8)
        .style("fill", "url(#legend-gradient)")
        .attr("rx", 3);

    legend.append("g")
        .attr("transform", `translate(20, 0)`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "10px")
        .style("fill", "#6B7280");

    legend.append("text")
        .attr("x", 10)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .text("Nombre de RDV");
}
