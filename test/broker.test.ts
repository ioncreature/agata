import {Broker, Action, Plugin, Service, Singleton} from '../src';

describe('Broker Constructor', () => {
    test('Constructor should create broker with valid parameters', () => {
        expect(() => new Broker({})).not.toThrow();
        expect(() => new Broker({actions: {}})).not.toThrow();
        expect(() => new Broker({singletons: {}})).not.toThrow();
        expect(() => new Broker({plugins: {}})).not.toThrow();
        expect(() => new Broker({services: {}})).not.toThrow();
        expect(
            () =>
                new Broker({
                    singletons: {
                        test1: {start() {}},
                        test2: new Singleton({start() {}, singletons: ['test1']}),
                    },
                    plugins: {
                        xyz: {singletons: ['test1'], start() {}},
                        xyz2: new Plugin({singletons: ['test2'], start() {}}),
                    },
                    actions: {
                        test: {
                            fn() {},
                            plugins: {xyz2: 1},
                            singletons: ['test1', 'test2'],
                            actions: ['test3'],
                        },
                        test3: new Action({fn() {}}),
                    },
                    services: {
                        one: {
                            actions: ['test'],
                            singletons: ['test1'],
                            localActions: {test5: {fn() {}}},
                            start() {},
                            stop() {},
                        },
                        two: new Service({start() {}}),
                    },
                }),
        ).not.toThrow();
    });
});

describe('#getServiceByName(name)', () => {
    it('should throw if there is no service with given name', () => {
        const broker = new Broker({});
        expect(() => broker.getServiceByName('alala')).toThrow();
    });

    it('should return service if name is existing', () => {
        const service = new Service({start() {}}),
            broker = new Broker({services: {service}});

        expect(broker.getServiceByName('service')).toEqual(service);
    });
});
