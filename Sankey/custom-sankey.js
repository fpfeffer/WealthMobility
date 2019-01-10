function draw_sankey(graph){
	sankey.nodes(graph.nodes)
				.links(graph.links)
				.layout(32);

	// add in the links
	var link = svg.append("g").selectAll(".link")
			.data(graph.links)
			.enter()
			.append("path")
			.attr("class", function(d){
				return "link source-" + d.source.node; // + " target-" + d.target.node;
			})
			.attr("d", path)
			.style("stroke-width", function(d) { return Math.max(1, d.dy); })
			.sort(function(a, b) { return b.dy - a.dy; });

	// add the link titles
	link.append("title")
				.text(function(d) {
				return d.source.name + " → " + 
								d.target.name + "\n" + d.value; });

	// add in the nodes
	var node = svg.append("g").selectAll(".node")
			.data(graph.nodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("transform", function(d) { 
				return "translate(" + d.x + "," + d.y + ")"; 
			});
			// .call(d3.drag()
			// 	.subject(function(d) {
			// 		return d;
			// 	})
			// 	.on("start", function() {
			// 		this.parentNode.appendChild(this);
			// 	})
			// 	.on("drag", dragmove));

	// add the rectangles for the nodes
	var nodeRect = node.append("rect")
			.attr("class", function(d){
				if (d.sourceLinks.length) return "node source-"+d.node;
				return "node target-"+d.node;
				console.log(d.node, d.sourceLinks.length);
				;
			})
			.attr("height", function(d) { return d.dy; })
			.attr("width", sankey.nodeWidth())
			.style("fill", function(d) { 
				return d.color = color(d.race.replace(/ .*/, "")); 
			})
			.style("stroke", function(d) { 
				return d3.rgb(d.color).darker(2); 
			});

	nodeRect.append("title")
			.text(function(d) { 
				return d.name + "\n" + d.value; 
			});

	// add in the title for the nodes
	node.append("text")
			.attr('class', 'group-labels')
			.attr("x", function(d){
				if (d.x < width / 2) return -sankey.nodeWidth()/2;
				return 12+sankey.nodeWidth();
			})
			.attr("y", function(d) { return d.dy / 2; })
			.attr("dy", ".35em")
			.attr("text-anchor", "end")
			.attr("transform", null)
			.text(function(d) { 
				return d.name; 
			})
			// .filter(function(d) { return d.x < width / 2; })
			.attr("text-anchor", function(d){
				if (d.x < width / 2) return "end";
				return "start";
			});

	link.on('mouseover', function(d){
		elemClass = d3.select(this).attr('class').split("link ")[1];

		d3.selectAll("path."+elemClass)
			.style("stroke", "#333")
			.style("stroke-opacity", ".5");
	})
	.on('mouseout', function(d){
		elemClass = d3.select(this).attr('class').split("link ")[1];

		d3.selectAll("path."+elemClass)
			.style("stroke", "#979797")
			.style("stroke-opacity", ".2");
	});

	nodeRect.on('mouseover', function(d){
		elemClass = d3.select(this).attr('class').split("-")[1];
		d3.selectAll("path.source-"+elemClass)
			.style("stroke", "#333")
			.style("stroke-opacity", ".5");
	})
	.on('mouseout', function(d){
		elemClass = d3.select(this).attr('class').split("-")[1];
		d3.selectAll("path.source-"+elemClass)
			.style("stroke", "#979797")
			.style("stroke-opacity", ".2");
	});
}