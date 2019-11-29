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


    test('Constructor should create broker with valid parameters', () => {
        expect(() => Broker({})).not.toThrow();
        expect(() => Broker({actions: {}})).not.toThrow();
        expect(() => Broker({singletons: {}})).not.toThrow();
        expect(() => Broker({plugins: {}})).not.toThrow();
        expect(() => Broker({services: {}})).not.toThrow();
        expect(
            () => Broker({
                singletons: {
                    test1: {start() {}},
                    test2: Singleton({start() {}, singletons: ['test1']}),
                },
                plugins: {
                    xyz: {singletons: ['test1'], start() {}},
                    xyz2: Plugin({singletons: ['test2'], start() {}}),
                },
                actions: {
                    test: {
                        fn() {},
                        plugins: {xyz2: 1},
                        singletons: ['test1', 'test2'],
                        actions: ['test3'],
                    },
                    test3: Action({fn() {}}),
                },
                services: {
                    one: {
                        actions: ['test'],
                        singletons: ['test1'],
                        localActions: {test5: {fn() {}}},
                        start() {},
                        stop() {},
                    },
                    two: Service({start() {}}),
                },
            }),
        ).not.toThrow();
    });
});


describe('#getServiceByName(name)', () => {

    it('should throw if name invalid', () => {
        const broker = Broker({});
        expect(() => broker.getServiceByName()).toThrow();
        expect(() => broker.getServiceByName(1)).toThrow();
    });


    it('should throw if there is no service with given name', () => {
        const broker = Broker({});
        expect(() => broker.getServiceByName('alala')).toThrow();
    });


    it('should return service if name is existing', () => {
        const
            service = Service({start() {}}),
            broker = Broker({services: {service}});

        expect(broker.getServiceByName('service')).toEqual(service);
    });

});


