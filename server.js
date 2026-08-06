require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes will be mounted here in later phases

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });

module.exports = app;
