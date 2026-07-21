// Vercel Serverless Function entry point — routes all /api/* calls to the backend Express app
// This file lives at /api/[...path].js so Vercel routes /api/** here
const app = require('../backend/server');

module.exports = app;
