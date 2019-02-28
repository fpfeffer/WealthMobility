var 
	// gets the width of the bounding div element
	graph_width = d3.select('div#graph-ws').node().getBoundingClientRect().width,

	// computes the width of the SVG container which displays outcome statistics
	stats_width = d3.select('div.stats-ws').node().getBoundingClientRect().width,

	// dimensions for the HTML Canvas element
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
	
	// Initialises canvas element 
var regl = createREGL({container: div_ws.node()});

	// Creates SVG elements for displaying the origin and destination probabilities
	// These are referenced subsequently by their element IDs
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

	// Calculates the Device Pixel Ratio which is used to compute the size of the dots on screen
var dpi = window.devicePixelRatio;

var label_margins = 8;

	// Initialises the height and width for text wrap
	// From the d3-textwrap.js library
var wrap_ws = d3.textwrap().bounds({height: 48, width: (stats_width/2 - label_margins)});
var wrap_ws_header = d3.textwrap().bounds({height: 48, width: (stats_width - label_margins)});

var quantile_labels = []; //['Bottom 20%', '', 'Middle 20%', '', 'Top 20%'];
var labels = ['Bottom', 'Middle', 'Top']


// Function to draw the wealth structure graph
// This animation simulates the dots and stops, and is used in the graphs presented in the main section
// The code structure and the REGL code is similar to the one used in `mobility-rates.js`
function draw_flow_ws(d, element, num_quantile, model_name, parent = "all") { //qScale_domain, black_ratio_scale, wealth_scale) {	
	regl.destroy();
	regl = createREGL({container: element.node()});

	d3.selectAll('.label-prob-ws').remove();
	$('.reset-button').css('visibility', 'hidden');

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

		quantile_pct = Math.round(100/num_quantile*10)/10;

		if (num_quantile == 3 || num_quantile == 5){
			(i % 2) ? (quantile_labels[i-1] = labels[Math.round(i*labels.length/num_quantile)-1] +" "+ quantile_pct + "%") : quantile_labels[i-1] = "";
		} else if (num_quantile == 4) {
			((i == 1) || (i == 4)) ? (quantile_labels[i-1] = labels[Math.round(i*labels.length/num_quantile)-1] +" "+ quantile_pct + "%") : quantile_labels[i-1] = "";
		}
	}

	wealth_scale = get_wealth_scale(d, model_name);
	black_ratio_scale = get_black_ratio_quantile(d, model_name);
	qScale_domain = get_qscale(d, model_name);
	prob_pquantile = get_prob_pquintiles( Object.values(black_ratio_scale) );
	prob_quantile = get_prob_quantiles(d, model_name);

	var qScale = d3.scaleThreshold()
		.domain(qScale_domain)
		.range(range_array);

	var wScale = d3.scaleThreshold()
		//.domain(wealth_scale[isB][p_quantile])
	 	.range(range_array);

	var bScale = d3.scaleThreshold()
		//.domain(wealth_scale[isB][p_quantile])
	 	.range(range_array);

	var data = d3.range(count).map(i => {
		var p = Math.random();
		var p_quantile = qScale(p);
		
		var isB = (Math.random() <= black_ratio_scale[p_quantile]) ? 1 : 0;

		if (isB){
			var q = bScale.domain(wealth_scale[isB][p_quantile])( Math.random() );
		} else {
			var q = wScale.domain(wealth_scale[isB][p_quantile])( Math.random() );
		};

		return {
			speed: 4 + 2 * Math.random(),
			x: Math.random() * wealth_length,
			y0: yScale(p_quantile),
			y1: yScale(q),
			dy: (Math.random() - 0.5)* 0.225,
			isB
		}
	})

	data = d3.shuffle(data);

	time_limit = (wealth_length + 2.25) / d3.min(data.map(x => x.speed / 60));

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
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws label-category')
			.attr('transform', 'translate(0, '+ (yScale_px(i) ) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text(quantile_labels[i-1]);
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) - 12) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('white: ' + prob_pquantile[i-1][0] + "%" );
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) + 12) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('black: ' + prob_pquantile[i-1][1] + "%" );
	}

	d3.selectAll('text.prob-frequency').call(wrap_ws);

	setTimeout(function(){
		for (i = 1; i <= num_quantile; i++){
			svg_child_ws.append('g')
				.attr('class', 'label-prob-ws label-category')
				.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) ) +')')
				.append('text')
				.attr('class', 'prob-frequency child-probability')
				.text(quantile_labels[i-1]);

			svg_child_ws.append('g')
				.attr('class', 'label-prob-ws')
				.attr('transform', 'translate(0, '+ ((yScale_px(i))-12) +')')
				.append('text')
				.attr('class', 'prob-frequency child-probability')
				.text('white: ' + prob_quantile[i-1][0] + "%" );

			svg_child_ws.append('g')
				.attr('class', 'label-prob-ws')
				.attr('transform', 'translate(0, '+ ((yScale_px(i))+12) +')')
				.append('text')
				.attr('class', 'prob-frequency child-probability')
				.text('black: ' + prob_quantile[i-1][1] + "%" );

			d3.selectAll('text.prob-frequency').call(wrap_ws);
		}
	}, (2.25 / d3.max( data.map(x => x.speed / 60)))*1000 );

	setTimeout(function(){
		$('.reset-button').css('visibility', 'visible');
	}, time_limit*1000 );

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


