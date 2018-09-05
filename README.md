# betlogger

betlogger is a Lightweight blazing fast HTTP request logger middleware for node.js for logging request metrics and stats.

## Features

logging incoming requests -----------------
    Request Time in UTC     |         
    Remote IP address       |
    Request method          |
    Request URL             |
    Http-version            |
    Response Status          |
    Response Content Length   |
    Request Referrer           |
    Request User-agent         |
    Response time              |
    Cpu usage Time              | 
    Memory used to process request            |

## Importing

```javascript
// Using Node.js `require()`
const betlogger = require('betlogger');

// Using ES6 imports
import betlogger from 'betlogger';
```

## Contributors

Currently the module is being mainatined by [Leon Tinashe Mwandiringa](https://twitter.com/ogtechadon)
more contributors are welcome

## Installation

First install [node.js](http://nodejs.org/). Then:

```sh
$ npm install betlogger
```

## Overview

### Using betlogger

```js
const app = require('express')();
const betlogger = require('betlogger');
const port = 3000;

app.use(betlogger('loggingfilelocation.log'));

app.get('/', function(req, res){

    res.status(200).send('its working');
});

app.listen(port, function(err){

    if(err){
        throw new Error("an error just occured "+err);
    }

    console.log('app is running on port '+ port);

});

```
if you dont want to log to afile you can write the middleware without any parameters

## License

Copyright (c) 2018 Leontinashe &lt;tinashe.leon@yahoo.com&gt;

This module is licensed under GPL Liense v3.0