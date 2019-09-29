'use strict';

const
    {sep: SEPARATOR, isAbsolute, resolve, join} = require('path'),
    {isString, camelCase} = require('lodash'),
    glob = require('glob');


exports.DEFAULT_ACTION_TEMPLATE = '**/*.action.js';
exports.DEFAULT_ACTION_TEMPLATE_REMOVE = /\.action.js$/;

exports.DEFAULT_SERVICE_TEMPLATE = '*/index.js';
exports.DEFAULT_SERVICE_TEMPLATE_REMOVE = /\\index.js$/;


exports.isStringArray = value => {
    if (!Array.isArray(value))
        return false;

    return value.every(isString);
};


/**
 * Load file and translates its name to dot separated camelCase name
 * @param {string} path
 * @param {string} template
 * @param {string|RegExp} remove
 * @returns {Array<Object>}
 */
exports.loadFiles = ({path, template, remove = ''}) => {
    if (!isString(path))
        throw new Error('Parameter "path" have to be a string');

    if (!isString(template))
        throw new Error('Parameter "template" have to be a string');

    const
        absolutePath = isAbsolute(path) ? path : resolve(path), // is resolve() correct here?
        paths = glob.sync(template, {cwd: absolutePath, nodir: true});

    return paths.map(p => {
        const
            i = require(join(absolutePath, p)),
            name = toCamelCase(p.replace(remove, '').replace(/\.js$/i, ''));

        return [name, i];
    });
};


function toCamelCase(path) {
    return String(path)
        .split(SEPARATOR)
        .map(camelCase)
        .join('.');
}
