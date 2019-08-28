'use strict';

const
    {Service} = require('../index');


describe('Service constructor', () => {

    test('Create service without parameters have to throw', () => {
        expect(() => Service()).toThrow();
        expect(() => Service({})).toThrow();
    });


    test('Create service with invalid parameters have to throw', () => {
        expect(() => Service({start: 1})).toThrow();
        expect(() => Service({start() {}, stop: 1})).toThrow();
        expect(() => Service({start() {}, singletons: 1})).toThrow();
        expect(() => Service({start() {}, actions: 1})).toThrow();
    });


    test('Create service with parameters', () => {
        expect(() => Service({start() {}})).not.toThrow();
        expect(() => Service({start() {}, stop() {}})).not.toThrow();
    });

});
