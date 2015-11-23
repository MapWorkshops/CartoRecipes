# Pause CartoDB Torque animation and click on point

This recipe allows you to click on any point present in a Torque animation. Normally, **Torque does not allow cliking on the points**. So, you'll need to:

1. Import a points dataset valid for Torque (you may want to use the one attached here, *wimbledon2013*)
2. Create a visualization with 2 layers:
  * Layer 1: simple point layer, using the dataset imported. Make points almost transparent (marker fill = 0.1).
  * Layer 2: torque layer, using the same dataset.
3. Adapt the calls in index.html to fit your account and table name

You will be really clicking in the points of the layer 1, but as the layer 2 is on the top, the effect is like if you were clicking in the torque points.

Inspiration here http://bl.ocks.org/javisantana/6029822
