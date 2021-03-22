var width = 960,
  height = 1160;

var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height);

var layer1 = svg.append('g');
var layer2 = svg.append('g');
var layertop = svg.append('g');

var myColor = d3.scaleSequential().domain([1,100])
  .interpolator(d3.interpolateRgb("yellow","purple"));

var projection = d3.geoMercator()
  .center([-73.94, 40.70])
  .scale(80000)
  .translate([(width) / 2, (height)/2]);

var path = d3.geoPath()
  .projection(projection);

var div = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.json("nyc.json").then(function(nyb) {
  var map = layer1
  .attr("id", "boroughs")
  .style("width", width + "px")
  .style("height", height + "px")
  .selectAll(".state")
  .data(nyb.features)
  .enter()
    .append("path")
    .attr("class", function(d){ return d.properties.name; })
    .attr("d", path);
});

var isChart = true;
var parseDate = d3.timeParse("%Y-%m-%d");
var formatDate = d3.timeFormat("%Y-%m-%d");
var endDate = "2021-03-05";
var currentDate = "2020-12-04";
var label = layer2.append("text")
    .attr("class", "label")
    .attr("text-anchor", "middle")
    .text("ICU Bed Availability")
    .attr("font-size", 60)
    .attr("fill", "black")
    .attr("transform", "translate(400,100)")

function chart(){
  label
    .text("Week of "+endDate);

  d3.csv("data.csv").then(function(hospitals) {
    var stations = layertop
      .selectAll('circle')
      .data(hospitals)
      .enter()
        .append("circle")
        .attr("r", 5)
        .attr("cx", function(d) {
          return projection([d.long,d.lat])[0]
        })
        .attr("cy", function(d) {
          return projection([d.long,d.lat])[1]
        })
        .style("fill", function(d){
          return myColor(d.pct_used*100)
        })
        .on("mouseover", function(event, d) {
          icu_cases = parseFloat(d.staffed_icu_adult_patients_confirmed_and_suspected_covid_7_day_avg);
          if (icu_cases < 0){
            icu_cases = "Not Available";
          }
          div.transition()
            .duration(150)
            .style("opacity", 1);
          div.html(
            d.hospital_name +"<br>"+"<br>"
            +"Percent of ICU Beds Occupied: "+parseFloat(d.pct_used*100).toFixed(2)+"%"+"<br>"
            +"Average Total Number of ICU Beds: "+parseFloat(d.total_icu_beds_7_day_avg)+"<br>"
            +"Average Number of ICU Covid Cases: "+icu_cases)
              .style("left", (projection([d.long,d.lat])[0] + 18) + "px")
              .style("top", (projection([d.long,d.lat])[1] - 18) + "px");
        })
        .on("mouseout", function(event, d) {
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });
  });
}

if (isChart) {
  chart();
} else {
  //Animation
  d3.csv("pivoted.csv").then(function(hospitals) {

    var stations = layer2
      .selectAll('circle')
      .data(hospitals)
      .enter()
        .append("circle")
        .attr("r", 5)
        .attr("cx", function(d) {
          return projection([d.long,d.lat])[0]
        })
        .attr("cy", function(d) {
          return projection([d.long,d.lat])[1]
        })
        .style("fill", function(d){
          return myColor(d.pct_used*100)
        });

    var timer = setInterval(
      function(){
        drawPlot(hospitals, timer)}, 800);
  });
}


function drawPlot(hospitals, timer) {
  d3.selectAll("circle")
  .transition()
  .duration(100)
    .attr("fill", d=>{
    return myColor(d[currentDate]*100);})

  label
    .text("Week of "+currentDate);

  if (currentDate==endDate) {
    clearInterval(timer);
    chart();
  }

  var date=parseDate(currentDate);
  date.setDate(date.getDate() + 7);
  currentDate=formatDate(date);
}

//Legend
const domain = myColor.domain();

const legendWidth = 100;
const legendHeight = 150;

const paddedDomain = fc.extentLinear()
  .pad([0.1, 0.1])
  .padUnit("percent")(domain);
const [min, max] = paddedDomain;
const expandedDomain = d3.range(min, max, (max - min) / legendHeight);

const xScale = d3
  .scaleBand()
  .domain([0, 1])
  .range([0, legendWidth]);

const yScale = d3
  .scaleLinear()
  .domain(paddedDomain)
  .range([legendHeight, 0]);

const svgBar = fc
  .autoBandwidth(fc.seriesSvgBar())
  .xScale(xScale)
  .yScale(yScale)
  .crossValue(0)
  .baseValue((_, i) => (i > 0 ? expandedDomain[i - 1] : 0))
  .mainValue(d => d)
  .decorate(selection => {
    selection.selectAll("path").style("fill", d => myColor(d));
  });

const axisLabel = fc
  .axisRight(yScale)
  .tickValues([...domain, (domain[1] + domain[0]) / 2])
  .tickFormat(function(n) { return n + "%"})
  .tickSizeOuter(0);

const legendSvg = layer2.append("svg")
  .attr("height", legendHeight)
  .attr("width", legendWidth)
  .attr("y", 150);

layer2.append("text")
    .attr("class", "label")
    .text("Percent of ICU")
    .attr("font-size", 20)
    .attr("fill", "black")
    .attr("transform", "translate(80,220)");
layer2.append("text")
    .attr("class", "label")
    .text("Beds Occupied")
    .attr("font-size", 20)
    .attr("fill", "black")
    .attr("transform", "translate(80,237)");

const legendBar = legendSvg
  .append("g")
  .datum(expandedDomain)
  .call(svgBar);

const barWidth = Math.abs(legendBar.node().getBoundingClientRect().x);

legendSvg.append("g")
  .attr("transform", `translate(${barWidth})`)
  .datum(expandedDomain)
  .call(axisLabel)
  .select(".domain")
  .attr("visibility", "hidden");
