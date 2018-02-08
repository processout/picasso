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
        public onclick?: any;
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
        public onclick?: any;
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
        protected bars: Bar[] = [];

        /**
         * Constructor
         * @param el {string}
         * @param options {Options}
         */
        constructor(el: string, options: Options) {
            super(el, options);
        }

        /**
         * Cleanup removes any tip of the chart
         * @return {void}
         */
        public cleanupTip(): void {
            super.cleanupTip();
            for (var i in this.bars) {
                if (this.bars[i].tip)
                    this.bars[i].tip.destroy();
            }
            for (var i in this.lines) {
                if (this.lines[i].tip)
                    this.lines[i].tip.destroy();
            }
        }

        /**
         * resetLines removes all the chart lines and its associated tips
         * @return {void}
         */
        public resetLines(): void {
            this.cleanupTip();
            this.lines = [];
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
        public addBar(bar: Bar): void {
            if (!bar || !bar.data.length) {
                return;
            }
            bar.name = bar.name || "";
            bar.colors = bar.colors || [];
            bar.tip = this.initTooltip(bar.tip);
            bar.columns = [];
            // Clean up columns
            for (var k in bar.data[0]) {
                if (k == "key" || k == "color" || k == "total" || (k != "" && k[0] == '_'))
                    continue;
                
                    bar.columns.push(k);
            }

            for (var i in bar.data) {
                let d = bar.data[i];
                let t = 0;
                for (var c of bar.columns) {
                    t += d[c];
                }
                d.total = t;
            }

            this.bars.push(bar);
        }

        /**
         * Clear clears the chart tooltips
         * @return {void}
         */
        public clear(): void {
            if (this.lines)
                this.lines.forEach(function(l: Line) {
                    if (l.tip) l.tip.hide();
                }, this);
            if (this.bars)
                this.bars.forEach(function(b: Bar) {
                    if (b.tip) b.tip.hide();
                }, this);
        }
    
        /**
         * Draw draws the chart
         * @return {void}
         */
        public draw(): void {
            if (this.lines.length <= 0 && this.bars.length <= 0)
                return;

            // Compute if the chart is going to be time scaled or not
            var timescaled = false;
            this.lines.forEach(function(l: Line) {
                l.data.forEach(function(d: LineData) {
                    if (d.key instanceof Date)
                        timescaled = true;
                    
                    if (timescaled && !(d.key instanceof Date))
                        throw new Error("The lines provided contained both Date and not dates for its keys. The keys should either all be Dates, or none.");
                }, this);
            }, this);

            if (timescaled && this.bars.length > 0)
                throw new Error("The lines provided all contained Dates for its keys, but bars were also provided. Please don't use Dates as keys on your line charts when using bars as well.");

            this.bars.forEach(function(b: Bar) {
                b.data.forEach(function(d: BarData) {
                    if (d.key instanceof Date)
                        throw new Error("The bar chart contained Dates as keys, which is not supported.");
                }, this);
            }, this);

            // Add background to chart
            this.svg.append("g").append("rect")
                .attr("class", "chart-background")
                .attr("height", this.height + (this.options.xAxisMargin * 2))
                .attr("width", this.width + this.options.marginLeft + this.options.marginRight)
                .attr("transform", this.translate(-this.options.marginLeft, -this.options.xAxisMargin));

            // Define our axis
            var x;
            if (timescaled)
                x = d3.scaleTime().range([0, this.width]);
            else
                x = d3.scaleBand().range([0, this.width]).padding(0.1)
            var y = d3.scaleLinear().range([this.height, 0]);

            // Define our value line and curve
            var valueline = d3.line()
                .x(function(d) { return x(d.key); })
                .y(function(d) { return y(d.value); })
                .curve(d3.curveCardinal.tension(0.5));

            // Clean up our data sets
            var minValue = +Infinity;
            var maxValue = -Infinity;
            this.lines.forEach(function(l: Line) {
                l.data.forEach(function(d: LineData) {
                    d.value = +d.value;

                    minValue = this.min(minValue, d.value);
                    maxValue = this.max(maxValue, d.value);
                }, this);
            }, this);

            // Scale the range of the data
            if (this.options.min != null)
                minValue = this.options.min;
            if (this.options.max != null)
                maxValue = this.options.max;
            if (this.bars.length > 0) {
                var keys: Array<string> = [];
                for (var i in this.bars) {
                    for (var j in this.bars[i].data) {
                        if (keys.indexOf(this.bars[i].data[j].key) < 0)
                            keys.push(this.bars[i].data[j].key);
                        maxValue = this.max(this.bars[i].data[j].total, maxValue);
                    }
                }
                x.domain(keys);
                y.domain([0, maxValue]).nice();
            } else {
                if (timescaled)
                    x.domain(d3.extent(this.lines[0].data, function(d: LineData) { return d.key; }));
                else
                    x.domain(this.lines[0].data.map(function(d) { return d.key; }));
                y.domain([minValue, maxValue]).nice();
            }

            // Add our bar (if any)
            var xbar;
            if (this.bars.length > 0)
                xbar = d3.scaleBand().padding(0.05)
                    .domain([0, this.bars.length - 1])
                    .rangeRound([0, x.bandwidth()]);
            this.bars.forEach(function(b: Bar, id) {
                var z = d3.scaleOrdinal().range(b.colors).domain(b.columns);
                this.svg.append("g").selectAll(".bar-group")
                    .data(d3.stack().keys(b.columns)(b.data))
                .enter().append("g")
                    .attr("class", "bar-group")
                    .attr("fill", function(d) {
                        return z(d.key); 
                    })
                .selectAll(".bar")
                    .data(function(d) { return d; })
                .enter().append("rect")
                    .attr("class", "bar")
                    .attr("x", function(d) { return x(d.data.key) + xbar(id); })
                    .attr("y", function(d) { return y(d[1]); })
                    .attr("height", function(d) { return y(d[0]) - y(d[1]); })
                    .attr("width", xbar.bandwidth())
                    .attr("fill", function(d) {
                        if (d.data.color && this.isFunction(d.data.color)) {
                            return d.data.color(d);
                        }
                        if (d.data.color) {
                            return d.data.color;
                        }

                        return;
                    }.bind(this));
            }, this);

            // Compute a possible offset for our lines
            var offset = 0;
            if (!timescaled)
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
            }, this);

            // Iterate again to add line tooltips
            this.lines.forEach(function(l: Line) {
                if (!l.tip && !l.onclick)
                    return;

                var cl = this.class("point-circle-collision");
                if (l.onclick)
                    cl += " " + this.class("point-circle-collision-onclick"); 

                this.svg.selectAll(this.dotClass("point-circle-collision"))
                    .data(l.data)
                .enter().append("circle")
                    .attr("class", cl)
                    .attr("fill", "transparent")
                    .attr("r", 11)
                    .attr("cx", function(d: LineData) { return x(d.key) + offset; })
                    .attr("cy", function(d: LineData) { return y(d.value); })
                .on("mouseover", function(d) { if (l.tip.show) l.tip.show(d); }.bind(this))
                .on("mouseout",  function(d) { if (l.tip.hide) l.tip.hide(d); }.bind(this))
                .on("click", function(d) {
                    if (l.onclick) l.onclick(d);
                }.bind(this));
            }.bind(this));

            // And add the tooltip of the bars as well
            this.bars.forEach(function(b: Bar, id) {
                if (!b.tip && !b.onclick)
                    return;

                var cl = this.class("bar-collision");
                if (b.onclick)
                    cl += " " + this.class("bar-collision-onclick"); 

                this.svg.append("g")
                    .attr("fill", "transparent")
                .selectAll(this.dotClass("bar-collision"))
                    .data(b.data)
                .enter().append("rect")
                    .attr("class", cl)
                    .attr("x", function(d) { return x(d.key) + xbar(id); })
                    .attr("y", function(d) { return y(maxValue); })
                    .attr("height", function(d) { return y(0)-y(maxValue); })
                    .attr("width", xbar.bandwidth())
                .on("mouseover", function(d) { if (b.tip) b.tip.show(d); }.bind(this))
                .on("mouseout",  function(d) { if (b.tip) b.tip.hide(d); }.bind(this))
                .on("click", function(d) {
                    if (b.onclick) b.onclick(d);
                }.bind(this));
            }, this);

            // Add the X Axis
            if (this.options.xLegendBottom) {
                this.svg.append("g").attr("class", "x-axis")
                    .attr("transform", this.translate(0, this.height + this.options.xAxisMargin))
                    .call(d3.axisBottom(x).ticks(this.options.xAxisTicks))
                    .selectAll(".tick text")
                        .call(this.wrap, x.bandwidth());;
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