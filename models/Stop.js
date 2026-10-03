const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    stop_id: Number,
    stop_name: String,
  },
  {
    collection: 'stops',
  }
);

module.exports = mongoose.model('Stop', stopSchema);
