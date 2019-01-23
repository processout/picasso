/// <reference path="_references.ts" />

/**
 * Picasso namespace
 */
namespace Picasso {

    /**
     * MapChart is the class handling the drawings of a map chart
     */
    export class PieChart extends Chart {
        /**
         * slices contains the slices of the pie chart
         * @property {PieSlice[]}
         */
        protected slices: PieSlice[] = [];

        /**
         * Constructor
         * @param el string
         * @param options Options
         */
        constructor(el: string, options: Options) {
            super(el, options);
        }

        /**
         * addSlice adds a slice to the pie chart
         * @param slice PieSlice
         */
        public addSlice(slice: PieSlice): void {
            this.slices.push(slice);
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

            var data = this.slices;

            const svg = this.svg
                .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                .append("g")
                    .attr("transform", `translate(${width / 2}, ${height / 2})`);

            // Compute the colors of all the parts
            var colors = [];
            for (var slice of data)
                colors.push(slice.color);

            const color = d3.scaleOrdinal(colors);

            const pie = d3.pie()
                .sort(null)
                .value(function(d) { return d.data; });

            const arc = d3.arc()
                .innerRadius(0) // Set to positive number for donut
                .outerRadius(radius);

            const path = svg.selectAll("path")
                .data(pie(data));

            var arcs = path.enter().append("g");

            arcs.append("path")
                .attr("fill", function(d, i) { return color(i); })
                .attr("d", arc)
                .attr("class", this.class("pie-slice"));

            // Add labels
            const arcLabel = d3.arc()
                .innerRadius(radius*0.7)
                .outerRadius(radius*0.7);
            arcs.append("text")
                .attr("transform", function(d) {
                    return "translate(" + arcLabel.centroid(d) + ")";
                })
            .attr("text-anchor", "middle")
            .text(function(d) { return d.data.data; })
            .attr("class", this.class("pie-label"));

            // Add tooltips, if any
            if (this.options.tip) {
                var t = this;
                arcs.selectAll("path,text").
                    on("mouseover", function(d) {
                        if (this.nodeName != "text") {
                            // We want to find the text element for the tooltip
                            // to be properly placed
                            this.parentElement.querySelector("text")
                                .dispatchEvent(new Event("mouseover"));
                            return;
                        }
                        t.options.tip.show(d.data);
                    })
                    .on("mouseout", function(d) {
                        t.options.tip.hide(d.data);
                    }.bind(this));
            }

            // Add onclick, if any
            if (this.options.onclick) {
                arcs.on("click", function(d) {
                    this.options.onclick(d.data);
                }.bind(this))
            }
        }
    }
}