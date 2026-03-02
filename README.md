# README

Render an export of a CoMapeo Project

## TODO
[x] scaffold project (node, express, react)

[x] add map library (leaflet), basic webapp, rendering map

[x] basic loading of example.zip
    [x] be able extract test zip into a folder (add an endpoint, since in the future this zip will be added from the frontend, but for now just have a function that solves that and then we will use that in the web endpoint)
    [x] load geojson file, place points in the map
    [x] render attachments for point (images, audio) in modal. The idea is to have basic data on top of the point (like date and type) and a panel (on the right of the page), to show the attachments (images and audio, using native audio player)

[X] Fix tagging. Taggings hold form data, but also a 'rope' system that resolves to a specific category. Both exist on the tags field. The idea is to be able to resolve the category following the 'rope'. f.e.  on one hand, and on the other detect which are parts of the form to render on the details panel
    [x] Be able to resolve a category by following the tags rope
    [x] Be able to show form data that aren't part of the category resolution
```json
// rope part, note how more general resolve to more particular (type-> nature -> water -> body of water)
          "type": "nature",
          "nature": "water",
          "water": "body-of-water",
// this part is form data
          "name": "Unas cosa",
          "body-of-water-type": "headwaters",
          "conditions": "unusual",
          "natural-resource-type": [
            "water"
          ],
          "cultural-name": "Cosa"
```

[x] Allow displaying tracks. Tracks are exported on a separate geojson with schema name track. they have a list of locations. Tracks should be displayed as a line joining the points that comprise it. They are not located on the zip file, so they need to be loaded separately

