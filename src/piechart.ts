/// <reference path="_references.ts" />

/**
 * Picasso namespace
 */
namespace Picasso {

    /**
     * MapChart is the class handling the drawings of a map chart
     */
    export class PieChart extends Chart {
        protected portions: PieData[] = [];

        /**
         * Constructor
         * @param el string
         * @param options Options
         */
        constructor(el: string, options: Options) {
            super(el, options);
        }

        public addPortion(portion: PieData): void {
            this.portions.push(portion);
        }

        /**
         * cleanupTip removes any tip of the chart
         * @return {void}
         */
        public cleanupTip(): void {
            super.cleanupTip();
        }

        /**
         * Draw draws the chart
         * @return {void}
         */
        public draw(): void {
            const width = this.width;
            const height = this.height;
            const radius = Math.min(width, height) / 2;

            var data = this.portions;

            const svg = this.svg
                .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                .append("g")
                    .attr("transform", `translate(${width / 2}, ${height / 2})`);

            // Compute the colors of all the parts
            var colors = [];
            for (var portion of this.portions)
                colors.push(portion.color);

            const color = d3.scaleOrdinal(colors);

            const pie = d3.pie()
                .value(function(d) { return d.data; })
                .sort(null);

            const arc = d3.arc()
                .innerRadius(0) // Set to positive number for donut
                .outerRadius(radius);

            const path = svg.selectAll("path")
                .data(pie(data));

            // We need to store the context here as we won't bind the functions
            // to it (we need the event'ed elements in the callbacks)
            var t = this;
            path.enter().append("path")
                .attr("fill", function(d, i) { return color(i); })
                .attr("d", arc)
                .on("mouseover", function(d) { if (this.options.tip) this.options.tip.offset(function() {
                    return [0, 0];
                  }).show(d.data); }.bind(this))
                .on("mouseout",  function(d) { if (this.options.tip) this.options.tip.hide(d.data); }.bind(this))
                .on("click", function(d) {
                    if (this.options.onclick) this.options.onclick(d.data);
                }.bind(this))
                .attr("class", this.class("pie-portion"))
                .attr("stroke", "white")
                .attr("stroke-width", "2px")
                .each(function(d) { this._current = d; });
        }
    }
}