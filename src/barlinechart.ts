/// <reference path="_references.ts" />

/**
 * Picasso namespace
 */
namespace Picasso {
    /**
     * Line represents a line drawn on a line-chart
     */
    export class Line {
        public name: string;
        public colors?: GradientColor[];
        public tip?: any;
        public data: LineData[];

        public dotOutsideSize: number;
        public dotInsideSize: number;
    }

    /**
     * Bar represents a bar drawn on a bar-chart
     */
    export class Bar {
        public name: string;
        public tip?: any;
        public data: BarData[];
        public columns: string[];
        public colors?: string[];
    }

    /**
     * BarLineChart is the class handling the drawings of a bar-line chart
     */
    export class BarLineChart extends Chart {
        /**
         * Lines drawn
         * @property {Array<Line>}
         */
        protected lines: Line[] = [];
        /**
         * Bar drawn. Can be null if none should be drawn
         * @property {Bar}
         */
        protected bar: Bar = null;

        /**
         * Constructor
         * @param el {string}
         * @param options {Options}
         */
        constructor(el: string, options: Options) {
            super(el, options);
        }

        /**
         * addLine adds a line to the BarLineChart
         * @param line {Line}
         * @return {void}
         */
        public addLine(line: Line): void {
            line.name = line.name || "";
            line.colors = line.colors || null;
            line.tip = this.initTooltip(line.tip);
            line.dotOutsideSize = line.dotOutsideSize == null ? 5 : line.dotOutsideSize;
            line.dotInsideSize = line.dotInsideSize == null ? 3 : line.dotInsideSize;

            this.lines.push(line);
        }

        /**
         * setBar sets the bar of the BarLineChart. Can be set to null to not
         * draw any bar
         * @param bar {Bar}
         * @return {void}
         */
        public setBar(bar: Bar): void {
            if (!bar || !bar.data.length) {
                this.bar = null;
                return;
            }
            bar.name = bar.name || "";
            bar.colors = bar.colors || [];
            bar.tip = this.initTooltip(bar.tip);
            bar.columns = Object.keys(bar.data[0]);
            bar.columns.splice(bar.columns.indexOf("key"), 1);
            if (bar.columns.indexOf("color") != -1) 
                bar.columns.splice(bar.columns.indexOf("color"), 1);

            for (var i in bar.data) {
                let d = bar.data[i];
                let t = 0;
                for (var c of bar.columns) {
                    t += d[c];
                }
                d.total = t;
            }

            this.options.timeFormat = null;
            this.bar = bar;
        }
    
