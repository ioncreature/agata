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
                first: {start() {}}
            }
        })).toThrow(/already exists/);
    });

});
