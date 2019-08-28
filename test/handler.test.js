'use strict';

const
    {Handler} = require('../index');


describe('Handler constructor', () => {

    test('Constructor should throw without parameters', () => {
        expect(() => Handler()).toThrow();
    });


    test('Constructor should throw with invalid parameters', () => {
        expect(() => Handler({})).toThrow();
        expect(() => Handler({fn: 1})).toThrow();
        expect(() => Handler({fn() {}, singletons: 1})).toThrow();
        expect(() => Handler({fn() {}, actions: 1})).toThrow();
        expect(() => Handler({fn() {}, plugins: 1})).toThrow();
    });


    test('Constructor should create Actions with valid parameters', () => {
        expect(() => Handler({fn() {}})).not.toThrow();
        expect(() => Handler({fn() {}, singletons: ['test']})).not.toThrow();
        expect(() => Handler({fn() {}, actions: ['test']})).not.toThrow();
        expect(() => Handler({fn() {}, plugins: {test: 1}})).not.toThrow();
        expect(() => Handler({fn() {}, singletons: ['test'], actions: ['test'], plugins: {test: 1}})).not.toThrow();
    });

});
