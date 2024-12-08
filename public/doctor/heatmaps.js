import { formatWaitingTime} from "../utilities/utils.js";

export function loadWaitingTimeHeatmap(data) {

    // Convertir les valeurs de avg_waiting_time en nombre (au cas où elles ne sont pas déjà des nombres)
    data.forEach(d => {
        d.avg_waiting_time = +d.avg_waiting_time;  // Conversion explicite en nombre
    });

    // Plages horaires de la journée
    const hourRanges = [
        '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
        '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00',
        '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00',
        '21:00-22:00', '22:00-23:00', '23:00-00:00', '00:00-01:00',
        '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00',
        '05:00-06:00', '06:00-07:00', '07:00-08:00'
    ];

    // Trier les mois dans l'ordre chronologique
    const months = [...new Set(data.map(d => d.month))].sort((a, b) => new Date(a + '-01') - new Date(b + '-01'));

    // Trier les données par mois et plage horaire
    data.sort((a, b) => {
        const dateA = new Date(a.month + '-01');
        const dateB = new Date(b.month + '-01');
        const hourA = hourRanges.indexOf(a.hour_range);
        const hourB = hourRanges.indexOf(b.hour_range);
        return dateA - dateB || hourA - hourB;
    });

    // Sélectionner le conteneur du heatmap
    d3.select("#waiting-time-heatmap").selectAll("*").remove();

    const margin = { top: 30, right: 50, bottom: 50, left: 90 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#waiting-time-heatmap")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(months)
        .range([0, width])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(hourRanges)
        .range([0, height])
        .padding(0.05);

    // Définir une fonction de couleur personnalisée en fonction du temps d'attente
    const getColor = (waitingTime) => {
        if (waitingTime < 30) return '#90EE90'; // Vert clair pour < 30 minutes
        if (waitingTime < 45) return '#FFA500'; // Orange pour 30-45 minutes
        if (waitingTime < 60) return '#FF4500'; // Rouge pour 45-60 minutes
        return '#000000'; // Noir pour > 60 minutes
    };

    // Définir la couleur du texte en fonction de la couleur d'arrière-plan
    const getTextColor = (waitingTime) => {
        return waitingTime >= 60 ? 'white' : 'black';  // Texte blanc si le fond est noir, sinon noir
    };

    // Créer les cellules du heatmap
    svg.selectAll("rect")
        .data(data, d => d.month + ':' + d.hour_range)
        .enter()
        .append("rect")
        .attr("x", d => x(d.month))
        .attr("y", d => y(d.hour_range))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => getColor(d.avg_waiting_time)); // Utiliser la couleur personnalisée

    // Ajouter le texte des valeurs dans les cellules
    svg.selectAll("text")
        .data(data, d => d.month + ':' + d.hour_range)
        .enter()
        .append("text")
        .attr("x", d => x(d.month) + x.bandwidth() / 2)
        .attr("y", d => y(d.hour_range) + y.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", d => getTextColor(d.avg_waiting_time))  // Ajuster la couleur du texte
        .style("font-size", "12px")
        .text(d => formatWaitingTime(d.avg_waiting_time));  // Utiliser la fonction pour formater le texte

    // Ajouter l'axe X (mois)
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)");

    // Ajouter l'axe Y (plages horaires)
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("fill", "black")
        .style("font-size", "12px");
}
