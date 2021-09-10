//Fetch the data
Promise.all([
    fetch('https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json'),
    fetch('https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json')
]).then(function (responses) {
    //Executes at the end of each fetch
    return Promise.all(responses.map(function (response) {
        return response.json();
    }));
}).then(function (data) {
    //Executes when both fetches are finished
    buildGraph(data[0], data[1])
}).catch(function (error) {
    if (error) throw error;
});


//Builds the visualization
const buildGraph = (edData, geoData) => {

    //Create the svg width w and height h
    const w = 1000;
    const h = 600;
    const svg = d3.select("#plot")
        .append("svg")
        .attr("height", h)
        .attr("width", w)

    //Create an svg for the legend width wLeg and height hLeg with padding (used later)
    const wLeg = 200;
    const hLeg = 40;
    const wLegPadding = 10;
    const hLegPadding = 20;
    const svgLegend = d3.select("#legend")
        .append("svg")
        .attr("height", hLeg)
        .attr("width", wLeg)

    //Mapping the education data using the fips
    const edMap = Object.values(edData).reduce((obj, d) => {
        obj[d.fips] = d;
        return obj;
    }, {})

    //Max value for the color range
    const colorMax = d3.max(Object.values(edData), d => d.bachelorsOrHigher)
    //Min value for the color range
    const colorMin = d3.min(Object.values(edData), d => d.bachelorsOrHigher)
    //Range of the color
    const colorRange = colorMax - colorMin
    //Color legend values
    const legValues = [colorMin, colorMin + colorRange / 3, colorMin + colorRange * 2 / 3, colorMax]

    //Linear color scale
    const colorScale = d3.scaleLinear()
        .domain([colorMin, colorMax])
        .range(["black", "#00ff00"])

    //Legends x-axis scale
    const legScale = d3.scaleBand()
        .domain(legValues)
        .range([wLegPadding, wLeg - wLegPadding])

    //Make the x-axis for the legend from the legend scale
    const legendAxis = d3.axisBottom(legScale)
        .tickFormat(d => Math.round(d * 100) / 100 + "%");

    //Insert the x-axis into the svg using the padding
    svgLegend.append("g")
        //Transform and use padding
        .attr("transform", "translate(0," + (hLeg - hLegPadding) + ")")
        .call(legendAxis);

    //Insert the data into the legend svg
    svgLegend.selectAll("rect")
        .data(legValues)
        .enter()
        .append("rect")
        .attr("x", (d) => legScale(d))
        .attr("y", (d) => 0)
        .attr("width", legScale.bandwidth())
        .attr("height", hLeg - hLegPadding)
        //Use the value scale to color the rect
        .attr("fill", (d) => colorScale(d))

    //Tooltip div
    let div = d3.select("#plot").append("div")
        .attr("id", "tooltip")
        //Hide this div on initialization
        .style("opacity", 0);

    //d3 helper that turns projections into svg path d elements
    const path = d3.geoPath()

    //Insert the data into the plot svg
    svg.append("g")
        .selectAll("path")
        .data(topojson.feature(geoData, geoData.objects.counties).features)
        .join("path")
        //Dynamic fill
        .attr("fill", (d) => colorScale(edMap[d.id].bachelorsOrHigher))
        .attr("d", path)
        .attr("class", "county")
        //Set the properties required by the spec and used in the tooltip
        .attr("data-fips", (d) => d.id)
        .attr("data-education", (d) => edMap[d.id].bachelorsOrHigher)
        .attr("data-state", (d) => edMap[d.id].state)
        .attr("data-county", (d) => edMap[d.id].area_name)
        .on("mouseover", (d) => {
            //Change the opacity to render the tooltip div
            div.transition()
                .duration(300)
                .style("opacity", 1);
            //Set the html text of the tooltip
            div.html(
                //Access information in the targets dataset
                `${d.target.dataset.county}, ${d.target.dataset.state}: 
            ${d.target.dataset.education}%`)
                //Add properties (by spec)
                .attr("data-education", d.target.dataset.education)
                //Transform the div to pointer location
                .style("left", (d.pageX + 10) + "px")
                .style("top", (d.pageY) + "px")
        })
        //Tooltip event mouseout rect
        .on("mouseout", function (d) {
            //Change the opacity to render the tooltip div away
            div.transition()
                .duration(100)
                .style("opacity", 0)
        })

    //Insert the state lines into the plot to help visually group the counties into states
    svg.append("path")
        .datum(topojson.mesh(geoData, geoData.objects.states, (a, b) => a !== b))
        //Apply empty fill
        .attr("fill", "none")
        //Makes the states border
        .attr("stroke", "black")
        .attr("stroke-linejoin", "round")
        .attr("d", path);
}