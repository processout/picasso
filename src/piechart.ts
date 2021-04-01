import * as d3 from "d3";
import { Chart, Options } from "./chart";
import { PieSlice } from "./chartdata";

/**
 * MapChart is the class handling the drawings of a map chart
 */
export class PieChart extends Chart {
  /**
   * labelMinSlice is the label minimum slice size (between 0 and 1)
   * for the label to be shown
   * @property {number}
   */
  protected labelMinSlice = 0.05;

  /**
   * slices contains the slices of the pie chart
   * @property {PieSlice[]}
   */
  protected slices: PieSlice[];

  /**
   * Constructor
   * @param el string
   * @param options Options
   */
  constructor(el: string, options: Options) {
    super(el, options);

    this.slices = [];
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
   * reset removes all the chart slices
   * @return {void}
   */
  public reset(): void {
    this.slices = [];
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

    // Compute the colors and total of all the slices
    var colors = [];
    let total = 0;
    for (var slice of data) {
      colors.push(slice.color);
      total += slice.data;
    }

    const color = d3.scaleOrdinal(colors);

    const pie = d3
      .pie()
      .sort(null)
      .value(function (d) {
        return d.data;
      });

    const arc = d3
      .arc()
      .innerRadius(0) // Set to positive number for donut
      .outerRadius(radius);

    const path = svg.selectAll("path").data(pie(data));

    var arcs = path.enter().append("g");

    arcs
      .append("path")
      .attr("fill", function (d, i) {
        return color(i);
      })
      .attr("d", arc)
      .attr("class", this.class("pie-slice"));

    // Add labels
    const arcLabel = d3
      .arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.7);
    arcs
      .append("text")
      .attr("transform", function (d) {
        return "translate(" + arcLabel.centroid(d) + ")";
      })
      .attr("text-anchor", "middle")
      .text(function (d) {
        if (d.data.data / total > this.labelMinSlice) return d.data.data;
        return "";
      })
      .attr("class", this.class("pie-label"));

    // Add tooltips, if any
    if (this.options.tooltip) {
      var t = this;
      arcs
        .selectAll("path,text")
        .on("mouseover", function (d, i, n) {
          if (this.nodeName != "text") {
            // We want to find the text element for the tooltip
            // to be properly placed
            this.parentElement
              .querySelector("text")
              .dispatchEvent(new Event("mouseover"));
            return;
          }
          t.options.tooltip.show(d.data, n[i]);
        })
        .on(
          "mouseout",
          function (d) {
            t.options.tooltip.hide(d.data);
          }.bind(this)
        );
    }

    // Add onclick, if any
    if (this.options.onclick) {
      arcs.on(
        "click",
        function (d) {
          this.options.onclick(d.data);
        }.bind(this)
      );
    }
  }
}
