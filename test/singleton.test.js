'use strict';

const
    {Singleton} = require('../index');

describe('Singleton constructor', () => {

    test('Constructor throw with invalid parameters', () => {
        expect(() => Singleton()).toThrow();
        expect(() => Singleton({})).toThrow();
        expect(() => Singleton({start: 1})).toThrow();
        expect(() => Singleton({start() {}, stop: 1})).toThrow();
        expect(() => Singleton({start() {}, singletons: 1})).toThrow();
        expect(() => Singleton({start() {}, singletons: ['test', 1]})).toThrow();
    });


    test('Constructor should create singleton if parameters are valid', () => {
        expect(() => Singleton({start() {}})).not.toThrow();
        expect(() => Singleton({start() {}, stop() {}})).not.toThrow();
        expect(() => Singleton({start() {}, singletons: ['test', 'best']})).not.toThrow();
        expect(() => Singleton({start() {}, stop() {}, singletons: ['test', 'best']})).not.toThrow();
    });

});