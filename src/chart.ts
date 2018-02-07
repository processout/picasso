/// <reference path="_references.ts" />

var d3: any;

/**
 * Picasso namespace
 */
namespace Picasso {
    /**
     * Options represents a chart options
     */
    export class Options {
        /**
         * Classes & IDs inside the svg prefix
         * @property {string}
         */
        public prefix: string;
        /**
         * Top margin inside the svg
         * @property {number}
         */
        public marginTop: number;
        /**
         * Right margin inside the svg
         * @property {number}
         */
        public marginRight: number ;
        /**
         * Bottom margin inside the svg
         * @property {number}
         */
        public marginBottom: number;
        /**
         * Left margin inside the svg
         * @property {number}
         */
        public marginLeft: number;
        /**
         * Minimum value of the chart. Can be null to be auto scaled
         * @property {number?}
         */
        public min?: number;
        /**
         * Maximum value of the chart. Can be null to be auto scaled
         * @property {number?}
         */
        public max?: number;
        /**
         * Show or not the y axis legend on the left
         * @property {boolean}
         */
        public yLegendLeft: boolean;
        /**
         * Show or not the y axis legend on the right
         * @property {boolean}
         */
        public yLegendRight: boolean;
        /**
         * Show or not the x axis legend on the bottom
         * @property {boolean}
         */
        public xLegendBottom: boolean;
        /**
         * Margin for the x axis legend
         * @property {number}
         */
        public xAxisMargin: number;
        /**
         * Margin for the y axis legend
         * @property {number}
         */
        public yAxisMargin: number;
        /**
         * Number of ticks shown on the x axis legend
         * @property {number}
         */
        public xAxisTicks: number;
        /**
         * Number of ticks shown on the y axis legend
         * @property {number}
         */
        public yAxisTicks: number;
        /**
         * Formatter for the y axis legend
         * @property {(d: any) => string}
         */
        public yAxisFormatter: (d: any) => string;
        /**
         * Tooltip to be shown on the chart elements. Can only be used for
         * MapChart charts
         * @property {any?}
         */
        public tip?: any;
    }

    /**
     * Chart is an abstract chart handling the svg margin and basic features
     * and options
     */
    export abstract class Chart {
        /**
         * Chart options set when creating the chart
         * @property {Options}
         */
        protected options: Options;
        /**
         * Width of the chart. Set automatically from the div dimensions
         * @property {number}
         */
        protected width: number; 
        /**
         * Height of the chart. Set automatically from the div dimensions
         * @property {number}
         */
        protected height: number;
        /**
         * SVG element created inside the given element when creating the cart
         * @property {any}
         */
        protected svg: any;
        protected root: any;

        /**
         * Constructor
         * @param el {string}
         * @param opt {Options}
         */
        constructor(el: string, opt: Options) {
            this.options = opt;

            // Set sensible defaults
            opt.prefix = opt.prefix || "";
            opt.xAxisMargin = (opt.xAxisMargin != null) ? opt.xAxisMargin : 15;
            opt.yAxisMargin = (opt.yAxisMargin != null) ? opt.yAxisMargin : 15;
            opt.marginTop = (opt.marginTop != null) ? opt.marginTop : 10;
            opt.marginRight = (opt.marginRight != null) ? opt.marginRight : opt.xAxisMargin + 40;
            opt.marginBottom = (opt.marginBottom != null) ? opt.marginBottom : opt.yAxisMargin + 30;
            opt.marginLeft = (opt.marginLeft != null) ? opt.marginLeft : opt.xAxisMargin + 40;

            opt.min = (opt.min != null) ? opt.max : 0;
            opt.max = (opt.max != null) ? opt.max : null;
            opt.yLegendLeft = (opt.yLegendLeft != null) ? opt.yLegendLeft : true;
            opt.yLegendRight = (opt.yLegendRight != null) ? opt.yLegendRight : true;
            opt.xLegendBottom = (opt.xLegendBottom != null) ? opt.xLegendBottom : true;
            opt.xAxisTicks = (opt.xAxisTicks != null) ? opt.xAxisTicks : 5;
            opt.yAxisTicks = (opt.yAxisTicks != null) ? opt.yAxisTicks : 5;
            opt.yAxisFormatter = opt.yAxisFormatter || function(d) { return d; };

            this.init(el, opt);

            opt.tip = this.initTooltip(opt.tip);
        }

        /**
         * cleanupTip removes any tip of the chart
         * @return {void}
         */
        public cleanupTip(): void {
            if (this.options.tip)
                this.options.tip.destroy();
        }

        /**
         * resetSVG resets the svg by removing everything inside
         * @return {void}
         */
        public resetSVG(): void {
            // Cleanup svg
            this.root.selectAll("*").remove();
            // Set padding
            this.svg = this.root.append("g").attr("transform", 
                this.translate(this.options.marginLeft, this.options.marginTop));
        }

        /**
         * Initializes the SVG
         * @param el {string}
         * @param opt {Options}
         * @return {void}
         */
        protected init(el: string, opt: Options): void {
            // Setup SVG
            this.root = d3.select(el);
            // Compute size
            this.width = +this.root.node().getBoundingClientRect().width - opt.marginLeft - opt.marginRight;
            this.height = +this.root.node().getBoundingClientRect().height - opt.marginTop - opt.marginBottom;
            // Set padding
            this.svg = this.root.append("g").attr("transform", 
                this.translate(opt.marginLeft, opt.marginTop));
        }

        /**
         * Initializes a tooltip and returns it, or returns null if none were
         * provided
         * @param formatter {(d :any) => string}
         */
        protected initTooltip(formatter: (d: any) => string): any {
            if (!formatter) return null;

            // Setup tooltip
            var tip = d3.tip()
                .attr("class", this.class("chart-tooltip"))
                .offset([-5, 0])
                .html(formatter);
            this.svg.call(tip);

            return tip;
        }

        /**
         * Append the class prefix (if any)
         * @param c {string}
         * @return {string}
         */
        protected class(c: string): string {
            return this.options.prefix + c;
        }

        /**
         * Append the class prefix (if any), plus the dot
         * @param c {string}
         * @return {string}
         */
        protected dotClass(c: string): string {
            return "." + this.class(c);
        }

        /**
         * Returns a string represnetation of the translate transformation
         * @param x {number}
         * @param y {number}
         * @return {string}
         */
        protected translate(x: number, y: number): string {
            return "translate("+x+","+y+")";
        }

        /**
         * Returns the minimum amount
         * @param x {number}
         * @param y {number}
         * @return {number}
         */
        protected min(x: number, y: number): number {
            if (x < y) return x;
            return y;
        }

        /**
         * Returns the maximum amount
         * @param x {number}
         * @param y {number}
         * @return {number}
         */
        protected max(x: number, y: number): number {
            if (x > y) return x;
            return y;
        }

        /**
         * Returns true if the argument is a function, false otherwise
         * @param x {any}
         * @return {any}
         */
        protected isFunction(obj: any): boolean {
            return !!(obj && obj.constructor && obj.call && obj.apply);
        }
    }
}