'use strict';

const
    {sep: SEPARATOR, isAbsolute, resolve, join} = require('path'),
    {isString, camelCase} = require('lodash'),
    glob = require('glob');


exports.isStringArray = value => {
    if (!Array.isArray(value))
        return false;

    return value.every(isString);
};


exports.toCamelCase = path => {
    return String(path)
        .replace(/\.handler$/, '')
        .replace(/\.index$/, '')
        .split(SEPARATOR)
        .map(camelCase)
        .join('.');
};


/**
 * Load file and translates its name to dot separated camelCase name
 * @param {string} path
 * @param {string} template
 * @returns {Array<Object>}
 */
exports.loadFiles = ({path, template, }) => {
    if (!isString(path))
        throw new Error('Parameter "path" have to be a string');

    if (!isString(template))
        throw new Error('Parameter "template" have to be a string');

    const
        absolutePath = isAbsolute(path) ? path : resolve(path), // is resolve() correct here?
        paths = glob
            .sync(template, {cwd: absolutePath, nodir: true})
            .map(p => p.replace(/\.js$/, ''));

    return paths.map(p => {
        const
            i = require(join(absolutePath, p)),
            name = exports.toCamelCase(p);

        return [name, i];
    });
};
