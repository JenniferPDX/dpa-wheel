// The data to be displayed during the mouse-over must be in a key:value pair 
// where the key is "title" 
function executeWheel(fileJSONdata, splitChar, width, myExponent) {

var height = width,
    radius = width / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(myExponent).domain([0, 1]).range([0, radius]),
    padding = 5,
    duration = 1000;

// This div is for the mouse-over annotation
var content = d3.select("#annotation"); // To display course titles on mouse hover
    
// should probably parameterize #vis and "img", or at least the former
var div = d3.select("#vis");
div.select("img").remove();

var vis = div.append("svg")
    .attr("width", width + padding * 2)
    .attr("height", height + padding * 2)
  .append("g")
    .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

var partition = d3.layout.partition()
    .sort(null)
    .value(function(d) { return 5.8 - d.depth; }); // what's this 5.8 all about? Changing to 1, 50... can't see any difference

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

d3.json(fileJSONdata, function(error, json) {
  var nodes = partition.nodes({children: json});

  var path = vis.selectAll("path").data(nodes);
  path.enter().append("path")
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", colour)
      .on("click", click)
      .on("mouseover", mouseover) // This call is for the mouse-over annotation
      .on("mouseout", mouseout);  // This call is for the mouse-over annotation


  var text = vis.selectAll("text").data(nodes);
  var textEnter = text.enter().append("text")
      .style("fill-opacity", 1) // 1 is visible; 0 is not visible
//      .style("fill-opacity", function(d) {
//			return x(d.dx) > .04 ? 1 : 0; // 1 is visible; 0 is not visible; If the wedge "width" is too small, don't display text
			// add this into the click function below as well.
//	  })
      .style("fill", function(d) { // White text for dark backgrounds; dark text for light backgrounds
        return brightness(d3.rgb(colour(d))) < 125 ? "#eee" : "#000";
      })
      .attr("text-anchor", function(d) { // Text on the left side of the wheel needs to be right-aligned
        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
      })
      .attr("dy", ".2em")
      .attr("transform", function(d) {
        var multiline = (d.name || "").split(splitChar).length > 1,
            angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = angle + (multiline ? -.5 : 0);
        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
      })
      .on("click", click)
      .on("mouseover", mouseover) // This call is for the mouse-over annotation
      .on("mouseout", mouseout);  // This call is for the mouse-over annotation

	  
  // depth is a static attribute. A node at depth 2 is always at depth 2.    
  textEnter.append("tspan")
      .attr("x", 0)
      .text(function(d) { return d.depth ? d.name.split(splitChar)[0] : ""; });
	  
  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1em")
      .text(function(d) { return d.depth ? d.name.split(splitChar)[1] || "" : ""; });

  function click(d) {
    path.transition()
      .duration(duration)
      .attrTween("d", arcTween(d));

    // Somewhat of a hack as we rely on arcTween updating the scales.
    text.style("visibility", function(e) {
          return isParentOf(d, e) ? null : d3.select(this).style("visibility");
        })
      .transition()
        .duration(duration)
        .attrTween("text-anchor", function(d) {
          return function() {
            return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
          };
        })
        .attrTween("transform", function(d) {
          var multiline = (d.name || "").split(splitChar).length > 1;
          return function() {
            var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                rotate = angle + (multiline ? -.5 : 0);
//				angle = angle === 270 ? 0 : angle; // This doesn't work, but I want the center node text to be horizontal
            return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
          };
        })
        .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 0; }) // 1 is visible; 0 is not visible
/*        .style("fill-opacity", function(d, e) { 
			var myvis = isParentOf(d, e) ? 1 : 0;
			return (myvis && (d.dx > .04)) ? 1 : 0; 
			}) // 1 is visible; 0 is not visible
*/        
		.each("end", function(e) {
          d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
        });
  }
  
    // This function is for the mouse-over annotation. 
    // The data must be in a key:value pair where the key is "title" 
    //mouseover function which will send the values to the legend
    function mouseover(d) {
        content.append("p2") // JM: Use a separate styling from regular paragraphs
        .attr("id", "annotate")
        .text(d.title ? d.name + ": " + d.title : ' ')
    }

    // This function is for the mouse-over annotation 
    //mouseout function which removes the values and replaces them with a blank space
    function mouseout(d) {
        content.html(' ');
    }
  

  function isParentOf(p, c) {
	  if (p === c) return true;
	  if (p.children) {
		return p.children.some(function(d) {
		  return isParentOf(d, c);
		});
	  }
	  return false;
	}

	function colour(d) {
	/*
	  if (d.children) {
		// There is a maximum of two children!
		//var colours = d.children.map(colour),
		//    a = d3.hsl(colours[0]),
		//    b = d3.hsl(colours[1]);
		// L*a*b* might be better here...
		//return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
		return "#e8d9c5";
	  }
	  */
	  return d.colour || "#D9E0D9";
	}

	// Interpolate the scales!
	function arcTween(d) {
	  var my = maxY(d),
		  xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
		  yd = d3.interpolate(y.domain(), [d.y, my]),
		  yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]); // when is d.y = 20?
	  return function(d) {
		return function(t) { 
			x.domain(xd(t)); 
			y.domain(yd(t)).range(yr(t)); 
			return arc(d); 
		};
	  };
	}

	function maxY(d) { // recursive?
	  return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
	}

	// http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
	function brightness(rgb) {
	  return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
	}

});
}



/*

Sunburst Trees
This is an example of using http://github.com/mbostock/d3/wiki/Partition-Layout 
d3.layout.partition to generate a zoomable sunburst tree derived from hierarchical 
data.  A http://www.cc.gatech.edu/gvu/ii/sunburst/ sunburst tree is a radial 
space-filling visualisation, analogous to an icicle tree.

Credits
This wheel is based on https://www.jasondavies.com/coffee-wheel/ Jason Davies' "Coffee Flavor Wheel", 
which is built with http://d3js.org" D3.js.
Sunburst zooming based on an http://bl.ocks.org/mbostock/4348373 example by http://bost.ocks.org/mike Mike Bostock.

*/