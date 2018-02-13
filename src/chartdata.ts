/// <reference path="_references.ts" />

/**
 * Picasso namespace
 */
namespace Picasso {
    /**
     * GradientColor represents a gradient color
     */
    export class GradientColor {
        /**
         * Offset of the color, must end with %. Is automatically computed when
         * using the value property instead
         * @property {string}
         */
        public offset: string;
        /**
         * Value at which the color should start
         * @property {number}
         */
        public value: number;
        /**
         * Color in the gradient
         * @property {string}
         */
        public color: string;
    }

    /**
     * LineData represents a dot in a line-chart
     */
    export class LineData {
        /**
         * Key of the dot (such as its date)
         * @property {any}
         */
        public key: any;
        /**
         * Value of the dot
         * @property {number}
         */
        public value: number;

        /**
         * Name of the line chart containing this value point
         * @property {string}
         */
        public lineName: string;
    }

    /**
     * BarData represents a bar in a bar-chart
     */
    export class BarData {
        /**
         * Key of the bar (such as a category)
         * @property {any}
         */
        public key: any;
        /**
         * Color of the chart. Can be a function, a color, or null
         * @property {any?}
         */
        public color?: any;
        /**
         * Total of all the attributes of the bar
         * @property {number}
         */
        public total: number;
    }
}