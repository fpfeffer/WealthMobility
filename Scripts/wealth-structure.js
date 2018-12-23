var graph_width = d3.select('div#graph-ws').node().getBoundingClientRect().width;
	min_stats_width = 80;
	stats_width = d3.select('div.stats-ws').node().getBoundingClientRect().width;

	canvas = { w: graph_width, h: 12*graph_width/16 },
	margin = { left: 10, bottom: 10, right: 10, top: 10 },
	text_container = {w: 120, h: 64};

var div_ws = d3.select('#graph-ws')
			.append('div')
			.style('position', 'relative')
			.style('left', '0px')
			.style('top', '0px')
			.style('width', canvas.w + 'px')
			.style('height', canvas.h + 'px')
			.style('display', 'inline-block');

var svg_parent_ws = d3.select('#stats-parent-ws')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width)
			.style('display', 'inline');

var svg_child_ws = d3.select('#stats-child-ws')
			.append('svg')
			.attr('height', canvas.h)
			.attr('width', stats_width)
			.style('display', 'inline');

var dpi = window.devicePixelRatio;

var label_margins = 8;

var wrap_ws = d3.textwrap().bounds({height: 32, width: (stats_width/2 - label_margins)});
var wrap_ws_header = d3.textwrap().bounds({height: 32, width: (stats_width - label_margins)});
var quintile_labels = ['Bottom 20%', '', 'Middle 20%', '', 'Top 20%']

function draw_flow_ws(element, num_quantile, qScale_domain, black_ratio_scale, wealth_scale, parent = "all") {
	d3.select('div#graph-ws').select('div').select('canvas').remove();
	d3.selectAll('.label-prob-ws').remove();

	//parent == "all" ? count = 10000 : count = 4000;
	count = 20000;
	wealth_length = 4;

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
		var p = Math.random();
		var p_quintile = qScale(p);
		
		var isB = (Math.random() <= black_ratio_scale[p_quintile]) ? 1 : 0;

		if (isB){
			var q = bScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		} else {
			var q = wScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		};

		return {
			speed: 4 + 2 * Math.random(),
			x: Math.random() * wealth_length,
			y0: yScale(p_quintile),
			y1: yScale(q),
			dy: (Math.random() - 0.5)* 0.225,
			isB
		}
	})

	data = d3.shuffle(data);

	time_limit = (wealth_length + 2.25) / d3.min(data.map(x => x.speed / 60));
	//console.log( 4 / d3.median(data.map(x => x.speed / 60)) );

	prob_pquintile = d3.nest()
					.key(function(d) { return d.y0; })
					.key(function(d) {return d.isB; })
					.rollup(function(v) {
						return Math.round(v.length); // / (count/2) * 100)/100; //Math.round(v.length / (count/2) * 10000);
					})
					.object(data);

	prob_quintile = d3.nest()
					.key(function(d) { return d.y1; })
					.key(function(d) {return d.isB; })
					.rollup(function(v) {
						return Math.round(v.length); // / (count/2) * 100)/100; //Math.round(v.length / (count/2) * 10000);
					})
					.object(data);

	svg_parent_ws.append('g')
		.attr('class', 'label-prob-ws label-header')
		.attr('transform', 'translate('+ label_margins/2 +', 0)')
		.append('text')
		.attr('class', 'prob-label header white-probability')
		.text('racial composition parent generation');

	svg_child_ws.append('g')
		.attr('class', 'label-prob-ws label-header')
		.attr('transform', 'translate('+ label_margins/2 +', 0)')
		.append('text')
		.attr('class', 'prob-label header black-probability')
		.text('racial composition child generation');

	d3.selectAll('text.prob-label').call(wrap_ws_header);

	for (i = 1; i <= num_quantile; i++){
		var pquintile = Object.values(prob_pquintile[yScale(i)])

		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws label-category')
			.attr('transform', 'translate(0, '+ (yScale_px(i) ) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text(quintile_labels[i-1]);
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) - 12) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('white: ' + Math.round(pquintile[0]/d3.sum(pquintile) * 1000)/10 + "%" );
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) + 12) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('black: ' + Math.round(pquintile[1]/d3.sum(pquintile) * 1000)/10 + "%" );
	}

	d3.selectAll('text.prob-frequency').call(wrap_ws);

	setTimeout(function(){
		for (i = 1; i <= num_quantile; i++){
			var cquintile = Object.values(prob_quintile[yScale(i)])

			svg_child_ws.append('g')
				.attr('class', 'label-prob-ws')
				.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) ) +')')
				.append('text')
				.attr('class', 'prob-frequency child-probability')
				.text(quintile_labels[i-1]);

			svg_child_ws.append('g')
				.attr('class', 'label-prob-ws')
				.attr('transform', 'translate(0, '+ ((yScale_px(i))-12) +')')
				.append('text')
				.attr('class', 'prob-frequency child-probability')
				.text('white: ' + Math.round(cquintile[0]/d3.sum(cquintile) * 1000)/10 + "%" );

			svg_child_ws.append('g')
				.attr('class', 'label-prob-ws')
				.attr('transform', 'translate(0, '+ ((yScale_px(i))+12) +')')
				.append('text')
				.attr('class', 'prob-frequency child-probability')
				.text('black: ' + Math.round(cquintile[1]/d3.sum(cquintile) * 1000)/10 + "%" );

			d3.selectAll('text.prob-frequency').call(wrap_ws);
		}
	}, (2.25 / d3.max( data.map(x => x.speed / 60)))*1000 );

	setTimeout(function(){
		$('.reset-button').css('visibility', 'visible');
	}, time_limit*1000 );
	
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

				float xprime = t - 5.0;

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
			size: 5 * dpi,
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

d3.csv('../Data/2-wealth-structure.csv').then(function(d) {
	data = _.unzip( d.map( v => Object.values(v) ) );
	wealth_scale_ws = get_wealth_scale(d, 'n');
	black_ratio_quintile_ws = get_black_ratio_quintile(d, 'n')
	qScale_domain_ws = get_qscale(d, 'n');

	draw_flow_ws(div_ws, 5, qScale_domain_ws, black_ratio_quintile_ws, wealth_scale_ws);
});

function get_wealth_scale(data, model_name){
	diction = d3.nest()
			.key( d => d.race )
			.key( x => x.origin)
			.rollup( function(v) { 
				var array = [];
				v.map( k => +k[model_name] ).reduce(function(a, b, i) { return array[i] = a + b; }, 0);
				array = array.map( j => j/array[array.length-1]);
				array.pop();

				return array;
			})
			.object(data);

	return diction
}

function get_black_ratio_quintile(data, model_name){
	const add = (a, b) => (a + b);

	diction = d3.nest()
			.key( x => x.origin)
			//.key( y => y.race)
			.rollup( function(v) {
				sum_isB = v.filter( i => i.race == 1).map( k => +k[model_name] ).reduce(add);
				sum = v.map( k => +k[model_name] ).reduce(add);

				return sum_isB/sum;
			})
			.object(data);

	return diction
}

function get_qscale(data, model_name){
	const add = (a, b) => (a + b);

	total = data.map( k => +k[model_name]).reduce(add);
	array = [];

	Object.values(d3.nest()
			.key( x => x.origin)
			.rollup( function(v) {
				sum = v.map( k => +k[model_name] ).reduce(add) / total;
				return sum;
			})
			.object(data))
			.reduce(function(a, b, i) { return array[i] = a + b; }, 0);

	array.pop();

	return array
}
