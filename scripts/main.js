var graph_width = d3.select('div#graph').node().getBoundingClientRect().width;
	min_stats_width = 80;
	stats_width = d3.select('div.stats').node().getBoundingClientRect().width;

	canvas = { w: graph_width, h: 12*graph_width/16 },
	margin = { left: 10, bottom: 10, right: 10, top: 10 },
	text_container = {w: 120, h: 64};

var div = d3.select('#graph')
			.append('div')
			.style('position', 'relative')
			.style('left', '0px')
			.style('top', '0px')
			.style('width', canvas.w + 'px')
			.style('height', canvas.h + 'px')
			.style('display', 'inline-block');

var svg_parent = d3.select('#stats-parent')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width)
			.style('display', 'inline');

var svg_child = d3.select('#stats-child')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width)
			.style('display', 'inline');

var dpi = window.devicePixelRatio;

var wrap = d3.textwrap().bounds({height: 32, width: (stats_width - 8)});

function draw_flow(element, num_quantile, qScale_domain, black_ratio_scale, wealth_scale, parent = "all") {
	d3.select('canvas').remove();
	d3.selectAll('.prob-frequency').remove();

	parent == "all" ? count = 10000 : count = 4000;

	var yScale = d3.scaleLinear()
		.domain([1, num_quantile])
		.range([-0.7, 0.7]);

	g_height = yScale.range().reduce((a, b) => Math.abs(a) + Math.abs(b), 0);

	var yScale_px = d3.scaleLinear()
		.domain([1, num_quantile])
		.range([(0.5 + g_height/4) * canvas.h, (0.5 - g_height/4) * canvas.h]);

	range_array = [];
	
	for (i = 1; i <= num_quantile; i++){
		range_array.push(i);
	}

	var qScale = d3.scaleThreshold()
		.domain(qScale_domain)
		.range(range_array);

	var wScale = d3.scaleThreshold()
		//.domain(wealth_scale[isB][p_quintile])
	 	.range(range_array);

	var bScale = d3.scaleThreshold()
		//.domain(wealth_scale[isB][p_quintile])
	 	.range(range_array);

	var data = d3.range(count).map(i => {
		// if (parent == "all"){
		// 	var p = Math.random();
		// 	var p_quintile = qScale(p);
		// } else {
		// 	p_quintile = parent;
		// }

		var p = Math.random();
		var p_quintile = qScale(p);
		
		var isB = (Math.random() <= black_ratio_scale[p_quintile]) ? 1 : 0;

		if (isB){
			var q = bScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		} else {
			var q = wScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		};

		return {
			speed: 3 + 3 * Math.random(),
			x: Math.random() * 2,
			y0: yScale(p_quintile),
			y1: yScale(q),
			dy: (Math.random() - 0.5)* 0.225,
			isB
		}
	})

	data = d3.shuffle(data);

	time_limit = 4.25 / d3.min(data.map(x => x.speed / 60));
	//console.log( 4 / d3.median(data.map(x => x.speed / 60)) );

	prob_pquintile = d3.nest()
					.key(function(d) { return d.y0; })
					.key(function(d) {return d.isB; })
					.rollup(function(v) {
						return v.length; //Math.round(v.length / (count/2) * 10000);
					})
					.object(data);

	prob_quintile = d3.nest()
					.key(function(d) { return d.y1; })
					.key(function(d) {return d.isB; })
					.rollup(function(v) {
						return v.length; //Math.round(v.length / (count/2) * 10000);
					})
					.object(data);

	svg_parent.append('g')
		.attr('class', 'label-prob-header')
		.attr('transform', 'translate(0, 12)')
		.append('text')
		.attr('class', 'prob-frequency header white-probability')
		.text('# people in parent generation');

	svg_child.append('g')
		.attr('class', 'label-prob-header')
		.attr('transform', 'translate(0, 12)')
		.append('text')
		.attr('class', 'prob-frequency header black-probability')
		.text('# people in child generation');

	for (i = 1; i <= num_quantile; i++){
		svg_parent.append('g')
			.attr('class', 'label-prob')
			.attr('transform', 'translate(0, '+ ((yScale_px(i)) - 20) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('white: ' + Object.values(prob_pquintile[yScale(i)])[0]);

		svg_parent.append('g')
			.attr('class', 'label-prob')
			.attr('transform', 'translate(0, '+ ((yScale_px(i)) + 4) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('black: ' + Object.values(prob_pquintile[yScale(i)])[1]);

		svg_child.append('g')
			.attr('class', 'label-prob')
			.attr('transform', 'translate(0, '+ ((yScale_px(i)) - 20) +')')
			.append('text')
			.attr('class', 'prob-frequency child-probability')
			.text('white: ' + Object.values(prob_quintile[yScale(i)])[0]);

		svg_child.append('g')
			.attr('class', 'label-prob')
			.attr('transform', 'translate(0, '+ ((yScale_px(i)) + 4) +')')
			.append('text')
			.attr('class', 'prob-frequency child-probability')
			.text('black: ' + Object.values(prob_quintile[yScale(i)])[1]);
	}

	d3.selectAll('text.prob-frequency').call(wrap);
	
	var regl = createREGL({container: element.node()})

	var drawPoints = regl({
		vert: `
			precision mediump float;
			attribute float speed, x, y0, y1, dy;
			attribute float isB;
			varying float c;
			uniform float size;
			uniform float interp;			
			void main() {
				float t = x + interp*speed;

				float xprime = t - 3.0;

				float dx = xprime <= -1.0 ? 0.0 : (xprime + 1.0) / 2.0;

				// cubic ease
				float ct = dx < 0.5
					? 32.0 * pow(dx, 6.0)
					: -0.5 * pow(abs(2.0 * dx - 2.0), 10.0) + 1.0;

				float y = y0 + (y1 - y0) * ct;
				// float y = xprime < 0.0 ? y0 : y1;

				gl_Position = vec4(xprime, y + dy, 0, 1);
				gl_PointSize = size;

				c = isB;
			}`,

		frag: `
			precision mediump float;
			varying float c;
			void main() {
				vec4 black = vec4(0.37, 0.42, 0.82, 0.85);
				vec4 white = vec4(1.00, 0.51, 0.37, 0.85);

				gl_FragColor = c == 1.0 ? black : white;
			}`,

		attributes: {
			speed: data.map(d => d.speed),
			x:	data.map(d => d.x),
			y0: data.map(d => d.y0),
			y1: data.map(d => d.y1),
			dy: data.map(d => d.dy),
			isB: data.map(d => d.isB)
		},
		uniforms: {
			size: 6 * dpi,
			interp: function(context, props){
				return props.interp;
			}
		},
		primitive: 'point',
		count
	})

	regl.frame(({ time }) => {
		if (time < time_limit){
			drawPoints({ 
				data: data,
				interp: time / 60 
			})	
		}
	})
}

