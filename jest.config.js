'use strict';

module.exports = {
    clearMocks: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.еs'],
    moduleFileExtensions: ['js', 'json', 'ts'],
    testEnvironment: 'node',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
};