// Function to draw the wealth structure graph
// This animation runs on loop, and is used in the graphs presented in the supplemental materials
function draw_flow_ws_inf(d, element, num_quantile, model_name, parent = "all") { //, qScale_domain, black_ratio_scale, wealth_scale, parent = "all") {	
	regl.destroy();
	regl = createREGL({container: element.node()});

	d3.selectAll('.label-prob-ws').remove();
	$('.reset-button').css('visibility', 'hidden');

	count = 20000;
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

		quantile_pct = Math.round(100/num_quantile*10)/10;

		if (num_quantile == 3 || num_quantile == 5){
			(i % 2) ? (quantile_labels[i-1] = labels[Math.round(i*labels.length/num_quantile)-1] +" "+ quantile_pct + "%") : quantile_labels[i-1] = "";
		} else if (num_quantile == 4) {
			((i == 1) || (i == 4)) ? (quantile_labels[i-1] = labels[Math.round(i*labels.length/num_quantile)-1] +" "+ quantile_pct + "%") : quantile_labels[i-1] = "";
		}
	}

	wealth_scale = get_wealth_scale(d, model_name);
	black_ratio_scale = get_black_ratio_quantile(d, model_name);
	qScale_domain = get_qscale(d, model_name);
	prob_pquantile = get_prob_pquintiles( Object.values(black_ratio_scale) );
	prob_quantile = get_prob_quantiles(d, model_name);

	var qScale = d3.scaleThreshold()
		.domain(qScale_domain)
		.range(range_array);

	var wScale = d3.scaleThreshold()
		//.domain(wealth_scale[isB][p_quantile])
	 	.range(range_array);

	var bScale = d3.scaleThreshold()
		//.domain(wealth_scale[isB][p_quantile])
	 	.range(range_array);

	var data = d3.range(count).map(i => {
		var p = Math.random();
		var p_quantile = qScale(p);
		
		var isB = (Math.random() <= black_ratio_scale[p_quantile]) ? 1 : 0;

		if (isB){
			var q = bScale.domain(wealth_scale[isB][p_quantile])( Math.random() );
		} else {
			var q = wScale.domain(wealth_scale[isB][p_quantile])( Math.random() );
		};

		return {
			speed: 4 + 2 * Math.random(),
			x: Math.random() * wealth_length,
			y0: yScale(p_quantile),
			y1: yScale(q),
			dy: (Math.random() - 0.5)* 0.225,
			isB
		}
	})

	data = d3.shuffle(data);

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
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws label-category')
			.attr('transform', 'translate(0, '+ (yScale_px(i) ) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text(quantile_labels[i-1]);
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) - 12) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('white: ' + prob_pquantile[i-1][0] + "%" );
		svg_parent_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) + 12) +')')
			.append('text')
			.attr('class', 'prob-frequency parent-probability')
			.text('black: ' + prob_pquantile[i-1][1] + "%" );
	}

	d3.selectAll('text.prob-frequency').call(wrap_ws);

	for (i = 1; i <= num_quantile; i++){
		svg_child_ws.append('g')
			.attr('class', 'label-prob-ws label-category')
			.attr('transform', 'translate('+ stats_width/2 +', '+ ((yScale_px(i)) ) +')')
			.append('text')
			.attr('class', 'prob-frequency child-probability')
			.text(quantile_labels[i-1]);

		svg_child_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate(0, '+ ((yScale_px(i))-12) +')')
			.append('text')
			.attr('class', 'prob-frequency child-probability')
			.text('white: ' + prob_quantile[i-1][0] + "%" );

		svg_child_ws.append('g')
			.attr('class', 'label-prob-ws')
			.attr('transform', 'translate(0, '+ ((yScale_px(i))+12) +')')
			.append('text')
			.attr('class', 'prob-frequency child-probability')
			.text('black: ' + prob_quantile[i-1][1] + "%" );

		d3.selectAll('text.prob-frequency').call(wrap_ws);
	}

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
		// if (time < time_limit){
			drawPoints({ 
				data: data,
				interp: time / 60 
			})	
		// }
	})
}

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

function get_black_ratio_quantile(data, model_name){
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

function get_prob_pquintiles(data){
	var array = {'0': [], '1': []};

	data.reduce(function(a, b, i, arr) { 
		if ((arr[i] * 100) < 0.5 || (arr[i] * 100) > 99.5 ) return array[1][i] = Math.round((arr[i]) * 1000) / 10;
		return array[1][i] = Math.round((arr[i]) * 100);
	}, 0);

	data.reduce(function(a, b, i, arr) {
		if (((1 - arr[i]) * 100) < 0.5 || ((1 - arr[i]) * 100) > 99.5 ) return array[0][i] = Math.round((1 - arr[i]) * 1000) / 10;
		return array[0][i] = Math.round((1-arr[i]) * 100);
	}, 0);

	return _.unzip(Object.values(array));
}

function get_prob_quantiles( data, model_name ){
	diction = d3.nest()
			.key( d => d.race )
			.key( d => d.destination )
			.rollup( function(v) { 
				var array = [];
				array = v.map( k => +k[model_name] );
				// array = array.map( j => j/array[array.length-1]);
				// array.pop();

				return array;
			})
			.object(data);

	var arr = _.unzip( Object.values(diction).map( function(d) {
		sum = Object.values(d).map( v => v.reduce((a, b) => a + b, 0))
		return sum
	}) ).map( function(d) {
		sum = d.reduce((a, b) => a + b, 0);
		return d.map( v => Math.round( (v/sum)*100) );
	} );

	return arr;
}
