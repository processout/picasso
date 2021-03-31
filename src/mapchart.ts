import * as d3 from "d3";
import { world } from "./data/world";
import { Chart, Options } from "./chart";

/**
 * Country represents a country drawn on the map
 */
export class Country {
  /**
   * Name of the country, using the ISO format with 3 characters
   * @property {string}
   */
  public name: string;
  /**
   * Color to be used for the country. Can be a function, a color or null
   * @property {any?}
   */
  public color: any;
  /**
   * Color to be used for the country borders. Can be a function, a
   * color or null
   * @property {any?}
   */
  public borderColor: any;
}

/**
 * MapChart is the class handling the drawings of a map chart
 */
export class MapChart extends Chart {
  /**
   * Countries contains the list of the countries data to be shown
   * on the map
   * @property {Country[]}
   */
  protected countries: Country[];

  /**
   * Constructor
   * @param el string
   * @param options Options
   */
  constructor(el: string, options: Options) {
    super(el, options);

    this.countries = [];
  }

  /**
   * cleanupTip removes any tip of the chart
   * @return {void}
   */
  public cleanupTip(): void {
    super.cleanupTip();
  }

  /**
   * Add a country info to the map
   * @param country Country
   * @return {void}
   */
  public addCountry(country: Country): void {
    country.name = country.name || "";
    country.color = country.color || null;

    this.countries.push(country);
  }

  /**
   * reset removes all the chart countries
   * @return {void}
   */
  public reset(): void {
    this.countries = [];
  }

  /**
   * Find a country in the ones submitted to the map by its 3 char ID
   * @param name {string}
   * @return {Country}
   */
  protected findCountry(name: string): Country {
    for (var c of this.countries) {
      if (c.name == name) return c;
    }

    return null;
  }

  /**
   * Draw draws the chart
   * @return {void}
   */
  public draw(): void {
    var projection = d3.geoMercator().fitSize([this.width, this.height], world);
    var path = d3.geoPath().projection(projection);

    this.svg
      .append("g")
      .attr("class", "countries")
      .selectAll("path")
      .data(world.features)
      .enter()
      .append("path")
      .attr(
        "class",
        function (d) {
          return this.class("country") + " " + this.class(d.id);
        }.bind(this)
      )
      .attr("d", path)
      .style(
        "fill",
        function (d) {
          var country = this.findCountry(d.id);
          if (!country) return;

          if (country.color && this.isFunction(country.color)) {
            return country.color(country);
          }
          if (country.color) {
            return country.color;
          }
          return;
        }.bind(this)
      )
      .on(
        "mouseover",
        function (d) {
          var country = this.findCountry(d.id);
          if (!country) return;
          if (!this.options.tooltip) return;
          this.options.tooltip.show(country);
        }.bind(this)
      )
      .on(
        "mouseout",
        function (d) {
          var country = this.findCountry(d.id);
          if (!country) return;
          if (!this.options.tooltip) return;
          this.options.tooltip.hide(country);
        }.bind(this)
      )
      .on(
        "click",
        function (d) {
          var country = this.findCountry(d.id);
          if (!country) return;
          if (!this.options.onclick) return;
          this.options.onclick(country);
        }.bind(this)
      );
  }
}
