## How to create fake GPS points from lines in CartoDB

* Create an empty CartoDB dataset, and draw lines representing routes
* Put the same name to all lines that represent the same routes
* Apply this query to generate points from routes

```sql
select (pr).geom as the_geom_webmercator, name from (select st_dumppoints(st_segmentize(the_geom_webmercator, 1)) as pr, name from rutas order by name) as foo
```

*rutas* is the name of your table. And the second parameter of st_segmentize (1, here) controls the number of
generated points. The lower, more points will be generated.

* Generate new table from that query
* Add a new column of type *date* to that table, and populate it:

```sql
with dates as (SELECT row_number() over (order by dt) as id, dt FROM generate_series(timestamp '2015-11-01T08:00:00Z', timestamp '2015-11-01T08:00:00Z' + '38539 seconds'::interval, '5 second'::interval) as dt)
update fake_gps_from_rutas set dt = dates.dt from dates where dates.id = cartodb_id
```

*fake_gps_from_rutas* is the name of your table. About the 23484 seconds:

We want one point each 5 seconds (totally random decision). And the number of elements
on the table is 7708. So, 7708 * 5 = 38540. The time counting starts in 0 seconds, so,
we substract one from that quantity, and get 38539

* Generate a torque animation from that. As we have all the points *marked* with the
same name, we could even generate a category torque using that *name* column as
category. Just need one query like the one in the previous step for every category.
