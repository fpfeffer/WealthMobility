var graph_width = d3.select('div#graph').node().getBoundingClientRect().width;
	min_stats_width = 200;
	stats_width = d3.select('div#stats').node().getBoundingClientRect().width > min_stats_width 
						? min_stats_width : d3.select('div#stats').node().getBoundingClientRect().width;
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

var svg = d3.select('#stats')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width)
			.style('display', 'inline');

var dpi = window.devicePixelRatio;

var wrap = d3.textwrap().bounds({height: 32, width: 80});

function draw_flow(element, num_quantile, qScale_domain, black_ratio_scale, wealth_scale, parent = "all") {
	d3.select('canvas').remove();
	d3.selectAll('.label-prob').remove();

	//parent == "all" ? count = 200000 : count = 10000;
	count = 10000; //20000;
	wealth_length = 4;

	var yScale = d3.scaleLinear()
		.domain([1, num_quantile])
		.range([-0.75, 0.75]);

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
	// 	.domain(white_threshold)
	 	.range(range_array);

	var bScale = d3.scaleThreshold()
	// 	.domain(black_threshold)
	 	.range(range_array);

	var data = d3.range(count).map(i => {
		if (parent == "all"){
			var p = Math.random();
			var p_quintile = qScale(p);
		} else {
			p_quintile = parent;
		}
		
		var isB = (Math.random() <= black_ratio_scale[p_quintile]) ? 1 : 0;

		if (isB){
			var q = bScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		} else {
			var q = wScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		};

		return {
			speed: 3 + 2 * Math.random(),
			x: Math.random() * wealth_length,
			y0: yScale(p_quintile),
			y1: yScale(q),
			dy: (Math.random() - 0.5)* 0.25,
			isB
		}
	})

	data = d3.shuffle(data);
	time_limit = (wealth_length + 2.25) / d3.min( data.map(x => x.speed / 60) );

	prob_quintile_pquintile = d3.nest()
					.key(function(d) { return d.y1; })
					.key(function(d) {return d.isB; })
					.rollup(function(v) {
						return Math.round(v.length / (count/2) * 100);
					})
					.object(data);

	svg.append('g')
		.attr('class', 'label-prob-header')
		.attr('transform', 'translate(0, 0)')
		.append('text')
		.attr('class', 'prob-frequency header white-probability')
		.text('Probability for white children');

	svg.append('g')
		.attr('class', 'label-prob-header')
		.attr('transform', 'translate('+ stats_width/2 +', 0)')
		.append('text')
		.attr('class', 'prob-frequency header black-probability')
		.text('Probability for black children');

	d3.selectAll('text.prob-frequency').call(wrap);

	setTimeout(function(){
		for (i = 1; i <= num_quantile; i++){
			svg.append('g')
				.attr('class', 'label-prob')
				.attr('transform', 'translate(0, '+ ((yScale_px(i)) - 8) +')')
				.append('text')
				.attr('class', 'prob-frequency white-probability')
				.text(Object.values(prob_quintile_pquintile[yScale(i)])[0] + "%");

			svg.append('g')
				.attr('class', 'label-prob')
				.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) - 8) +')')
				.append('text')
				.attr('class', 'prob-frequency black-probability')
				.text(Object.values(prob_quintile_pquintile[yScale(i)])[1] + "%");

			d3.selectAll('text.prob-frequency').call(wrap);
		}
	}, 0); //(2.25 / d3.max( data.map(x => x.speed / 60)))*1000 );
	
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
				// float t = x + interp*speed;
				// float xprime = t - 5.00;
				// float dx = xprime <= -1.0 ? 0.0 : (xprime + 1.0) / 2.0;

				float t = mod(x + interp*speed, 2.0);
				float xprime = t - 1.00;
				float dx = t / 2.00;

				// cubic ease
				float ct = dx < 0.5
					? 32.0 * pow(dx, 6.0)
					: -0.5 * pow(abs(2.0 * dx - 2.0), 10.0) + 1.0;

				float y = y0 + (y1 - y0) * ct;

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
			size: 5 * dpi,
			interp: function(context, props){
				return props.interp;
			}
		},
		primitive: 'point',
		count
	})

	regl.frame(({ time }) => {
		//if (time < time_limit){
			drawPoints({ 
				data: data,
				interp: time / 60
			})
		//}
	})
}