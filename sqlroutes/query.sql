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
