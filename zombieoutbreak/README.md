# Zombie outbreak

Simulate virus spreading from origin airport to several destinations

It uses the same data than the *sqlroutes* example.

Inspiration here http://blog.cartodb.com/jets-and-datelines/ and here https://team.cartodb.com/u/jsanz/viz/89f6adfe-48f8-11e5-b416-0e0c41326911/public_map

To create the lines:

```sql
SELECT a2.city AS city, r.airline,
  ST_Transform(
     ST_Segmentize(
         ST_Makeline(
           a2.the_geom,
           a1.the_geom
         )::geography,
         100000
     )::geometry,
     3857
   ) as the_geom_webmercator
FROM airports a1
JOIN routes r ON r.airport_st = a1.code_iata
JOIN airports a2 ON r.airport_end = a2.code_iata
WHERE a1.code_iata = 'MAD' AND r.codeshare IS NULL
LIMIT 1000 OFFSET 0
```

To create the balls:

```sql
with -- first data, all airports of the world
data as (
  select * from airports
), -- from Madrid
origin as (
  select * from airports where code_iata='MAD'
), -- get cities closer to 14000 Km
dests as (
  select d.*,
  (ST_Distance(
    o.the_geom::geography,
    d.the_geom::geography
  ))/1000::int distance
  from data d, origin o
  where ST_DWithin(
    o.the_geom::geography,
    d.the_geom::geography,
    14000000
  )
), -- generate lines using the geographic maximum circle
lines as(
  select
  dests.cartodb_id,  dests.name, dests.city, dests.distance,
  st_transform(
    st_segmentize(
      st_makeline(origin.the_geom, dests.the_geom )::geography,
      10000
     )::geometry,
    3857) the_geom_webmercator
  from origin,dests
), -- steps to interpolate, 300 per route, from 0 to 1
steps as (
  select lines.cartodb_id,
    generate_series(0, 300, 1 )/300.0 step
  from lines
) -- finally the points over lines
select
  -- fake autonum
  row_number() over (partition by 1) cartodb_id,
  -- fake category (needed by torque)
  lines.name, lines.city, 1 as fakecat,
  -- calculate the timing of each point starting with this date
  timestamp '2015-11-28 10:00'
    -- they will all arrive _almost_ at the same time
    -- to the destiny (1 hour would be same time)
    - interval '45 minutes' * (lines.distance/1000.0)
    -- some random exit distribution using modulus
    + interval '1 hour' * (lines.cartodb_id % 15)
    -- actual distribution across the line at 1000km/h speed
    + interval '1 hour' * (steps.step*lines.distance/(1000.0)) faketime ,
  -- get a point on the line using the step
  ST_LineInterpolatePoint(
    lines.the_geom_webmercator,
    steps.step
  ) the_geom_webmercator
from lines
join steps on lines.cartodb_id = steps.cartodb_id
order by steps.step
```


CSS for balls

```css
/** torque_cat visualization */

Map {
-torque-frame-count:256;
-torque-animation-duration:10;
-torque-time-attribute:"faketime";
-torque-aggregation-function:"CDB_Math_Mode(torque_category)";
-torque-resolution:1;
-torque-data-aggregation:linear;
}

#airports_copy{
  comp-op: source-over;
  marker-fill-opacity: 0.9;
  marker-line-color: #FFF;
  marker-line-width: 0;
  marker-line-opacity: 1;
  marker-type: ellipse;
  marker-width: 3;
  marker-fill: #0F3B82;
}
#airports_copy[value=1] {
   marker-fill: #e6344a;
}
```
