'use strict';

const {Plugin} = require('../../index');

module.exports = Plugin({
    start() {
        return params => params;
    },
});