        /**
         * Draw draws the chart
         * @return {void}
         */
        public draw(): void {
            if (this.lines.length <= 0 && !this.bar)
                return;

            // Add background to chart
            this.svg.append("g").append("rect")
                .attr("class", "chart-background")
                .attr("height", this.height + (this.options.xAxisMargin * 2))
                .attr("width", this.width + this.options.marginLeft + this.options.marginRight)
                .attr("transform", this.translate(-this.options.marginLeft, -this.options.xAxisMargin));

            // Define our axis
            var x;
            if (this.options.timeFormat)
                x = d3.scaleTime().range([0, this.width]);
            else
                x = d3.scaleBand().range([0, this.width]).padding(0.1)
            var y = d3.scaleLinear().range([this.height, 0]);
            var z;
            if (this.bar)
                z = d3.scaleOrdinal().range(this.bar.colors);

            // Define our value line and curve
            var valueline = d3.line()
                .x(function(d) { return x(d.key); })
                .y(function(d) { return y(d.value); })
                .curve(d3.curveCardinal);

            // Define our time parser
            var parseTime;
            if (this.options.timeFormat)
                parseTime = d3.timeParse(this.options.timeFormat);

            // Clean up our data sets
            var minValue = +Infinity;
            var maxValue = -Infinity;
            this.lines.forEach(function(l: Line) {
                l.data.forEach(function(d: LineData) {
                    if (parseTime)
                        d.key = parseTime(d.key);
                    d.value = +d.value;

                    minValue = this.min(minValue, d.value);
                    maxValue = this.max(maxValue, d.value);
                }.bind(this));
            }.bind(this));

            // Scale the range of the data
            if (this.options.min != null)
                minValue = this.options.min;
            if (this.options.max != null)
                maxValue = this.options.max;
            if (this.bar) {
                x.domain(this.bar.data.map(function(d) { return d.key; }));
                y.domain([0, this.max(
                    d3.max(this.bar.data, function(d) { return d.total; }), 
                    maxValue
                )]).nice();
                z.domain(this.bar.columns);
            } else {
                if (this.options.timeFormat)
                    x.domain(d3.extent(this.lines[0].data, function(d: LineData) { return d.key; }));
                else
                    x.domain(this.lines[0].data.map(function(d) { return d.key; }));
                y.domain([minValue, maxValue]).nice();
            }

            // Add our bar (if any)
            if (this.bar) {
                this.svg.append("g").selectAll(".bar-group")
                    .data(d3.stack().keys(this.bar.columns)(this.bar.data))
                .enter().append("g")
                    .attr("class", "bar-group")
                    .attr("fill", function(d) {
                        return z(d.key); 
                    })
                .selectAll(".bar")
                    .data(function(d) { return d; })
                .enter().append("rect")
                    .attr("class", "bar")
                    .attr("x", function(d) { return x(d.data.key); })
                    .attr("y", function(d) { return y(d[1]); })
                    .attr("height", function(d) { return y(d[0]) - y(d[1]); })
                    .attr("width", x.bandwidth())
                    .attr("fill", function(d) {
                        if (d.data.color && this.isFunction(d.data.color)) {
                            return d.data.color(d);
                        }
                        if (d.data.color) {
                            return d.data.color;
                        }

                        return;
                    }.bind(this));
            }

            // Compute a possible offset for our lines
            var offset = 0;
            if (!this.options.timeFormat)
                offset =  x.bandwidth() / 2;

            // Loop over our lines
            this.lines.forEach(function(l: Line) {
                // Add the valueline path
                var drawnLine = this.svg.append("g")
                    .attr("transform", this.translate(offset, 0))
                .append("path")
                    .data([l.data])
                    .attr("class", this.class("line") + " " + l.name)
                    .attr("d", valueline);
                // Add support for custom/gradient colors on lines
                if (l.colors) {
                    // Correctly format our colors
                    for (var i in l.colors) {
                        if (l.colors[i].value) {
                            l.colors[i].offset = Math.floor(
                                l.colors[i].value / maxValue * 100) + "%";
                        }
                    }

                    var id = Math.floor(Math.random() * 100000);
                    this.svg.append("linearGradient")
                        .attr("id", this.class("line-gradient-"+id))			
                        .attr("gradientUnits", "userSpaceOnUse")
                        .attr("x1", 0).attr("y1", y(0))
                        .attr("x2", 0).attr("y2", y(maxValue))
                    .selectAll("stop")
                        .data(l.colors)
                    .enter().append("stop")
                        .attr("offset", function(d) { return d.offset; })
                        .attr("stop-color", function(d) { return d.color; });
                    drawnLine.attr("style", "stroke: url(#" + this.class("line-gradient-"+id) + ")");
                }

                // Add point dots
                this.svg.selectAll("div") // assumed to be empty
                    .data(l.data)
                .enter().append("circle")
                    .attr("class", this.class("point-circle-outside"))
                    .attr("r", l.dotOutsideSize)
                    .attr("cx", function(d: LineData) { return x(d.key) + offset; })
                    .attr("cy", function(d: LineData) { return y(d.value); });
                this.svg.selectAll("div") // assumed to be empty
                    .data(l.data)
                .enter().append("circle")
                    .attr("class", this.class("point-circle-inside"))
                    .attr("r", l.dotInsideSize)
                    .attr("cx", function(d: LineData) { return x(d.key) + offset; })
                    .attr("cy", function(d: LineData) { return y(d.value); });
            }.bind(this));

            // Iterate again to add line tooltips
            this.lines.forEach(function(l: Line) {
                if (l.tip) {
                    // Add tooltip
                    this.svg.selectAll(this.dotClass("point-circle-collision"))
                        .data(l.data)
                    .enter().append("circle")
                        .attr("class", this.class("point-circle-collision"))
                        .attr("fill", "transparent")
                        .attr("r", 11)
                        .attr("cx", function(d: LineData) { return x(d.key) + offset; })
                        .attr("cy", function(d: LineData) { return y(d.value); })
                    .on('mouseover', l.tip.show)
                    .on('mouseout', l.tip.hide);
                }
            }.bind(this));

            // And add the tooltip of the bar as well
            if (this.bar && this.bar.tip) {
                this.svg.append("g")
                    .attr("fill", "transparent")
                .selectAll(".bar-collision")
                    .data(this.bar.data)
                .enter().append("rect")
                    .attr("class", "bar-collision")
                    .attr("x", function(d) { return x(d.key); })
                    .attr("y", function(d) { return y(d.total); })
                    .attr("height", function(d) { return y(0)-y(d.total); })
                    .attr("width", x.bandwidth())
                .on('mouseover', this.bar.tip.show)
                .on('mouseout', this.bar.tip.hide);
            }

            // Add the X Axis
            if (this.options.xLegendBottom) {
                this.svg.append("g").attr("class", "x-axis")
                    .attr("transform", this.translate(0, this.height + this.options.xAxisMargin))
                    .call(d3.axisBottom(x).ticks(this.options.xAxisTicks));
            }

            // Add the Y Axis
            if (this.options.yLegendLeft) {
                this.svg.append("g").attr("class", "y-axis")
                    .attr("transform", this.translate(- this.options.yAxisMargin, 0))
                    .call(d3.axisLeft(y).ticks(this.options.yAxisTicks).tickFormat(this.options.yAxisFormatter));
            }
            if (this.options.yLegendRight) {
                this.svg.append("g").attr("class", "y-axis")
                    .attr("transform", this.translate(this.width + this.options.yAxisMargin, 0))
                    .call(d3.axisRight(y).ticks(this.options.yAxisTicks).tickFormat(this.options.yAxisFormatter));
            }
        }
    }
}