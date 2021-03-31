import * as d3 from "d3";
import { Chart, Options } from "./chart";
import { BarData, GradientColor, LineData } from "./chartdata";

/**
 * Line represents a line drawn on a line-chart
 */
export class Line {
  public name: string;
  public color: string;
  public colors?: GradientColor[];
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
  public tip?: (d: any) => string;
  public tooltip?: any;
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
   * linesTip contains the tip to be shown for lines drawn on the chart
   * @property {any?}
   */
  protected linesTip?: (d: any) => string;
  protected linesTooltip?: any;

  /**
   * Constructor
   * @param el {string}
   * @param options {Options}
   */
  constructor(el: string, options: Options) {
    super(el, options);

    if (options.linesTip)
      this.linesTooltip = this.initTooltip(options.linesTip);
  }

  /**
   * Cleanup removes any tip of the chart
   * @return {void}
   */
  public cleanupTip(): void {
    super.cleanupTip();
    for (var bar of this.bars) {
      if (bar.tip) {
        bar.tooltip.destroy();
        bar.tooltip = this.initTooltip(bar.tip);
      }
    }
    if (this.linesTip) {
      this.linesTooltip.destroy();
      this.linesTooltip = this.initTooltip(this.linesTip);
    }
  }

  /**
   * reset removes all the chart lines and bars
   * @return {void}
   */
  public reset(): void {
    this.resetLines();
    this.resetBars();
  }

  /**
   * reset removes all the chart lines
   * @return {void}
   */
  public resetLines(): void {
    this.lines = [];
  }

  /**
   * reset removes all the chart bars
   * @return {void}
   */
  public resetBars(): void {
    this.bars = [];
  }

