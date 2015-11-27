// Update torque layer with the data just inside this polygon
function updateTorqueLayer(torqueLayer, pol_pgis){

    var newSQL;

    if (pol_pgis) {
        newSQL = "with pol as (" + pol_pgis + ")  select a.* from tracking_eric a, pol b where st_contains(b.the_geom, a.the_geom)"
        console.log(newSQL);
        torqueLayer.setSQL(newSQL);
    }
}

// Update the info window with data from CartoDB
function updateInfoWindow(info, pol_pgis) {

    var sql = new cartodb.SQL({user: 'libregis'});

    sql.execute("with pol as (" + pol_pgis + ")  select a.* from tracking_eric a, pol b where st_contains(b.the_geom, a.the_geom)")

    .done(function(data) {
        console.log(data.rows);
        info.update(data.rows);
    })

    .error(function(errors) {
        console.log("errors:" + errors);
    })

}

// Build a HTML table with the data coming from CartoDB
function buildInfoWindowContent(data) {

    if (data == 'waiting') {
        return 'Loading data. Please wait...'
    }


    var htmlDiv = "<div class='graph' style='right: 400px; top: 400px;'><div class='graph-inner'>";

    var speed = 0;
    var time = 0;
    var distance = 0;

    for(var i=0; i < data.length; i++) {
      if (data[i].distance_in_meters != null)
        distance = distance + data[i].distance_in_meters;

      if (data[i].duration_in_seconds != null)
        time = time + data[i].duration_in_seconds;
    }

    speed = distance / time;

    htmlDiv += "<span class='graph-figure'>" + parseFloat(distance).toFixed(2) + " m</span>";
    htmlDiv += "<span class='graph-provider'>" + parseFloat(speed).toFixed(2) + " m/s </span>";

    htmlDiv += "<span class='bus'>Avg. Speed</span> <span class='amount'>Total distance</span></div></div>";

    console.log('Data: ' + data);

    return htmlDiv;

}


// Limit the view to inside the polygon
function adaptViewToPol(e, drawnItems, map, info, torqueLayer) {

    var type = e.layerType,
    layer = e.layer;

    switch(type) {
        case 'polygon':
        case 'rectangle':

            var coords = layer.getLatLngs();

            var southWest = L.latLng(coords[1].lat, coords[1].lng);
            var northEast = L.latLng(coords[3].lat, coords[3].lng);

            var pol_pgis = "select ST_SetSRID(ST_MakeBox2D(ST_Point(" + coords[1].lng + ", " + coords[1].lat  + "),ST_Point(" + coords[3].lng + "," + coords[3].lat + ")),4326) as the_geom";

        case 'circle':
            // TODO: Get center and radius and build buffer
            // Check http://goo.gl/YX9Od4

            break;

        default:
            // Do nothing
            console.log(type);
            break;
    }

    // Update the SQL of the Torque layer
    updateTorqueLayer(torqueLayer, pol_pgis);

    // Center the map in the polygon drawn
    var bounds = L.latLngBounds(southWest, northEast);
    map.fitBounds(bounds);

    // Update the content of the info window
    updateInfoWindow(info, pol_pgis);

    drawnItems.addLayer(layer);

}

// Main function: create map and load cdb layers
function main() {

    var defaultZoom;
    var defaultBounds;

    // Load visualization
    var viz = cartodb.createVis('map', 'https://libregis.cartodb.com/api/v2/viz/07ec5626-800f-11e5-b44f-0ef24382571b/viz.json')
        .done(function (vis, layers) {

            // To work with the native map
            var map = vis.getNativeMap();

            defaultZoom = map.getZoom();
            defaultBounds = map.getBounds();

            var torqueLayer = layers[1];

            // Add Leaflet draw stuff
            var drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            var drawControl = new L.Control.Draw({
                draw: {
                    position: 'bottomleft',
                    polygon: {
                        shapeOptions: {
                            color: 'purple'
                        },
                        allowIntersection: false,
                        drawError: {
                            color: 'orange',
                            timeout: 1000
                        },
                        showArea: true,
                        metric: false,
                        repeatMode: true
                    },

                    rect: {
                        shapeOptions: {
                            color: 'green'
                        },
                    },

                    polyline: false,// Turns off this drawing tool
                    circle: false,
                    marker: false

                },
                edit: {
                    featureGroup: drawnItems
                }

            });

            map.addControl(drawControl);

            // Hidden div which will be enabled to avoid drawing more than one polygon or rectangle
            $('.leaflet-draw-section:first').append('<div class="leaflet-draw-inner-toolbar" title="Polygon already added"></div>');


            // Custom info window
            var info = L.control();

            info.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
                this.update();
                return this._div;
            };

            // method that we will use to update the control based on feature properties passed
            info.update = function (data) {
                this._div.innerHTML = '<h4>Speed and distance</h4>' +  (data ?
                    buildInfoWindowContent(data)
                    : 'Draw a polygon or a rectangle to select a zone');
            };

            info.addTo(map);


            // Each time we draw a polygon or rectangle, get the data just inside that pol/rect
            map.on('draw:created', function (e) {
                // Show waiting message in infowindow
                info.update('waiting');
                adaptViewToPol(e, drawnItems, map, info, torqueLayer);

                // disable the create polygon tools
                $('.leaflet-draw-inner-toolbar').show();
            });

            // Each time we draw a polygon or rectangle, get the data just inside that pol/rect
            map.on('draw:edited', function (e) {
                // do nothing
                // TODO: I just forbid edit by hiding the button. Improve this.
            });


            map.on('draw:deleted', function (e) {
                console.log("Reset");

                // Reset
                updateTorqueLayer(torqueLayer);
                info.update();

                map.fitBounds(defaultBounds);
                map.setZoom(defaultZoom);

                // enable the create polygon tools
                $('.leaflet-draw-inner-toolbar').hide();
            });
        });
}
