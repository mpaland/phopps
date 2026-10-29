// app 'url'


var config = require("../../config/config");
var xmlobj = require('../../lib/xmlobjects');

var resolvePath = require('object-resolve-path');

module.exports = url;


function url() {}

menu.render = function (req, path, device) {
  var app = resolvePath(config, path);
  return app.opt.url;
}
