'use strict';

const
    {sep: SEPARATOR} = require('path'),
    {isString, camelCase} = require('lodash');


exports.isStringArray = value => {
    if (!Array.isArray(value))
        return false;

    return value.every(isString);
};


exports.toCamelCase = path => {
    return String(path)
        .replace(/\.handler$/, '')
        .split(SEPARATOR)
        .map(camelCase)
        .join('.');
};
