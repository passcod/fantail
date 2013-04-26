'use strict';

var _ = require('underscore');

module.exports = function(config) {
  config = _.defaults(config || {}, {
    debug: false,
    throttle: 200,
    immediate: false
  });

  var started   = false;
  var todo      = [];
  var doing     = [];
  var handlers  = {};
  var pickers   = [];

  var push = function() {
    _.each(arguments, function(item) {
      todo.push(item);
    });
  };

  var runPicker = function(picker) {
    if (picker.limit !== 0) {
      var i = 0;
      todo.some(function(item, index) {
        var breaking = i === picker.limit;
        var used = false;
        picker.func.call({
          stop: function() {
            breaking = true;
          },
          handle: function(name) {
            used = true;
            doing.push({
              subject: item,
              handler: handlers[name]
            });
          }
        }, item);

        if (used) {
          delete todo[index];
        }

        i += 1;
        return breaking;
      });
    }

    setTimeout(function() {
      runPicker(picker);
    }, picker.interval);
    throttledHandlerRun();
  };

  var handlerRun = function() {
    doing.forEach(function(item, index) {
      delete doing[index];
      item.handler(item.subject);
    });
  };

  var throttledHandlerRun = _.throttle(handlerRun, config.throttle);

  var addPicker = function(func, interval, limit) {
    var i = pickers.push({
      func: func,
      interval: interval,
      limit: limit
    });

    if (started) {
      runPicker(pickers[i]);
    }

    return i;
  };

  var addHandler = function(name, func) {
    handlers[name] = func;
  };

  var start = function() {
    started = true;
    pickers.forEach(runPicker);
    setInterval(throttledHandlerRun, config.throttle);
    throttledHandlerRun();
  };


  this.push       = push;
  this.addPicker  = addPicker;
  this.addHandler = addHandler;
  this.start      = start;
  this.pickers    = pickers;

  if (config.debug) {
    this.todo     = todo;
    this.doing    = doing;
    this.handlers = handlers;
  }

  if (config.immediate) {
    start();
  }
};
