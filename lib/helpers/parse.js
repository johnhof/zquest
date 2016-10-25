'use strict';

let _ = require('lodash');

let parse = {};

parse.message = (msg) => {
  let id;
  let data = _.isString(msg) ? msg : msg.toString();
  if (data[0] === '{') {
    try {
      data = JSON.parse(data)
    } catch (e) {
      toss('Failed to parse incoming message: ' + e.message);
    }
    id = data._request_id;
    data = data.data || data.message || data.body || data;
    if (id === data._request_id) delete data._request_id;
  } else {
    let dataParse = (data.match(/^(.+?):(.*)$/) || []);
    id = dataParse[1];
    data = dataParse[2];
  }
  return {
    _request_id: id,
    data: data
  }
};

parse.messageId = (msg) => {
  return parse.message(msg).id;
};

module.exports = parse;
