'use strict';

const {Singleton} = require('../../index');

module.exports = Singleton({
    start() {
        return {one: 1};
    },
});
