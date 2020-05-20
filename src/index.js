const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('cookie-session');
const expressLayouts = require('express-ejs-layouts');
const morgan = require('morgan');
const logger = require('./infrastructure/logger');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./infrastructure/config');
const helmet = require('helmet');
const sanitization = require('login.dfe.sanitization');
const csurf = require('csurf');
const mountRoutes = require('./routes');
const { getErrorHandler, ejsErrorPages } = require('login.dfe.express-error-handling');

const configSchema = require('./infrastructure/config/schema');

configSchema.validate();

if (config.hostingEnvironment.applicationInsights) {
  appInsights.setup(config.hostingEnvironment.applicationInsights).start();
}

https.globalAgent.maxSockets = http.globalAgent.maxSockets = config.hostingEnvironment.agentKeepAlive.maxSockets || 50;

const app = express();
app.use(helmet({
  noCache: true,
  frameguard: {
    action: 'deny',
  },
}));

let expiryInMinutes = 30;
const sessionExpiry = parseInt(config.hostingEnvironment.sessionCookieExpiryInMinutes);
if (!isNaN(sessionExpiry)) {
  expiryInMinutes = sessionExpiry;
}
app.use(session({
  keys: [config.hostingEnvironment.sessionSecret],
  maxAge: expiryInMinutes * 60000, // Expiry in milliseconds
  httpOnly: true,
  secure: true,
}));
app.use((req, res, next) => {
  req.session.now = Date.now();
  next();
});

const csrf = csurf({
  cookie: {
    secure: true,
    httpOnly: true,
  },
});

if (config.hostingEnvironment.env !== 'dev') {
  app.set('trust proxy', 1);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitization());
app.use(morgan('combined', { stream: fs.createWriteStream('./access.log', { flags: 'a' }) }));
app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.use(express.static(path.resolve(__dirname, 'dist')));
app.set('views', path.resolve(__dirname, 'app'));
app.use(expressLayouts);
app.set('layout', 'layouts/layout');

mountRoutes(app, csrf);

let assetsUrl = config.hostingEnvironment.assetsUrl || 'https://rawgit.com/DFE-Digital/dfe.ui.toolkit/master/dist/';
assetsUrl = assetsUrl.endsWith('/') ? assetsUrl.substr(0, assetsUrl.length - 1) : assetsUrl;
Object.assign(app.locals, {
  urls: {
    interactions: config.hostingEnvironment.interactionsUrl,
    services: config.hostingEnvironment.servicesUrl,
    profile: config.hostingEnvironment.profileUrl,
    assets: assetsUrl,
    survey: config.hostingEnvironment.surveyUrl,
  },
  app: {
    environmentBannerMessage: config.hostingEnvironment.environmentBannerMessage,
  },
  gaTrackingId: config.hostingEnvironment.gaTrackingId,
});

const errorPageRenderer = ejsErrorPages.getErrorPageRenderer({
  help: config.hostingEnvironment.helpUrl,
  assets: assetsUrl,
}, config.hostingEnvironment.env === 'dev');
app.use(getErrorHandler({
  logger,
  errorPageRenderer,
}));

if (config.hostingEnvironment.env === 'dev') {
  app.proxy = true;

  const options = {
    key: config.hostingEnvironment.sslKey,
    cert: config.hostingEnvironment.sslCert,
    requestCert: false,
    rejectUnauthorized: false,
  };
  const server = https.createServer(options, app);

  server.listen(config.hostingEnvironment.port, () => {
    logger.info(`Dev server listening on https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port} with config:\n${JSON.stringify(config)}`);
  });
} else if (config.hostingEnvironment.env === 'docker') {
  app.listen(config.hostingEnvironment.port, () => {
    logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`)
  });
} else {
  app.listen(process.env.PORT, () => {
    logger.info(`Server listening on http://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
  });
}
