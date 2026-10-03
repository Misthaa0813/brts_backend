const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    route_id: Number,
    bus_no: String,
    direction: String,
    start_stop: String,
    end_stop: String,
  },
  {
    collection: 'routes',
  }
);

module.exports = mongoose.model('Route', routeSchema);