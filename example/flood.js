'use strict';

let zquest = require('../index.js');

zquest.defaults({
  host: '127.0.0.1',
  port: 5555
});


for (let i = 5; i >= 0; i--) {
  let message = { index: i };
  zquest({ message: message })
    .then((res) => {
      if (res.data.index === i) console.log(` <= ✔ :: ${res.data.index} === ${i}`)
      else console.log(` <= x :: ${i} !== ${res.data.index}`);
    }).catch((err) => console.log(err.stack));

  console.log(` => ${JSON.stringify(message)}`)
}
