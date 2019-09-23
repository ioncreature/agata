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
        expect(() => Service({start() {}, localActions: 1})).toThrow();
        expect(() => Service({start() {}, localActions: {test: {}}})).toThrow();
        expect(() => Service({start() {}, localActions: {test: {fn: 1}}})).toThrow();
    });


    test('Create service with parameters', () => {
        expect(() => Service({start() {}})).not.toThrow();
        expect(() => Service({start() {}, stop() {}})).not.toThrow();
        expect(() => Service({start() {}, singletons: ['test']})).not.toThrow();
        expect(() => Service({start() {}, actions: ['test']})).not.toThrow();
        expect(() => Service({start() {}, localActions: {}})).not.toThrow();
        expect(() => Service({start() {}, localActions: {test: {fn() {}}}})).not.toThrow();
    });


    test('Throw if handlers and actions name intersects', () => {
        expect(() =>
            Service({start() {}, actions: ['test'], localActions: {test: {fn() {}}}}),
        ).toThrow();
    });


    test('Load handlers from config', () => {
        const srv = Service({
            localActions: {
                one: Action({fn() {}}),
                two: {actions: ['one'], fn() {}},
            },
            start() {},
        });

        expect(srv.isActionRequired('one')).toBe(true);
        expect(srv.isActionRequired('two')).toBe(true);
        expect(srv.isActionRequired('three')).toBe(false);
    });

});


describe('Handlers loading from file system', () => {

    test('Service throws on invalid handlersPath', () => {
        expect(() => Service({localActionsPath: 1})).toThrow();
    });


    test('Service throws on invalid handlersTemplate', () => {
        expect(() => Service({localActionsPath: '1', localActionsTemplate: 123, start() {}})).toThrow();
    });


    test.each([
        ['test/handlers'],
        [join(__dirname, 'handlers')],
    ])(
        'Load handlers from FS template path: %s',
        localActionsPath => {
            const srv = Service({localActionsPath, start() {}});
            expect(srv.getLocalActionsPath()).toEqual(join(__dirname, 'handlers'));
            expect(srv.isActionRequired('one')).toBe(false);
            expect(srv.isActionRequired('theSecond')).toBe(true);
            expect(srv.isActionRequired('scope.theThird')).toBe(true);
        },
    );


    test('Throw if file handler name and config handler name matches', () => {
        expect(() => Service({localActions: {theSecond: {fn() {}}}, localActionsPath: 'test/handlers', start() {}})).toThrow();
    });


    test('Load handlers from FS with custom template', () => {
        const srv = Service({
            localActionsPath: 'test/handlers',
            localActionsTemplate: '*.js',
            start() {},
        });
        expect(srv.getLocalActionsPath()).toEqual(join(__dirname, 'handlers'));
        expect(srv.isActionRequired('one')).toBe(true);
        expect(srv.isActionRequired('theSecond')).toBe(true);
        expect(srv.isActionRequired('scope.theThird')).toBe(false);
    });


    test('Load handlers from FS with custom recursive template', () => {
        const srv = Service({
            localActionsPath: 'test/handlers',
            localActionsTemplate: '**/*.js',
            start() {},
        });
        expect(srv.getLocalActionsPath()).toEqual(join(__dirname, 'handlers'));
        expect(srv.isActionRequired('one')).toBe(true);
        expect(srv.isActionRequired('theSecond')).toBe(true);
        expect(srv.isActionRequired('scope.theThird')).toBe(true);
    });

});
