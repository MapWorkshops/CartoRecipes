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
), -- generate lines using the geographic maxmimum circle
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
