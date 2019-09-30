'use strict';

const
    {join} = require('path'),
    {Broker} = require('../index');


describe('Load services from file system', () => {

    it.each([
        ['test/services'],
        [join(__dirname, 'services')],
    ])(
        'should load services from FS, path: %s',
        async servicesPath => {
            const broker = Broker({servicesPath});

            await broker.startService('first');
            await broker.startService('second');
        },
    );


    it('should throw if services names are the same', () => {
        expect(() => Broker({
            servicesPath: 'test/services',
            services: {
                first: {start() {}},
            },
        })).toThrow(/already exists/);
    });

});


describe('Load actions from file system', () => {

    it.each([
        ['test/actions'],
        [join(__dirname, 'actions')],
    ])(
        'should load services from FS, path: %s',
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

    it('should throw if actions names match', async() => {
        expect(() => Broker({
            actionsPath: 'test/actions',
            actions: {
                getOne: {
                    fn() {},
                },
            },
        })).toThrow(/already exists/);
    },
    );
});

