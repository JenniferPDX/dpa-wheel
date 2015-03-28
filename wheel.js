// Set bHover to true in order to enable mouse-over functionality.
// The data to be displayed during the mouse-over must be in a key:value pair 
// where the key is "title" 
function executeWheel(fileJSONdata, splitChar, width, myExponent, bHover) {

var height = width,
    radius = width / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(myExponent).domain([0, 1]).range([0, radius]),
    padding = 5, // radial distance from inner radius, where text starts to draw
    duration = 1000,
    hoverText = "Hover over a course number to display its title.";

if (bHover) {
    // This div is to display course titles on mouse hover
    var content = d3.select("body")
        .append("div")
        .attr("id", "annotation");

    // Display default hover text    
    content.append("p2")
        .text(hoverText);
    }

var div = d3.select("body")
    .append("div")
    .attr("id", "vis");

    // Want to center the wheel in the window.
    // TODO: Deal with resizing window events
    var mycenter = window.innerWidth / 2;
    
var vis = div.append("svg")
    .attr("width", mycenter * 2 )
    .attr("height", height )
  .append("g")
    .attr("transform", "translate(" + [mycenter, radius] + ")");

/*  Viewer instructions. 
 Would prefer that this be two lines, but don't know how to introduce a carriage return, and when I did two appends, the line spacing was too great. When I tried to fix line spacing in the CSS, my text went to left-aligned.  */
div.append("p").text("Click on a label to zoom to that level. Click the center to zoom back one level.");
    
var partition = d3.layout.partition()
    .sort(null) // Somehow seems to mean that the JSON ordering is preserved
    .value(function(d) { return d.size; }); // Ha! Changing this to d.size works. It sizes the wedge.
    // Have to make sure all my data is correct before using this. 
    // Have to try it out on Lindsay, and see which she likes better.
//    .value(function(d) { return 5.8 - d.depth; }); // what's this 5.8 all about? Changing to 1, 50... can't see any difference

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

d3.json(fileJSONdata, function(error, json) {
  var nodes = partition.nodes({children: json.children});

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
      // The dy adjustment is how to get the text vertically centered
      .attr("dy", function(d) {
          var multiline = (d.name || "").split(splitChar).length > 1;
          return multiline ? "-.35em" : ".35em";
      }) 
      .attr("transform", function(d) {
        var multiline = (d.name || "").split(splitChar).length > 1,
            angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
            rotate = angle + (multiline ? -.5 : 0);
            
        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
      })
      .on("click", click)
      .on("mouseover", mouseover) // This call is for the mouse-over annotation
      .on("mouseout", mouseout);  // This call is for the mouse-over annotation

	  
  // depth is a static attribute of the JSON data structure. A node at depth 2 is always at depth 2.    
  textEnter.append("tspan")
      .attr("x", 0)
      .text(function(d) { return d.depth ? d.name.split(splitChar)[0] : ""; });
	  
  textEnter.append("tspan")
      .attr("x", 0)
      .attr("dy", "1em") // Adjust this to adjust line spacing for multi-line nodes, but doing so 
      // messes with the angle. Outer edges start pointing in to each other.
      .text(function(d) { return d.depth ? d.name.split(splitChar)[1] || "" : ""; });
      
      // TODO: Enable splitting for a 3rd line: Civic Leadership Minor

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
  
    // mouseover function which will send the values to the annotation box
    // The data must be in a key:value pair where the key is "title" 
    // Where there is no title text, the default hoverText string is used instead
    function mouseover(d) {
        if (content) {
            content.html(' ');
            content.append("p2") // JM: Use a separate styling from regular paragraphs
                .text(d.title ? d.name + ": " + d.title : hoverText );
        }
    }

    //mouseout function which removes the values and replaces them with a blank space
    // This function is for the mouse-over annotation 
    function mouseout(d) {
        if (content) {
            content.html(' ');
            content.append("p2")
                .text( hoverText );
        }
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

}); // d3.json reading fileJSONdata
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