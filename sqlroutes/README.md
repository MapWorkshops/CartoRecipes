# Routes for planes

Generate routes over curved lines that join points.

We start from:
* [CSV with airport locations](https://gist.githubusercontent.com/pramsey/8eae41eae99cb07fd9a7/raw/6cbc092b831a9c5d3c884400549a9ef64426db76/airports.csv)
* [CSV with routes between airports](https://gist.githubusercontent.com/pramsey/8eae41eae99cb07fd9a7/raw/6cbc092b831a9c5d3c884400549a9ef64426db76/routes.csv)

Both data files have been included as zip file to download.

The trick here is: *Generate the route lines using the ST_MakeLine function, converting the output to a geography type, split it using ST_Segmentize and transform it back to a geometry in Web Mercator projection. This chain produces lines that walks the maximum circle between two points.*.

Quoted from here: https://gist.github.com/jsanz/8aeb48a274e3b787ca57

Inspiration here http://blog.cartodb.com/jets-and-datelines/
