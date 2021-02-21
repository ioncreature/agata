const {join} = require('path'),
    {Broker} = require('../index');

describe('Load services from file system', () => {
    it.each([['test/services'], [join(__dirname, 'services')]])(
        'should load services from FS, path: %s',
        async servicesPath => {
            const broker = Broker({servicesPath});

            await broker.startService('first');
            await broker.startService('second');
        },
    );

    it('should throw if services names are the same', () => {
        expect(() =>
            Broker({
                servicesPath: 'test/services',
                services: {
                    first: {start() {}},
                },
            }),
        ).toThrow(/already exists/);
    });
});

describe('Load actions from file system', () => {
    it.each([['test/actions'], [join(__dirname, 'actions')]])(
        'should load actions from FS, path: %s',
        async actionsPath => {
            let result = 0;

            const broker = Broker({
                actionsPath,
                services: {
                    first: {
                        actions: ['getTwo'],
                        start({actions: {getTwo}}) {
                            result = getTwo();
                        },
                    },
                },
            });

            await broker.startService('first');
            expect(result).toEqual(2);
        },
    );

    it('should throw if actions names match', async () => {
        expect(() =>
            Broker({
                actionsPath: 'test/actions',
                actions: {
                    getOne: {
                        fn() {},
                    },
                },
            }),
        ).toThrow(/already exists/);
    });
});

describe('Load singletons from file system', () => {
    it.each([['test/singletons'], [join(__dirname, 'singletons')]])(
        'should load singletons from FS, path: %s',
        async singletonsPath => {
            let result = 0;

            const broker = Broker({
                singletonsPath,
                services: {
                    first: {
                        singletons: ['db'],
                        start({singletons: {db}}) {
                            result = db.getThree();
                        },
                    },
                },
            });

            await broker.startService('first');
            expect(result).toEqual(3);
        },
    );

    it('should throw if singletons names match', async () => {
        expect(() =>
            Broker({
                singletonsPath: 'test/singletons',
                singletons: {
                    config: {
                        start() {
                            return {two: 2};
                        },
                    },
                },
            }),
        ).toThrow(/already exists/);
    });
});

describe('Load plugins from file system', () => {
    it.each([['test/plugins'], [join(__dirname, 'plugins')]])(
        'should load actions with plugins from FS, path: %s',
        async path => {
            const broker = Broker({
                actionsPath: path,
                pluginsPath: path,
                services: {
                    first: {
                        actions: ['some'],
                        start({actions: {some}}) {
                            expect(some(11)).toEqual({
                                seven: 7,
                                param: 11,
                                proxy: {this: 'is object'},
                            });
                        },
                    },
                },
            });

            await broker.startService('first');
        },
    );

    it('should throw if plugins names match', async () => {
        expect(() =>
            Broker({
                actionsPath: 'test/plugins',
                pluginsPath: 'test/plugins',
                plugins: {
                    seven: {
                        start() {
                            return () => 7;
                        },
                    },
                },
                actions: {
                    getOne: {
                        fn() {},
                    },
                },
            }),
        ).toThrow(/already exists/);
    });
});
