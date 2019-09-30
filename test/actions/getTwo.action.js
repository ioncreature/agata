'use strict';

const {Action} = require('../../index');

module.exports = Action({
    actions: ['getOne'],

    fn({actions: {getOne}}) {
        return () => getOne() + getOne();
    },
});