  /**
   * addLine adds a line to the BarLineChart
   * @param line {Line}
   * @return {void}
   */
  public addLine(line: Line): void {
    line.name = line.name || "";
    line.colors = line.colors || null;
    line.dotOutsideSize = line.dotOutsideSize == null ? 5 : line.dotOutsideSize;
    line.dotInsideSize = line.dotInsideSize == null ? 3 : line.dotInsideSize;

    for (var point of line.data) point.lineName = line.name;

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
    bar.tooltip = this.initTooltip(bar.tip);
    bar.columns = [];
    // Clean up columns
    for (var k in bar.data[0]) {
      if (
        k == "key" ||
        k == "color" ||
        k == "total" ||
        (k != "" && k[0] == "_")
      )
        continue;

      bar.columns.push(k);
    }

    for (var d of bar.data) {
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
    this.cleanupTip();
  }

  /**
   * Draw draws the chart
   * @return {void}
   */
  public draw(): void {
    if (this.lines.length <= 0 && this.bars.length <= 0) return;

    // Compute if the chart is going to be time scaled or stacked bars
    var timescaled = false;
    var stackedBars = false;
    this.lines.forEach(function (l: Line) {
      l.data.forEach(function (d: LineData) {
        if (d.key instanceof Date) timescaled = true;

        if (timescaled && !(d.key instanceof Date))
          throw new Error(
            "The lines provided contained both Date and not dates for its keys. The keys should either all be Dates, or none."
          );
      }, this);
    }, this);
    this.bars.forEach(function (b: Bar) {
      stackedBars = stackedBars || b.columns.length > 1;

      b.data.forEach(function (d: BarData) {
        if (d.key instanceof Date) timescaled = true;
        else if (timescaled)
          throw new Error(
            "The bars provided contained both Date and not dates for its keys. The keys should either all be Dates, or none."
          );
      }, this);
    }, this);

    // Add background to chart
    this.svg
      .append("g")
      .append("rect")
      .attr("class", "chart-background")
      .attr("height", this.height + this.options.xAxisMargin * 2)
      .attr(
        "width",
        this.width + this.options.marginLeft + this.options.marginRight
      )
      .attr(
        "transform",
        this.translate(-this.options.marginLeft, -this.options.xAxisMargin)
      );

    // Define our axis
    var x;
    var xBand = d3.scaleBand().range([0, this.width]).padding(0.1); // no padding
    if (timescaled) x = d3.scaleTime().range([0, this.width]);
    else x = d3.scaleBand().range([0, this.width]).padding(0.1);
    var y = d3.scaleLinear().range([this.height, 0]);

    // Define our value line and curve
    var valueline = d3
      .line()
      .x(function (d) {
        return x(d.key);
      })
      .y(function (d) {
        return y(d.value);
      })
      .curve(d3.curveCardinal.tension(1));

    // Clean up our data sets
    this.lines.forEach(function (l: Line) {
      l.data.forEach(function (d: LineData) {
        d.value = +d.value;
      }, this);
    }, this);

    // Scale the range of the data
    var minValue = +Infinity;
    var maxValue = -Infinity;
    var keys: Array<any> = [];
    var keysRaw: Array<any> = [];
    var nbBars = 0;
    if (this.bars.length > 0) {
      for (var bar of this.bars) {
        for (var bardata of bar.data) {
          if (keys.indexOf(bardata.key) < 0) {
            keys.push(bardata.key);
            keysRaw.push(bardata.key);
          }
          maxValue = this.max(bardata.total, maxValue);
          minValue = this.min(bardata.total, minValue);
          nbBars++;
        }
      }
    }
    if (this.lines.length > 0) {
      for (var line of this.lines) {
        for (var linedata of line.data) {
          if (linedata.key instanceof Date) {
            if (keys.indexOf(linedata.key.toString()) < 0) {
              keys.push(linedata.key.toString());
              keysRaw.push(linedata.key);
            }
          } else {
            if (keys.indexOf(linedata.key) < 0) {
              keys.push(linedata.key);
              keysRaw.push(linedata.key);
            }
          }
          maxValue = this.max(linedata.value, maxValue);
          minValue = this.min(linedata.value, minValue);
        }
      }
    }

    minValue -= minValue * 0.1;
    maxValue += maxValue * 0.1;
    if (this.options.min != null) minValue = this.options.min;
    if (this.options.max != null) maxValue = this.options.max;
    xBand.domain(keys);

    // If we only have one bar, we don't want to scale the charts
    if (nbBars == 1) minValue = 0;

    // If we have stacked bar charts, we don't want to scale the charts
    // either
    if (stackedBars) minValue = 0;

    if (timescaled) {
      keysRaw.sort(function (a, b) {
        return a.getTime() - b.getTime();
      });
      keys = []; // Reset the keys
      for (var keyraw of keysRaw) keys.push(keyraw.toString());
      x.domain(
        d3.extent(keysRaw, function (d) {
          return d;
        })
      );
    } else x.domain(keys);
    y.domain([minValue, maxValue]).nice();

    // Add our bar (if any)
    var xbar;
    if (this.bars.length > 0) {
      var bd = 10;
      if (!timescaled) bd = x.bandwidth();
      else bd = xBand.bandwidth();
      xbar = d3
        .scaleBand()
        .padding(0.05)
        .domain(
          this.bars.map(function (d, id) {
            return id;
          })
        )
        .rangeRound([0, bd]);
    }
    this.bars.forEach(function (b: Bar, id) {
      var z = d3.scaleOrdinal().range(b.colors).domain(b.columns);
      this.svg
        .append("g")
        .selectAll(".bar-group")
        .data(d3.stack().keys(b.columns)(b.data))
        .enter()
        .append("g")
        .attr("class", "bar-group")
        .attr("fill", function (d) {
          return z(d.key);
        })
        .selectAll(".bar")
        .data(function (d) {
          return d;
        })
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function (d) {
          var tmp = x(d.data.key);
          if (timescaled) tmp = xBand(d.data.key);
          return tmp + xbar(id);
        })
        .attr("y", function (d) {
          return y(d[1]);
        })
        .attr(
          "height",
          function (d) {
            let y0 = y(minValue);
            if (stackedBars) y0 = y(d[0]);
            return this.max(0, y0 - y(d[1]));
          }.bind(this)
        )
        .attr("width", xbar.bandwidth())
        .attr(
          "fill",
          function (d) {
            if (d.data.color && this.isFunction(d.data.color)) {
              return d.data.color(d);
            }
            if (d.data.color) {
              return d.data.color;
            }
            return;
          }.bind(this)
        );
    }, this);

    // Compute a possible offset for our lines
    var offset = 0;
    if (!timescaled) offset = x.bandwidth() / 2;

    // Loop over our lines
    this.lines.forEach(function (l: Line) {
      // Add the valueline path
      var drawnLine = this.svg
        .append("g")
        .attr("transform", this.translate(offset, 0))
        .append("path")
        .data([l.data])
        .attr("class", this.class("line") + " " + l.name)
        .attr("d", valueline);
      // Add support for custom/gradient colors on lines
      if (l.color) {
        drawnLine.attr("style", `stroke: ${l.color}`);
      } else if (l.colors) {
        // Correctly format our colors
        for (var color of l.colors) {
          if (color.value) {
            color.offset = Math.floor((color.value / maxValue) * 100) + "%";
          }
        }

        var id = Math.floor(Math.random() * 100000);
        this.svg
          .append("linearGradient")
          .attr("id", this.class("line-gradient-" + id))
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", y(0))
          .attr("x2", 0)
          .attr("y2", y(maxValue))
          .selectAll("stop")
          .data(l.colors)
          .enter()
          .append("stop")
          .attr("offset", function (d) {
            return d.offset;
          })
          .attr("stop-color", function (d) {
            return d.color;
          });
        drawnLine.attr(
          "style",
          "stroke: url(#" + this.class("line-gradient-" + id) + ")"
        );
      }

      // Add point dots
      this.svg
        .selectAll("div") // assumed to be empty
        .data(l.data)
        .enter()
        .append("circle")
        .attr("class", this.class("point-circle-outside"))
        .attr("r", l.dotOutsideSize)
        .attr("cx", function (d: LineData) {
          return x(d.key) + offset;
        })
        .attr("cy", function (d: LineData) {
          return y(d.value);
        });
      this.svg
        .selectAll("div") // assumed to be empty
        .data(l.data)
        .enter()
        .append("circle")
        .attr("class", this.class("point-circle-inside"))
        .attr("r", l.dotInsideSize)
        .attr("cx", function (d: LineData) {
          return x(d.key) + offset;
        })
        .attr("cy", function (d: LineData) {
          return y(d.value);
        });
    }, this);

    // Add our line tooltips if there's no bar charts on this chart
    // (otherwise we'd overload the chart with tooltip collision boxes)
    if (this.lines.length > 0 && this.bars.length == 0) {
      var cl = this.class("line-collision");

      this.svg
        .selectAll(cl)
        .data(keysRaw)
        .enter()
        .append("rect")
        .attr("class", cl)
        .attr("fill", "transparent")
        .attr("x", function (d) {
          return x(d) - xBand.bandwidth() / 2;
        })
        .attr("y", function (d) {
          return y(maxValue);
        })
        .attr("height", function (d) {
          return y(minValue) - y(maxValue);
        })
        .attr("width", xBand.bandwidth())
        .on(
          "mouseover",
          function (d) {
            var vals: Array<any> = [];
            for (var line of this.lines)
              for (var val of line.data)
                if (
                  ((val.key instanceof Date &&
                    val.key.toString() == d.toString()) ||
                    val.key == d) &&
                  this.linesTooltip
                )
                  vals.push(val);
            if (this.linesTooltip && vals.length > 0)
              this.linesTooltip.show.call(this, vals);
          }.bind(this)
        )
        .on(
          "mouseout",
          function (d) {
            var vals: Array<any> = [];
            for (var line of this.lines)
              for (var val of line.data)
                if (
                  ((val.key instanceof Date &&
                    val.key.toString() == d.toString()) ||
                    val.key == d) &&
                  this.linesTooltip
                )
                  vals.push(val);
            if (this.linesTooltip && vals.length > 0)
              this.linesTooltip.hide.call(this, vals);
          }.bind(this)
        );
    }

    // And add the tooltip of the bars as well
    this.bars.forEach(function (b: Bar, id) {
      if (!b.tooltip && !b.onclick) return;

      var cl = this.class("bar-collision");
      if (b.onclick) cl += " " + this.class("bar-collision-onclick");

      this.svg
        .append("g")
        .attr("fill", "transparent")
        .selectAll(this.dotClass("bar-collision"))
        .data(b.data)
        .enter()
        .append("rect")
        .attr("class", cl)
        .attr("x", function (d) {
          var tmp = x(d.key);
          if (timescaled) tmp = xBand(d.key);
          return tmp + xbar(id);
        })
        .attr("y", function (d) {
          return y(maxValue);
        })
        .attr("height", function (d) {
          return y(0) - y(maxValue);
        })
        .attr("width", xbar.bandwidth())
        .on(
          "mouseover",
          function (d) {
            if (b.tooltip) b.tooltip.show(d);
          }.bind(this)
        )
        .on(
          "mouseout",
          function (d) {
            if (b.tooltip) b.tooltip.hide(d);
          }.bind(this)
        )
        .on(
          "click",
          function (d) {
            if (b.onclick) b.onclick(d);
          }.bind(this)
        );
    }, this);

    // Add the X Axis
    if (this.options.xLegendBottom) {
      this.svg
        .append("g")
        .attr("class", "x-axis")
        .attr(
          "transform",
          this.translate(0, this.height + this.options.xAxisMargin)
        )
        .call(d3.axisBottom(x).ticks(this.options.xAxisTicks));
      if (!timescaled)
        this.svg.selectAll(".tick text").call(this.wrap, x.bandwidth());
    }

    // Add the Y Axis
    if (this.options.yLegendLeft) {
      this.svg
        .append("g")
        .attr("class", "y-axis")
        .attr("transform", this.translate(-this.options.yAxisMargin, 0))
        .call(
          d3
            .axisLeft(y)
            .ticks(this.options.yAxisTicks)
            .tickFormat(this.options.yAxisFormatter)
        );
    }
    if (this.options.yLegendRight) {
      this.svg
        .append("g")
        .attr("class", "y-axis")
        .attr(
          "transform",
          this.translate(this.width + this.options.yAxisMargin, 0)
        )
        .call(
          d3
            .axisRight(y)
            .ticks(this.options.yAxisTicks)
            .tickFormat(this.options.yAxisFormatter)
        );
    }
  }
}
