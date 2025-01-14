const config = require('./infrastructure/config');
const contact = require('./app/contact');
const healthCheck = require('login.dfe.healthcheck');

const mountRoutes = (app, csrf) => {
  app.use('/healthcheck', healthCheck({ config }));

  app.use('/contact', contact(csrf));

  app.get('*', (req, res) => {
    res.redirect('/contact')
  });
};

module.exports = mountRoutes;
