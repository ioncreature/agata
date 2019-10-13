'use strict';

/* eslint-disable */

const Agata = require('agata'); // {Broker, Service, Action, Handler, Plugin}

// broker
const broker = Agata.Broker({
    singletonsPath: '',
    actionsPath: '',
    pluginsPath: '',
    servicesPath: '',
});

broker
    .startService('friends')
    .catch(e => {
        console.log(e);
        process.exit(1);
    });


// services dir
// <.>/service/friends/index.js
module.exports = Agata.Service({
    localActionsPath: './handlers', // local for service

    localActions: {
        doGoodStuff: {
            singletons: ['postgres'],
            actions: ['user.makeGood'],
            fn({singletons: {postgres}}) {
                return () => postgres.doBlaBlaBla();
            },
        },
    },

    singletons: ['postgres', 'statistics', 'log'],
    actions: ['user.getFriends', '#doGoodStuff'],

    async start({actions, plugins, singletons, localActions}) {},
    async stop() {},
});


// mixins dir
// <.>/singleton/postgres
module.exports = Agata.Singleton({
    singletons: ['log'],

    async start({singletons: {log}}) {
        let i = 0;
        return {
            inc() {
                i++;
                log(`It is ${i} now`);
                return i;
            },
        };
    },
    async stop() {},
});


// actions dir
// <.>/actions/user/getFriends.js
module.exports = Agata.Action({
    singletons: ['postgres'],
    actions: ['user.getById'],
    plugins: {
        httpContract: {
            method: 'GET',
            host: 'example.com',
            url: '/api/user/{id}',
        },
    },

    async fn({singletons: {postgres}, actions: {user: {}}, plugins: {httpContract}}) {
        return async userId => {
            const user = await actions.user.getById(userId);
            await httpContract();
            return await postgres.User.getFriends(user);
        };
    },
});


// scripts
const serviceBroker = require('../src/broker');
serviceBroker
    .startScript({
        singletons: [],
        actions: [],
        async start({singletons, actions}) {},
    })
    .then(() => console.log('script done'))
    .catch(e => console.error('script error', e));


// get dependency tree
broker.getDependencies(); // =>
/*
{
    services: {
        users: {
            singletons: ['postgres', 'log'],
            actions: ['users.getUser', '#http.getUser'],
            localActions: {
                'http.getUser': {
                    dependencies: {singletons: ['log'], actions: ['users.getUser']},
                },
            },
        },
        ...
    },
    singletons: {
        postgres: {
            dependencies: {singletons: ['log']},
            dependents: {singletons: ['i18n'], actions: ['users.getUser'], plugins: [], services: ['users']}}},
        },
        ...
    },
    actions: {
        'users.getUser': {
            plugins: {
                httpContract: {
                    host: 'users.local',
                    method: 'GET',
                    url: '/user/:id',
                },
            },
            dependencies: {singletons: ['log'], actions: ['users.getName']},
            dependents: {actions: ['friends.getFriend'], handlers: ['users#http.getSomething'], services: []}
        },
        ...
    },
    plugins: {
    }
 */
