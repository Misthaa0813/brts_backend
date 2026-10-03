const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema(
  {
    route_id: Number,
    stop_id: Number,
    stop_order: Number,
  },
  {
    collection: 'routeStops',
  }
);

module.exports = mongoose.model('RouteStop', routeStopSchema);