'use strict';

const
    {Plugin} = require('../index');

describe('Plugin constructor', () => {

    test('Constructor throw with invalid parameters', () => {
        expect(() => Plugin()).toThrow();
        expect(() => Plugin({})).toThrow();
        expect(() => Plugin({start: 1})).toThrow();
        expect(() => Plugin({start() {}, singletons: 1})).toThrow();
        expect(() => Plugin({start() {}, singletons: ['test', 1]})).toThrow();
    });


    test('Constructor should create singleton if parameters are valid', () => {
        expect(() => Plugin({start() {}})).not.toThrow();
        expect(() => Plugin({start() {}, singletons: ['test', 'best']})).not.toThrow();
    });

});
