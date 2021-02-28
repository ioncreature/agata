import {join} from 'path';
import {Service, Action} from '../src';

describe('Service constructor', () => {
    test('Throw if handlers and actions name intersects', () => {
        expect(() => new Service({start() {}, actions: ['test'], localActions: {test: {fn() {}}}})).toThrow();
    });

    test('Load handlers from config', () => {
        const srv = new Service({
            localActions: {
                one: new Action({fn() {}}),
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
    test.each([
        ['test/handlers'], //
        [join(__dirname, 'handlers')],
    ])('Load handlers from FS template path: %s', localActionsPath => {
        const srv = new Service({localActionsPath, start() {}});
        expect(srv.isActionRequired('one')).toBe(false);
        expect(srv.isActionRequired('theSecond')).toBe(true);
        expect(srv.isActionRequired('scope.theThird')).toBe(true);
    });

    test('Throw if file handler name and config handler name matches', () => {
        expect(
            () => new Service({localActions: {theSecond: {fn() {}}}, localActionsPath: 'test/handlers', start() {}}),
        ).toThrow();
    });

    test('Load handlers from FS with custom template', () => {
        const srv = new Service({
            localActionsPath: 'test/handlers',
            localActionsTemplate: '*.js',
            start() {},
        });
        expect(srv.isActionRequired('one')).toBe(true);
        expect(srv.isActionRequired('theSecond')).toBe(true);
        expect(srv.isActionRequired('scope.theThird')).toBe(false);
    });

    test('Load handlers from FS with custom recursive template', () => {
        const srv = new Service({
            localActionsPath: 'test/handlers',
            localActionsTemplate: '**/*.js',
            start() {},
        });
        expect(srv.isActionRequired('one')).toBe(true);
        expect(srv.isActionRequired('theSecond')).toBe(true);
        expect(srv.isActionRequired('scope.theThird')).toBe(true);
    });
});
