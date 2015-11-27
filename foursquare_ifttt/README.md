How to use an IFTTT recipe to put your checkins in a CartoDB map

1. Enable this recipe in IFTTT. This will add, for each 4SQ checkin, a new row
in a Google Drive sheet named IFTTT/Foursquare check-ins

2. After a checkin, you can see the content of the sheet. Need a couple of modifications

* A header line, with these values: DT|SHOUT|VENUE URL|MAP URL
* Leave just the url in the last field (starts with =IMAGE(...))


3. Now, create a new sync table in CartoDB, using Google Drive connector, and select the created sheet.
**Important**: Enable a sync period. 1 hour, for example.

4. A new table will be created, with null geometry field. We'll make 2 modifications:

* Transform the date string into a real date: TODO query
* The most important thing, a trigger to update the geometry column after insert/update:

```sql
CREATE OR REPLACE FUNCTION update_geom_column()
RETURNS trigger AS
$BODY$
DECLARE
  coords_array varchar[] := ARRAY[2];
BEGIN
  if new.map_url is null then
    raise exception 'map_url cannot be null';
  end if;

  -- Get coords using regexp_matches
  select regexp_matches(NEW.map_url, 'center=(-?[\d]*\.[\d]*),(-?[\d]*\.[\d]*)&') into coords_array;
  NEW.the_geom = CDB_LatLng(coords_array[1]::numeric, coords_array[2]::numeric);

  return NEW;
END;
$BODY$
LANGUAGE plpgsql VOLATILE
COST 100;

drop trigger if exists update_geom_column_trigger on foursquare_checkins;
CREATE TRIGGER update_geom_column_trigger
BEFORE INSERT OR UPDATE
ON foursquare_checkins
FOR EACH ROW
EXECUTE PROCEDURE update_geom_column();
```

So, every time the IFTTT recipe adds a new file to the Google Drive sheet, this file will be included
in the next synchronization (depending on the period you chose, this will happen every hour, every day...).
And every time the table is synchronized, the_geom field will be updated. NEED TESTING.

**PROBLEM: Triggers are not allowed in CartoDB sync tables, because all the tables are deleted and recreated with each sync**
Check https://github.com/CartoDB/cartodb/issues/1941

So, you'll need to manually apply this query to see your 4sq checkins in the table

```sql
with foo as (select cartodb_id, regexp_matches(map_url, 'center=(-?[\d]*\.[\d]*),(-?[\d]*\.[\d]*)&') as coords from foursquare_checkins), bar as (select cartodb_id, coords[1]::numeric as lat, coords[2]::numeric as lng from foo) update foursquare_checkins set the_geom=CDB_LatLng(lat, lng) from bar where foursquare_checkins.cartodb_id = bar.cartodb_id
```



Another good idea may be using CartoDB table as **entry** for an IFTTT recipe. And transforming the CartoDB table in a RSS feed seems to be the only way, for the current time. [This app](https://github.com/andrewxhill/cartodb-rss) transforms a CartoDB table into a GeoRSS feed
