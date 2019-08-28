'use strict';

const
    {Action, Handler} = require('../index');


describe('Action constructor', () => {

    test('Constructor should throw without parameters', () => {
        expect(() => Action()).toThrow();
        expect(() => Handler()).toThrow();
    });


    test('Constructor should throw with invalid parameters', () => {
        expect(() => Action({})).toThrow();
        expect(() => Action({fn: 1})).toThrow();
        expect(() => Action({fn() {}, singletons: 1})).toThrow();
        expect(() => Action({fn() {}, actions: 1})).toThrow();
        expect(() => Action({fn() {}, plugins: 1})).toThrow();
    });


    test('Constructor should create Actions with valid parameters', () => {
        expect(() => Action({fn() {}})).not.toThrow();
        expect(() => Action({fn() {}, singletons: ['test']})).not.toThrow();
        expect(() => Action({fn() {}, actions: ['test']})).not.toThrow();
        expect(() => Action({fn() {}, plugins: {test: 1}})).not.toThrow();
        expect(() => Action({fn() {}, singletons: ['test'], actions: ['test'], plugins: {test: 1}})).not.toThrow();
    });

});
