'use strict';

const
    {isString} = require('lodash');


exports.isStringArray = value => {
    if (!Array.isArray(value))
        return false;

    return value.every(isString);
};
