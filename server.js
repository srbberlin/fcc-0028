'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var shrt = require('simple-short');
var dns = require('dns');
var bp = require('body-parser');
var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

var regExProtocoll = /^(http:|https:|file:|ftp:|mailto:)/i
var regExSlashes = /^(\/\/)/
var regExHost = /^([^:/?]*)(:\d*)?/
var regExPath = /^(\/[^?]*)/
var regExParam = /^(\?.*)?/

var urlParser = (href) => {
  let result
  let prot
  let shl
  let host
  let port
  let path
  let param
  
  //console.log('urlParser',href)

  result = regExProtocoll.exec(href)
  //console.log('prot',result)
  if (result) {
    prot = result[1].toLowerCase()
    href = href.substring(prot.length)
  }
  else {
    prot = "http:"
  }

  result = regExSlashes.exec(href)
  //console.log('shl',result)
  if (result) {
    shl = result[1]
    href = href.substring(shl.length)
  }
  else {
    shl = "//"
  }

  result = regExHost.exec(href)
  //console.log('host',result)
  if (result) {
    host = result[1]
    port = result[2]
    href = href.substring(host.length + (port ? port.length : 0))
  }

  result = regExPath.exec(href)
  //console.log('path',result)
  if (result) {
    path = result[1]
    href = href.substring(path.length)
  }

  result = regExParam.exec(href)
  //console.log('param',result)
  if (result) {
    param = result[1]
  }
    
  if (!host) host = ""
  if (!port) port = ""
  if (!path) path = "/"
  if (!param) param = ""

  //console.log('parsed',prot+shl+host+port+path+param)

  return {prot, shl, host, port, path, href: prot+"//"+host+port+path+param}
}

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
// useMongoClient: true }, 

mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true }, (err, data) => {
    if (!err) {
      console.log('Connection: Success', data.db.databaseName);
    }
    else {
      console.log('Connection: Error ', err);
    }
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use(bp.urlencoded({extended: 'false'}));
app.use(bp.json());
app.use('/public', express.static(process.cwd() + '/public'));

var shortened = {
  original_url: String,
  short_url: String
}

var setShortened = (href, shrt) => {
  return {
    original_url: href,
    short_url: shrt
  }
}

var SchemaShort = mongoose.Schema(shortened)
var ShortUrl = mongoose.model('short', SchemaShort);

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.all("/api/shorturl/new/*", function (req, res) {
  var url = urlParser(req.body['url'])
  if (url) {
    dns.lookup(url.host, function (err, data1) {
      if (err || ! data1) {
        res.json({"error": "invalid URL"});
      }
      else {
        let short = shrt(url.href);
        ShortUrl.findOne({ short_url: short}, (err1, data2) => {
          if (!err1) {
            if (!data2) {
              let model = ShortUrl(setShortened(url.href, short))
              model.save(function (err2) {
                if (err2) {
                  res.json({error: err2})
                }
                else {
                  res.json({original_url: url.href, short_url: short})
                }
              })
            }
            else {
              res.json({original_url: url.href, short_url: short})
            }
          }
          else {
            res.json({error: err1})
          }
        })
      }
    })
  }
  else {
    res.json({error: "invalid URL"})
  }
});

app.get("/api/shorturl/:short", (req, res) => {
  var short = req.params.short;
  ShortUrl.findOne({ short_url: short}, (err1, data2) => {
    if (!err1) {
      if (data2) {
        res.redirect(data2.original_url)
      }
      else {
        res.json({error: "invalid URL"})
      }
    }
    else {
      res.json({error: err1})
    }
  })
})


app.listen(port, function () {
  console.log('Node.js listening ...');
});
