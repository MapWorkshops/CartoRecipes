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
   BEGIN
      with coords_str_table as (
        select cartodb_id, regexp_matches(map_url, 'center=(-?[\d]*\.[\d]*),(-?[\d]*\.[\d]*)&') as coords
        from foursquare_checkins
      ),
      coords_table as (
        select cartodb_id, coords[1]::numeric as lat, coords[2]::numeric as lng from coords_str_table
      )
      update foursquare_checkins set the_geom=CDB_LatLng(lat, lng) from coords_table
      where coords_table.cartodb_id = NEW.cartodb_id

   -- The return value is ignored for row-level triggers fired after an operation, and so they can return NULL.
      return null;
    END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE OR UPDATE TRIGGER update_geom_column_trigger
AFTER INSERT OR UPDATE OR DELETE
ON foursquare_checkins
FOR EACH ROW
EXECUTE PROCEDURE update_geom_column();

```

So, every time the IFTTT recipe adds a new file to the Google Drive sheet, this file will be included
in the next synchronization (depending on the period you chose, this will happen every hour, every day...).
And every time the table is synchronized, the_geom field will be updated. NEED TESTING
