import {isFunction} from 'lodash';
import {isStringArray} from './utils';

export interface IPluginDependencies {
    singletons?: any;
}

export interface IPlugin {
    singletons?: string[];
    start: (IPluginDependencies) => any;
}

export class Plugin {
    static validateConfig({singletons, start}: Partial<IPlugin>) {
        if (!isFunction(start)) {
            throw new Error('Plugin parameter "start" have to be a function');
        }

        if (singletons && !isStringArray(singletons)) {
            throw new Error('Plugin parameter "singletons" have to be an array of strings');
        }
    }

    private readonly singletons: string[];
    start: Function;
    instance: Function;

    constructor({singletons, start}: IPlugin) {
        Plugin.validateConfig({singletons, start});
        this.singletons = singletons || [];
        this.start = start;
    }

    getRequiredSingletons() {
        return [...this.singletons];
    }
}
