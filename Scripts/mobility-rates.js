var 
	// gets the width of the bounding div element
	graph_width = d3.select('div#graph-mr').node().getBoundingClientRect().width,

	// computes the width of the SVG container which displays outcome statistics
	max_stats_width = 360,
	stats_width = d3.select('div#stats-mr').node().getBoundingClientRect().width > max_stats_width 
						? max_stats_width : d3.select('div#stats-mr').node().getBoundingClientRect().width, 

	// dimensions for the HTML Canvas element
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

	// Initialises canvas element 
var regl = createREGL({container: div_mr.node()});

	// Creates SVG elements for displaying the origin and destination probabilities
	// These are referenced subsequently by their element IDs
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

	// Calculates the Device Pixel Ratio which is used to compute the size of the dots on screen
var dpi = window.devicePixelRatio;

	// Initialises the height and width for text wrap
	// From the d3-textwrap.js library
var wrap_mr = d3.textwrap().bounds({height: 48, width: 80});

function draw_flow_mr(d, element, num_quantile, model_name, parent) { // black_ratio_scale, wealth_scale, parent) {
	current_pquintile = parent; // for s1-models.html

	// Destroys the REGL container each time the 
	// input is updated using the dropdown
	// and a new REGL is created
	regl.destroy();
	regl = createREGL({container: element.node()});
	
	d3.selectAll('.label-prob-mr').remove();
	d3.selectAll('.label-prob-percent-mr').remove();

	// Labels for the origin quantiles
	quantile_labels = Object.values( document.getElementsByClassName('drop-menu-q') ).map(d => d.innerText);

	// Specifies the number of dots to be displayed
	count = 10000;

	// Specifies the horizontal spread or dispersion of the dots
	// Increasing this would extend the duration of the animation
	// Not meaningful in this case, since the animation runs on loop.
	wealth_length = 4;

	// We use D3 scales to compute the y values in the normalized device coordinates
	// (NDC), bypassing the pixel coordinates altogether. In NDC (0,0) is the middle,
	// (-1, 1) is the top left and (1, -1) is the bottom right.
	var yScale = d3.scaleLinear()
		.domain([1, num_quantile])
		.range([-0.75, 0.75]);

	// Calculates the height of the graph used for the visualization
	g_height = yScale.range().reduce((a, b) => Math.abs(a) + Math.abs(b), 0);

	var yScale_px = d3.scaleLinear()
		.domain([1, num_quantile])
		.range([(0.5 + g_height/4) * canvas.h, (0.5 - g_height/4) * canvas.h]);

	range_array = [];
	
	for (i = 1; i <= num_quantile; i++){
		range_array.push(i);
	}

	wealth_scale = get_wealth_scale(d, model_name);

	// A threshold scale for computing the quantiles for people by race (white and black respectively)
	var wScale = d3.scaleThreshold()
	// 	.domain(white_threshold)
	 	.range(range_array);

	var bScale = d3.scaleThreshold()
	// 	.domain(black_threshold)
	 	.range(range_array);

	// Processes the data for use by REGL
	// Returns an array of data points (object) with speed, x position, race values
	// initial and final y position based on the transition probabilities by race
	// dy is random vertical dispersion 
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
	// time_limit = (wealth_length + 2.25) / d3.min( data.map(x => x.speed / 60) );

	prob_q = prob_quintiles(bScale.domain(), wScale.domain());

	// Creates the text labels in the SVG elements
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
		.attr('transform', 'translate(0, '+ (yScale_px(parent) - 4) +')')
		.append('text')
		.attr('class', 'prob-frequency header black-probability')
		.text(quantile_labels[5-parent]);

	d3.selectAll('text.prob-frequency').call(wrap_mr);

	console.log(quantile_labels);

	// Displays the outcome probabilities
	for (i = 1; i <= num_quantile; i++){
		svg_destination_mr.append('g')
			.attr('class', 'label-prob-percent-mr')
			.attr('transform', 'translate(0, '+ (yScale_px(i) - 4) +')')
			.append('text')
			.attr('class', 'prob-frequency white-probability')
			.text( prob_q[i-1][0] + "%" );
		svg_destination_mr.append('g')
			.attr('class', 'label-prob-percent-mr')
			.attr('transform', 'translate('+ stats_width/3 +', '+ (yScale_px(i) - 4) +')')
			.append('text')
			.attr('class', 'prob-frequency white-probability')
			.text( prob_q[i-1][1] + "%");

		svg_destination_mr.append('g')
			.attr('class', 'label-prob-mr label-category')
			.attr('transform', 'translate('+ 2*stats_width/3 +', '+ (yScale_px(i) - 4) +')')
			.append('text')
			.attr('class', 'prob-frequency white-probability')
			.text(quantile_labels[5 - i]); // the labels have been reversed

		d3.selectAll('text.prob-frequency').call(wrap_mr);
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
				// calculates the absolute x position based on time
				float t = mod(x + interp*speed, 2.0);

				// calculates the x position of the dots to be projected on to the screen
				float xprime = t - 1.00;

				// cubic ease
				// used to calculate the y position using a cubic smoothing function
				float ct = t < 1.0
					? 32.0 * pow( (t / 2.00), 6.0)
					: -0.5 * pow(abs( t - 2.0), 10.0) + 1.0;

				// calculates the y position
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

// Function to calculate the wealth scale from the CSV file
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

// Function to calculate the transition probabilities for each quintile based on race
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
