# picasso

Picasso handles all the front-end charts rendering shown on the ProcessOut dashboard (https://dashboard.processout.com). It heavily uses D3.

#### Overview
Although already heavily used in production, no public documentation has been written yet. Please feel free to create issues for usage directions.

#### Features
Supported charts currently are:
- Line charts (with multi lines support)
- Bar charts (with multi bars support)
- Split bars
- Line & Bar charts
- Map charts

Axises are automatically scaled depending on the data provided when drawing the chart. The styling of the charts can be fully 
customized using CSS.

Some flexibility is also provided to customize tooltips, which currently work using callback functions.

Bar charts support click events.

