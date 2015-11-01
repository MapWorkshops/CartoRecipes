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

    var sql = new cartodb.SQL({user: 'jorgearevalo'});

    sql.execute("with pol as (" + pol_pgis + ") SELECT providerid, count(distinct vehicleid) as number_of_vehicles, '2014-10-08' as start_date, '2014-10-08' as end_date, '15:30' as start_time, '17:30 PM' as end_time FROM busrestrictedzone a, pol b where a.the_geom && b.the_geom and timestamplocal between '2014-10-08T15:30:40+02:00' and '2014-10-08T17:30:32+02:00' group by providerid")

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


    var htmlDiv = "<div class='graph' style='right: 400px; top: 400px;'><div class='graph-inner'><ul class='graph-lst'>";

    for(var i=0; i < data.length; i++) {

        var h = parseInt(data[i].number_of_vehicles) * 3;

        htmlDiv += "<li style='height: " + h + "px'>";
        htmlDiv += "<span class='graph-figure'>" + data[i].number_of_vehicles + "</span>";
        htmlDiv += "<span class='graph-provider'>" + data[i].providerid + "</span>";
        htmlDiv += "</li>";
    }

    htmlDiv += "</ul><span class='bus'>bus line</span> <span class='amount'>amount</span></div></div>";

    console.log('Data: ' + data);

    return htmlDiv;

    /*
    // Headers
    var htmlTable = "<table style><tr><th>Start date</th><th>End date</th><th>Start time</th><th>End time</th><th>Provider ID</th><th>Number of vehicles</th></tr>";

    console.log('Data: ' + data);

    // Now the rest of the elements
    for(var i=0; i < data.length; i++) {
        htmlTable += '<tr>';
        htmlTable += '<td>' + data[i].start_date + '</td>';
        htmlTable += '<td>' + data[i].end_date + '</td>';
        htmlTable += '<td>' + data[i].start_time + '</td>';
        htmlTable += '<td>' + data[i].end_time + '</td>';
        htmlTable += '<td>' + data[i].providerid + '</td>';
        htmlTable += '<td>' + data[i].number_of_vehicles + '</td>';
        htmlTable += '</tr>';
    }


    htmlTable += "</table>";

    return htmlTable;
    */
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
    //updateInfoWindow(info, pol_pgis);

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
                this._div.innerHTML = '<h4>Number of buses since 15:30 to 17:30</h4>' +  (data ?
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
