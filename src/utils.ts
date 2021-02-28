import {sep as SEPARATOR, isAbsolute, resolve, join} from 'path';
import {isString, camelCase} from 'lodash';
import * as glob from 'glob';

export const DEFAULT_ACTION_TEMPLATE = '**/*.action.[tj]s';
export const DEFAULT_ACTION_TEMPLATE_REMOVE = /\.action.[tj]s$/i;
export const DEFAULT_SINGLETON_TEMPLATE = '**/*.singleton.[tj]s';
export const DEFAULT_SINGLETON_TEMPLATE_REMOVE = /\.singleton.[tj]s$/i;
export const DEFAULT_SERVICE_TEMPLATE = '*/index.[tj]s';
export const DEFAULT_SERVICE_TEMPLATE_REMOVE = new RegExp(`${SEPARATOR}index.[tj]s$`, 'i');
export const DEFAULT_PLUGIN_TEMPLATE = '**/*.plugin.[tj]s';
export const DEFAULT_PLUGIN_TEMPLATE_REMOVE = /\.plugin.[tj]s$/i;

export function isStringArray(value) {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.every(isString);
}

/**
 * Load file and translates its name to dot separated camelCase name
 * @param {string} path
 * @param {string} template
 * @param {string|RegExp} remove
 * @returns {Array<Object>}
 */
export function loadFiles({path, template, remove}) {
    if (!isString(path)) throw new Error('Parameter "path" have to be a string');

    if (!isString(template)) throw new Error('Parameter "template" have to be a string');

    const absolutePath = isAbsolute(path) ? path : resolve(path),
        paths = glob.sync(template, {cwd: absolutePath, nodir: true});

    return paths.map(p => {
        const i = require(join(absolutePath, p)),
            name = toCamelCase(p.replace(remove, '').replace(/\.js$/i, ''));

        return [name, i];
    });
}

function toCamelCase(path) {
    return String(path).split(SEPARATOR).map(camelCase).join('.');
}
