'use strict';

const
    Action = require('./action');

/**
 * Handler is a service-level action without ability to refer to another handlers
 */
class Handler extends Action {}

module.exports = Handler;
