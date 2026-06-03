const app = require('../dist/server.cjs');
const expressApp = app.default || app.app || app;
module.exports = expressApp;
