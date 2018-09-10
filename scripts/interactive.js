var canvas = { w: 960, h: 540 },
	margin = { left: 10, bottom: 10, right: 10, top: 10 };
	black_ratio_quintile = {
		"1": 0.769,
		"2": 0.485,
		"3": 0.255,
		"4": 0.011,
		"5": 0.047
	},
	wealth_scale = {
		"0": {
			"1": [0.34, 0.63, 0.803, 0.898],
			"2": [0.225, 0.489, 0.725, 0.877],
			"3": [0.17, 0.384, 0.632, 0.851],
			"4": [0.114, 0.266, 0.476, 0.757],
			"5": [0.067, 0.137, 0.272, 0.583]
		},
		"1": {
			"1": [0.447, 0.75, 0.929, 0.983],
			"2": [0.398, 0.704, 0.948, 0.975],
			"3": [0.378, 0.652, 0.972, 0.999],
			"4": [0.365, 0.657, 0.657, 0.999],
			"5": [0.019, 0.035, 0.479, 0.999]
		}
	}

var div = d3.select('#graph')
			.append('div')
			.style('position', 'relative')
			.style('left', '0px')
			.style('top', '0px')
			.style('width', canvas.w + 'px')
			.style('height', canvas.h + 'px');

var count = 10000;

var yScale = d3.scaleLinear()
	.domain([1, 5])
	.range([-0.8, 0.8])

function draw_flow(element, parent = "all") {
	d3.select('canvas').remove();

	parent == "all" ? count = 10000 : count = 4000;
	console.log(count);

	var qScale = d3.scaleThreshold()
		.domain([0.331, 0.554, 0.721, 0.858])
		.range([1, 2, 3, 4, 5]);

	var wScale = d3.scaleThreshold()
	// 	.domain(white_threshold)
	 	.range([1, 2, 3, 4, 5]);

	var bScale = d3.scaleThreshold()
	// 	.domain(black_threshold)
	 	.range([1, 2, 3, 4, 5]);


	var data = d3.range(count).map(i => {
		if (parent == "all"){
			var p = Math.random();
			var p_quintile = qScale(p);
		} else {
			p_quintile = parent;
			count = 4000;
		}
		
		var isB = (Math.random() <= black_ratio_quintile[p_quintile]) ? 1 : 0;

		if (isB){
			var q = bScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		} else {
			var q = wScale.domain(wealth_scale[isB][p_quintile])( Math.random() );
		};

		return {
			speed: Math.random() * 2 + 1,
			x: Math.random() * 2 - 1,
			y0: yScale(p_quintile),
			y1: yScale(q),
			dy: (Math.random() - 0.5)* 0.25,
			isB
		}
	})

	data = d3.shuffle(data);
	
	var regl = createREGL({container: element.node()})

	var drawPoints = regl({
		vert: `
			precision mediump float;
			attribute float speed, x, y0, y1, dy;
			attribute float isB;
			varying float c;
			uniform float interp;			
			void main() {
				float t = mod(x + interp*speed, 1.0);
				
				// cubic ease
				float ct = t < 0.5
					? 32.0 * pow(t, 6.0)
					: -0.5 * pow(abs(2.0 * t - 2.0), 10.0) + 1.0;

				float x = mix(-1.0, 1.0, t);
				float y = mix(y0, y1, ct);

				gl_Position = vec4(x, y + dy, 0, 1);
				gl_PointSize = 8.0;

				c = isB;
			}`,

		frag: `
			precision mediump float;
			varying float c;
			void main() {
				vec4 blue = vec4(0.00, 0.65, 1.00, 0.85);
				vec4 orng = vec4(1.00, 0.45, .011, 0.85);

				gl_FragColor = c == 1.0 ? blue : orng;
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
			interp: function(context, props){
				return props.interp;
			}
		},
		primitive: 'point',
		count
	})

	regl.frame(({ time }) => {
		drawPoints({ 
			data: data,
			interp: time / 50 
		})
	})
}

draw_flow(div);