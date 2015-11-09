function currentUser() {
    return currentEndpoint().match(/http[s]*:\/\/([^.]*).*/)[1];
}

function currentEndpoint() {
    return "http://libregis.cartodb.com/api/v1/map";
}


function main() {

    // Create map
    var map = new L.Map('map', {
        zoomControl: true,
        drawnControl: true,
        center: [37.383333, -5.983333],
        zoom: 11
    });

    // Add CartoDB basemaps
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '<a href="http://cartodb.com">CartoDB</a> © 2014',
        maxZoom: 18
    }).addTo(map);


    // Add drawn controls
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    var drawControl = new L.Control.Draw({
        position: 'bottomleft',
        draw: {
            polyline: false,// Turns off this drawing tool
            marker: false,

            /*
            polygon: {
                shapeOptions: {
                    color: '#bada55'
                },
                showArea: true
            },
            */
            polygon: false,

            rectangle: {
                shapeOptions: {
                    color: '#a63b55'
                },
                showArea: true
            },

            circle: {
                shapeOptions: {
                    color: '#662d91'
                },

                showArea: true
            }


        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);


    // Handle draw actions
    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;

        var pol_pgis = null;

        switch(type) {

            // Create a Rectangle geometry in PostGIS
            case 'rectangle':
                var coords = layer.getLatLngs();

                var southWest = L.latLng(coords[1].lat, coords[1].lng);
                var northEast = L.latLng(coords[3].lat, coords[3].lng);

                var pol_pgis = "st_transform(ST_SetSRID(ST_MakeBox2D(ST_Point(" +
                    coords[1].lng + ", " + coords[1].lat  + "),ST_Point(" +
                    coords[3].lng + "," + coords[3].lat + ")),4326), 3857)";

                break;

            // Create a circle geometry in PostGIS
            case 'circle':
                var center = layer.getLatLng();

                var pol_pgis = "st_transform(geometry(st_buffer(geography(st_setsrid(st_point(" +
                    center.lng + ", " + center.lat + "), 4326)), " + layer.getRadius() + ")),3857)";

                break;

            case 'polygon':
                console.log(layer.toGeoJSON());

        }


        if (pol_pgis) {
            q = "SELECT avg((stats).mean) as m from (select st_summarystats(the_raster_webmercator, 1) as stats from foto_pnoa where st_intersects(the_raster_webmercator, " + pol_pgis +")) as foo";

            console.log("QUERY: " + q);

            var sql = new cartodb.SQL({user: 'libregis'});
            sql.execute(q)

            .done(function(data) {
                if (data.rows && data.rows.length > 0)
                    layer.bindPopup("Average raster value inside the " + type + ": " + data.rows[0].m);

                else
                    layer.bindPopup("Could not get avg value!");
            })

            .error(function(errors) {
                layer.bindPopup("Could not get avg value!");
            })
        }

        else {
            layer.bindPopup("Could not get avg value!");
        }

        drawnItems.addLayer(layer);
    });



    // Add raster layer
    var config = {
        "version": "1.3.1",
        "layers": [
            {
                "type": "cartodb",
                "options": {
                    "sql": "select * from foto_pnoa",
                    "cartocss": "#foto_pnoa {raster-opacity: 0.5;}",
                    "cartocss_version": "2.3.0",
                    "geom_column": "the_raster_webmercator",
                    "geom_type": "raster"
                }
            }
        ]
    };

    var request = new XMLHttpRequest();
    request.open('POST', currentEndpoint(), true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.onload = function() {
        if (this.status >= 200 && this.status < 400){
            var layergroup = JSON.parse(this.response);

            var tilesEndpoint = currentEndpoint() + '/' + layergroup.layergroupid + '/{z}/{x}/{y}.png';

            var protocol = 'https:' == document.location.protocol ? 'https' : 'http';
            if (layergroup.cdn_url && layergroup.cdn_url[protocol]) {
                var domain = layergroup.cdn_url[protocol];
                if ('http' === protocol) {
                    domain = '{s}.' + domain;
                }
                tilesEndpoint = protocol + '://' + domain + '/' + currentUser() + '/api/v1/map/' + layergroup.layergroupid + '/{z}/{x}/{y}.png';
            }

            rasterLayer = L.tileLayer(tilesEndpoint, {
                maxZoom: 18
            }).addTo(map);
        } else {
            throw 'Error calling server: Error ' + this.status + ' -> ' + this.response;
        }
    };
    request.send(JSON.stringify(config));
}
