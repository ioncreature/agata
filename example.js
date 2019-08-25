'use strict';

const {Broker, Service, Action, Handler, Plugin} = require('agata');

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

    handlersPath: './handlers', // local for service

    singletons: ['postgres', 'statistics', 'log'],
    actions: ['user.getFriends'],
    handlers: [],

    async start({actions, plugins, singletons, handlers}) {},
    async stop() {},
});


// mixins dir
// <.>/singleton/postgres

module.exports = Agata.Singleton({
    mixins: [],

    async start() {},
    async stop() {},
});



// actions dir
// <.>/actions/user/getFriends.js

module.exports = Agata.Action({
    mixins: ['postgres'],
    actions: ['user.getById'],
    plugins: {
        httpContract: {
            method: 'GET',
            host: 'example.com',
            url: '/api/user/{id}',
        }
    },

    async fn({singletons: {postgres}, actions}) {
        return async(userId) => {
            const user = await actions.user.getById(userId);
            const friends = await postgres.User.getFriends(user);

            return friends;
        };
    },
});

// handlers dir
// <.>/service/<name>/handler/getFriends.js
