# Agata - The microservice framework
[![Build Status](https://travis-ci.org/ioncreature/agata.svg?branch=master)](https://travis-ci.org/ioncreature/agata)

There was few main points to create this framework

### Precise dependency tracking
Every dependency described declaratively and gathered before service start

So it is possible to build dependency trees, check what does service use, 
automatically build documentation, and etc.

### Get any business logic locally instead of calling other microservice   
The idea here is not to make redundant communications between microservices.

### Test every piece of business logic
Unit tests seems redundant in microservices, their place inside libraries. 
It is better to test business units(actions), contracts(handlers) and user scenarios.


## Lifecycle

- Load 
  - broker
  - service
  - singletons
  - plugins
  - actions
- Start
  - singletons
  - plugins
  - actions
  - service
- Stop
  - singletons
  - service
  