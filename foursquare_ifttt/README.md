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
* The most important thing, a trigger to update the geometry column after insert/update: TODO query

So, every time the IFTTT recipe adds a new file to the Google Drive sheet, this file will be included
in the next synchronization (depending on the period you chose, this will happen every hour, every day...).
And every time the table is synchronized, the_geom field will be updated. NEED TESTING
