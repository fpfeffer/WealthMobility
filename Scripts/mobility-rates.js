var graph_width = d3.select('div#graph-mr').node().getBoundingClientRect().width,
	max_stats_width = 360,
	stats_width = d3.select('div#stats-mr').node().getBoundingClientRect().width > max_stats_width 
						? max_stats_width : d3.select('div#stats-mr').node().getBoundingClientRect().width,
	canvas = { w: graph_width, h: 12*graph_width/16 },
	margin = { left: 10, bottom: 10, right: 10, top: 10 },
	text_container = {w: 120, h: 64};

var div_mr = d3.select('#graph-mr')
			.append('div')
			.style('position', 'relative')
			.style('left', '0px')
			.style('top', '0px')
			.style('width', canvas.w + 'px')
			.style('height', canvas.h + 'px')
			.style('display', 'inline-block');

var regl = createREGL({container: div_mr.node()});

var svg_origin_mr = d3.select('#stats-origin-mr')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width/2)
			.style('display', 'inline');

var svg_destination_mr = d3.select('#stats-mr')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width)
			.style('display', 'inline');

var dpi = window.devicePixelRatio;

var wrap_mr = d3.textwrap().bounds({height: 32, width: 80});

var quintile_labels = ['Bottom 20%', '', 'Middle 20%', '', 'Top 20%']

function draw_flow_mr(element, num_quantile, black_ratio_scale, wealth_scale, parent) {
	current_pquintile = parent; // for s1-models.html

	//d3.select('div#graph-mr').select('div').select('canvas').remove();
	regl.destroy();
	regl = createREGL({container: element.node()});
	
	d3.selectAll('.label-prob-mr').remove();
	d3.selectAll('.label-prob-percent-mr').remove();

	quantile_labels = Object.values( document.getElementsByClassName('drop-menu-q') ).map(d => d.innerText);

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

	// var qScale = d3.scaleThreshold()
	// 	.domain(qScale_domain)
	// 	.range(range_array);

	var wScale = d3.scaleThreshold()
	// 	.domain(white_threshold)
	 	.range(range_array);

	var bScale = d3.scaleThreshold()
	// 	.domain(black_threshold)
	 	.range(range_array);

	var data = d3.range(count).map(i => {
		p_quintile = parent;
		
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
	});

	data = d3.shuffle(data);
	time_limit = (wealth_length + 2.25) / d3.min( data.map(x => x.speed / 60) );

	prob_q = prob_quintiles(bScale.domain(), wScale.domain());

	svg_destination_mr.append('g')
		.attr('class', 'label-prob-mr label-header')
		.attr('transform', 'translate(0, 0)')
		.append('text')
		.attr('class', 'prob-frequency header white-probability')
		.text('Probability for white children');

	svg_destination_mr.append('g')
		.attr('class', 'label-prob-mr label-header')
		.attr('transform', 'translate('+ stats_width/3 +', 0)')
		.append('text')
		.attr('class', 'prob-frequency header black-probability')
		.text('Probability for black children');

	svg_origin_mr.append('g')
		.attr('class', 'label-prob-mr label-header')
		.attr('transform', 'translate(0, '+ (yScale_px(parent) - 16) +')')
		.append('text')
		.attr('class', 'prob-frequency header black-probability')
		.text(quantile_labels[5-parent] + ' wealth quantile');

	d3.selectAll('text.prob-frequency').call(wrap_mr);

	setTimeout(function(){
		for (i = 1; i <= num_quantile; i++){
			svg_destination_mr.append('g')
				.attr('class', 'label-prob-percent-mr')
				.attr('transform', 'translate(0, '+ (yScale_px(i) ) +')')
				.append('text')
				.attr('class', 'prob-frequency white-probability')
				.text( prob_q[i-1][0] + "%" );
			svg_destination_mr.append('g')
				.attr('class', 'label-prob-percent-mr')
				.attr('transform', 'translate('+ stats_width/3 +', '+ (yScale_px(i)) +')')
				.append('text')
				.attr('class', 'prob-frequency white-probability')
				.text( prob_q[i-1][1] + "%");
			svg_destination_mr.append('g')
				.attr('class', 'label-prob-mr label-category')
				.attr('transform', 'translate('+ 2*stats_width/3 +', '+ (yScale_px(i) ) +')')
				.append('text')
				.attr('class', 'prob-frequency white-probability')
				.text(quintile_labels[i-1]);

			d3.selectAll('text.prob-frequency').call(wrap_mr);
		}
	}, 0); //(2.25 / d3.max( data.map(x => x.speed / 60)))*1000 );

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

function get_wealth_scale(data, model_name){
	const add = (a, b) => (a + b);

	diction = d3.nest()
			.key( d => d.race )
			.key( x => x.origin)
			.rollup( function(v) { 
				var array = [];
				v.map( k => +k[model_name] ).reduce(function(a, b, i) { return array[i] = a + b; }, 0);
				return array;
			})
			.object(data);

	return diction
}

function prob_quintiles(data_black, data_white){
	const add = (a, b) => (a + b);
	var array = {'0': [], '1': []};

	data_black.reduce(function(a, b, i, arr) { 
		if (arr[i-1]){
			return array[1][i] = Math.round((arr[i] - arr[i-1]) * 100); 
		} else {
			return array[1][i] = Math.round((arr[i]) * 100);
		}
	}, 0);

	data_white.reduce(function(a, b, i, arr) { 
		if (arr[i-1]){
			return array[0][i] = Math.round((arr[i] - arr[i-1]) * 100); 
		} else {
			return array[0][i] = Math.round((arr[i]) * 100);
		}
	}, 0);

	return _.unzip(Object.values(array));
}
