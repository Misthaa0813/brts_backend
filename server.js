const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Stop = require('./models/Stop');
const Route = require('./models/Route');
const RouteStop = require('./models/RouteStop');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'BRTS Surat API is running!',
  });
});

// GET all BRTS stops
app.get('/api/stops', async (req, res) => {
  try {
    const stops = await Stop.find().sort({ stop_id: 1 });

    res.json(stops);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch stops',
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

// GET all routes
app.get('/api/routes', async (req, res) => {
  try {
    const routes = await Route.find().sort({ route_id: 1 });

    res.json(routes);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch routes',
      error: error.message,
    });
  }
});

// GET route stops
app.get('/api/route-stops', async (req, res) => {
  try {
    const routeStops = await RouteStop.find().sort({
      route_id: 1,
      stop_order: 1,
    });

    res.json(routeStops);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch route stops',
      error: error.message,
    });
  }
});

// GET all unique bus numbers
app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Route.distinct('bus_no');

    buses.sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );

    res.json(buses);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch bus numbers',
      error: error.message,
    });
  }
});

// Get complete details for a bus
app.get('/api/bus-details', async (req, res) => {
  try {
    const busNo = req.query.bus_no;

    if (!busNo) {
      return res.status(400).json({
        message: 'Bus number is required',
      });
    }

    // Find all routes for this bus number
    const routes = await Route.find({
      bus_no: busNo,
    }).sort({
      route_id: 1,
    });

    if (routes.length === 0) {
      return res.status(404).json({
        message: 'Bus not found',
      });
    }

    const results = [];

    for (const route of routes) {
      // Get all stops belonging to this route
      const routeStops = await RouteStop.find({
        route_id: route.route_id,
      }).sort({
        stop_order: 1,
      });

      // Get all stop IDs
      const stopIds = routeStops.map(
        (item) => item.stop_id
      );

      // Get stop information
      const stopDocs = await Stop.find({
        stop_id: {
          $in: stopIds,
        },
      });

      // Create a quick lookup map
      const stopMap = new Map(
        stopDocs.map((stop) => [
          stop.stop_id,
          stop.stop_name,
        ])
      );

      // Create complete stop list
      const stops = routeStops.map((item) => ({
        stop_id: item.stop_id,
        stop_name:
          stopMap.get(item.stop_id) ?? 'Unknown Stop',
        stop_order: item.stop_order,
      }));

      results.push({
        route_id: route.route_id,
        bus_no: route.bus_no,
        direction: route.direction,
        start_stop: route.start_stop,
        end_stop: route.end_stop,
        total_stops: stops.length,
        stops: stops,
      });
    }

    res.json({
      bus_no: busNo,
      total_routes: results.length,
      routes: results,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch bus details',
      error: error.message,
    });
  }
});

// Find routes between two stops
app.get('/api/find-route', async (req, res) => {
  try {
    const fromStopId = Number(req.query.from);
    const toStopId = Number(req.query.to);

    if (!fromStopId || !toStopId) {
      return res.status(400).json({
        message: 'Both from and to stop IDs are required',
      });
    }

    // Find route-stop records for the starting stop
    const fromRouteStops = await RouteStop.find({
      stop_id: fromStopId,
    });

    // Find route-stop records for the destination stop
    const toRouteStops = await RouteStop.find({
      stop_id: toStopId,
    });

    const results = [];

    // Find routes that contain both stops
    for (const fromStop of fromRouteStops) {
      for (const toStop of toRouteStops) {
        if (
          fromStop.route_id === toStop.route_id &&
          fromStop.stop_order < toStop.stop_order
        ) {
          const route = await Route.findOne({
            route_id: fromStop.route_id,
          });

          if (route) {
            results.push({
              route_id: route.route_id,
              bus_no: route.bus_no,
              direction: route.direction,
              start_stop: route.start_stop,
              end_stop: route.end_stop,
              from_stop_id: fromStopId,
              to_stop_id: toStopId,
              from_order: fromStop.stop_order,
              to_order: toStop.stop_order,
            });
          }
        }
      }
    }

    // Remove duplicate routes
    const uniqueResults = results.filter(
      (route, index, self) =>
        index ===
        self.findIndex(
          (item) => item.route_id === route.route_id
        )
    );

    res.json({
      from_stop_id: fromStopId,
      to_stop_id: toStopId,
      routes: uniqueResults,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to find route',
      error: error.message,
    });
  }
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');

    console.log('Database:', mongoose.connection.name);

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    console.log(
      'Collections:',
      collections.map((collection) => collection.name)
    );

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`BRTS Surat API running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });