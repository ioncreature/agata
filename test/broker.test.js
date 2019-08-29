'use strict';

const
    {Broker, Action, Plugin, Service, Singleton} = require('../index');

describe('Broker Constructor', () => {

    test('Constructor without parameters should throw', () => {
        expect(() => Broker()).toThrow();
    });


    test('Constructor should throw with invalid parameters', () => {
        expect(() => Broker({actions: 1})).toThrow();
        expect(() => Broker({singletons: 1})).toThrow();
        expect(() => Broker({plugins: 1})).toThrow();
        expect(() => Broker({services: 1})).toThrow();

        expect(() => Broker({actions: {test: {}}})).toThrow();
        expect(() => Broker({actions: {test: {fn: 1}}})).toThrow();
        expect(() => Broker({singletons: {test: {}}})).toThrow();
        expect(() => Broker({singletons: {test: {fn: 1}}})).toThrow();

        expect(() => Broker({plugins: {test: {}}})).toThrow();
        expect(() => Broker({plugins: {test: {fn: 2}}})).toThrow();
        expect(() => Broker({services: {test: {}}})).toThrow();
        expect(() => Broker({services: {test: {fn: 2}}})).toThrow();
    });


    test('Constructor should create actions with valid parameters', () => {
        expect(() => Broker({})).not.toThrow();
        expect(() => Broker({actions: {}})).not.toThrow();
        expect(() => Broker({singletons: {}})).not.toThrow();
        expect(() => Broker({plugins: {}})).not.toThrow();
        expect(() => Broker({services: {}})).not.toThrow();
        expect(
            () => Broker({
                actions: {
                    test: {
                        fn() {},
                        plugins: {test: 1},
                        singletons: ['test1', 'test2'],
                        actions: ['ololo'],
                    },
                    test3: Action({fn() {}}),
                },
                services: {
                    one: {
                        actions: ['aaa'],
                        singletons: ['alala'],
                        handlers: {test: {fn() {}}},
                        start() {},
                        stop() {},
                    },
                    two: Service({start() {}}),
                },
                singletons: {
                    test1: {start() {}},
                    test2: Singleton({start() {}, singletons: ['test1']}),
                },
                plugins: {
                    xyz: {onActionLoad() {}},
                    xyz2: Plugin({onActionLoad() {}, singletons: ['test']}),
                },
            })
        ).not.toThrow();
    });
});

