'use strict';

const
    {join} = require('path'),
    {Service, Action} = require('../index');


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
        expect(() => Service({start() {}, handlers: 1})).toThrow();
        expect(() => Service({start() {}, handlers: {test: {}}})).toThrow();
        expect(() => Service({start() {}, handlers: {test: {fn: 1}}})).toThrow();
    });


    test('Create service with parameters', () => {
        expect(() => Service({start() {}})).not.toThrow();
        expect(() => Service({start() {}, stop() {}})).not.toThrow();
        expect(() => Service({start() {}, singletons: ['test']})).not.toThrow();
        expect(() => Service({start() {}, actions: ['test']})).not.toThrow();
        expect(() => Service({start() {}, handlers: {}})).not.toThrow();
        expect(() => Service({start() {}, handlers: {test: {fn() {}}}})).not.toThrow();
    });


    test('Load handlers from config', () => {
        const srv = Service({
            handlers: {
                one: Action({fn() {}}),
                two: {actions: ['one'], fn() {}},
            },
        });

        expect(srv.isActionExists('one')).toBe(true);
        expect(srv.isActionExists('two')).toBe(true);
        expect(srv.isActionExists('three')).toBe(false);
    });


    test('Load handlers from FS with default template', () => {
        const srv = Service({handlersPath: 'handlers'});
        expect(srv.getHandlersPath()).toEqual(join(__dirname, 'handlers'));
        expect(srv.isActionExists('one'));
        expect(srv.isActionExists('theSecond'));
        expect(srv.isActionExists('scope.theThird'));
    });

});
