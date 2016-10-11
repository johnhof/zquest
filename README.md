# zquest

Promise based [ØMQ](http://zeromq.org/) request client.

## Usage

Zquest is designed to loosely follow the [request](https://github.com/request/request) module. It comes with several build in friendly features:
- Self managing [socket pool](https://github.com/johnhof/zquest/blob/master/lib/pool.js)
  - Self expiring (10 min default), including member socket cleanup
  - Auto scaling of member sockets within bounds (2-500 default)
  - Socket acquisition timeouts
- Self expiring [sockets](https://github.com/johnhof/zquest/blob/master/lib/socket.js) (10 min default)
- Mapping of one socket pool per host

### CAVEAT:

the responding server **MUST** return the request ID as part of the response. As **either** a property `_request_id` or prefixed to the request as `[ID]:`

Eg:
```javascript
zquest({ data: 'testing' });

socket.on('message', (message) => {
  message = zquest.parse(message); // => { _request_id: b6c537f5-73cb-4681-9d4c-786248c4dc93, data: 'testing' }

  // Either:
  socket.send(message._request_id + ':hello_world');

  // OR
  socket.send({
    _request_id: message._request_id,
    data: 'hello_world'
  });
});
```

## Key

- [Example](#example)
  - [Client](#client)
  - [Server](#server)
- [Documentation](#)
  - [Defaults](#defaults)
  - [`zquest(req)`](#zquestreq)
  - [`zquest.defaults(opts)`](#zquestdefaultsopts)
  - [`zquest.client`](#zquestclient)
  - [`zquest.new(message)`](#zquestnewmessage)
  - [`zquest.parse(message)`](#zquestparsemessage)
  - [`zquest.parse.message(message)`](#zquestparsemessagemessage)
  - [`zquest.parse.messageId(message)`](#zquestparsemessageidmessage)

## Example

### Client

```javascript
let zquest = require('zquest');

// tcp://localhost:5555
zquest({
  message: 'testing'
}).then((data) => console.log(data)) // => testing

// tcp://127.0.0.1:5555
zquest({
  host: '127.0.0.1',
  port: 5555,
  message: 'testing'
}).then((data) => console.log(data)) // => testing
```

### Simple Server (Blocking)

**NOTE** for non-blocking, see the [reflector](https://github.com/johnhof/zquest/blob/master/test/utilities/reflector.js) server used for testing

```javascript
let zmq = require('zmq');
let zquest = require('zquest');

let socket = zmq.socket('rep');
socket.bindSync(`tcp://localhost:5555`);

socket.on('message', (msg) => {
  msg = zquest.parse(msg);
  console.log(msg.data); // => testing
  socket.send(msg._request_id + ':' + msg.data);
});

```

## Documentation

### Defaults

defaults used by all zquest clients

```javascript
{
  "host": "127.0.0.1",
  "port": 5555,
  "timeout": 10000
  "pool": {
    "min": 2,
    "max": 500,
    "socket_expire": 600000,
    "self_expire": 600000,
    "acquire_retry": 100,
    "acquire_attempts": 10
  }
}
```

### `zquest(req)`

- Shared zquest client
- Accepts
  - `host` - host to connect to [default: `127.0.0.1`]
  - `port` - port to connect to [default: `5555`]
  - `data|message|body` -  message data to send
- Returns
  - `Promise`

```javascript
zquest({
    host: '127.0.0.1',
    port: 5555,
    message: 'testing'
}).then((response) => console.log(response))
```

### `zquest.defaults(opts)`

- Set defaults for the shared zquest client
- Accepts
  - Object to default over the [request defaults](#defaults)

```javascript
zquest.defaults({
  host: 'myserver.google.com',
  pool: {
    min: 5
  }
});
```

### `zquest.client`

- Shared zquest client

```javascript
zquest.client;
zquest.client.request() // === zquest()
```

### `zquest.new(message)`

- Utility to retrieve a new zquest client
- Accepts
  - Object to default over the [request defaults](#defaults) **for only this instance**
- Returns
  - New zquest client with its own independent configuration and defaults

```javascript
let myserver = zquest.new({
  host: 'myserver.google.com',
  pool: {
    min: 5
  }
});

myserver.defaults();
myserver.request();
```

### `zquest.parse(message)`

- Proxy of `zquest.parse.message`
- Accepts
  - `Buffer` or `String` message
- Returns
  - Object
    - `_request_id` - request ID which must be returned in the response for routing purposes
    - `data` - data in the message

```javascript
let message = zquest.parse(message);
console.log(message); // => { _request_id: [SOME_GUID], data: [BODY] }
```

### `zquest.parse.message(message)`

- Message parser used by the zquest client
- Accepts
  - `Buffer` or `String` message
- Returns
  - Object
    - `_request_id` - request ID which must be returned in the response for routing purposes
    - `data` - data in the message

```javascript
let message = zquest.parse.message(message);
console.log(message); // => { _request_id: [SOME_GUID], data: [BODY] }
```


### `zquest.parse.messageId(message)`

- Parser for retrieving only the message ID
- Accepts
  - `Buffer` or `String` message
- Returns
  - Request ID which must be returned in the response for routing purposes

```javascript
let id = zquest.parse(message);
console.log(id); // => [SOME_UUID]
```

## Authors

- [John Hofrichter](https://github.com/johnhof)
