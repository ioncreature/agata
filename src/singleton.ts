import {isFunction} from 'lodash';
import {isStringArray} from './utils';

export enum SingletonState {
    initial = 'initial',
    loading = 'loading',
    loaded = 'loaded',
    unloading = 'unloading',
}

export interface ISingletonDependencies {
    singletons?: any;
}

export interface ISingleton {
    singletons?: string[];
    start: Function;
    stop?: Function;
}

export class Singleton {
    static validateConfig({singletons, start, stop}: Partial<ISingleton>) {
        if (!isFunction(start)) {
            throw new Error('Singleton parameter "start" have to be a function');
        }

        if (stop && !isFunction(stop)) {
            throw new Error('Singleton parameter "stop" have to be a function');
        }

        if (singletons && !isStringArray(singletons)) {
            throw new Error('Singleton parameter "singletons" have to be an array of strings');
        }
    }

    promise: Promise<Singleton>;
    instance: Singleton;
    singletons: string[];
    stateData: any;
    start: Function;
    stop: Function;
    state: SingletonState;

    constructor({singletons, start, stop}: ISingleton) {
        Singleton.validateConfig({singletons, start, stop});

        this.singletons = singletons || [];
        this.start = start;
        this.stop = stop;
        this.stateData = {};
        this.state = SingletonState.initial;
    }

    getRequiredSingletons() {
        return [...this.singletons];
    }

    isInit() {
        return this.state === SingletonState.initial;
    }

    isLoading() {
        return this.state === SingletonState.loading;
    }

    isLoaded() {
        return this.state === SingletonState.loaded;
    }

    isUnloading() {
        return this.state === SingletonState.unloading;
    }
}
