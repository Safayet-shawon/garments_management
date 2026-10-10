const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Winner Apparels' }));

// Add API routes here (orders, buyers, shipments, ...) when the frontend is wired to a server.

const port = process.env.PORT || 4000;
if (require.main === module) app.listen(port, () => console.log(`API on :${port}`));
module.exports = app;
