'use strict';

const
    {sep: SEPARATOR} = require('path'),
    {isString, toCamelCase} = require('lodash');


exports.isStringArray = value => {
    if (!Array.isArray(value))
        return false;

    return value.every(isString);
};


exports.toCamelCase = path => {
    return String(path).split(SEPARATOR).map(toCamelCase).join('.');
};
