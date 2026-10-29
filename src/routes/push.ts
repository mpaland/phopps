"use strict";
///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016, PALANDesign Hannover, Germany
//
// \license The MIT License (MIT)
//
// This file is part of phopps.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// \brief 'push' route
//        This URL may be called from a script or out of asterisk to send a
//        push notification to one ore more phones
//
//        Usage:
//        http://host:port/push?device=SEP0123456789
///////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
var express = require('express'), router = express.Router(), http = require('http'), async = require('async'), xmlobj = require("../lib/xmlobjects"), gm = require('gm'), fs = require('fs'), cjson = require('comment-json');
const express_1 = require("express");
const config_1 = require("../provider/config");
const push = express_1.Router();
const config = new config_1.Config();
/**
 * This is URL is needed for xmlpush-service authentification
 * The default user/pass used by xmlwidgets::push is 'cmeext'
 * This URL should return 'ERROR', 'UN-AUTHORIZED' or 'AUTHORIZED'
 */
push.get('/', (req, res, next) => {
    const name = req.query.name || req.query.device;
    // get device
    const device = config.getDevice(name);
    if (typeof device !== 'object') {
        // device does not exist
        console.log("Device " + name + " not found in config.json configuration");
        res.status(404).end();
        return;
    }
    console.log("Push request to " + name + " (" + req.hostname + ") requests authentication");
    // get the phone template
    const tmpl = config.getTemplate(name);
    // var device  = "SEP002699F01CFA";
    var apppath = "phone['SEP002699F01CFA'].directory.opt.item[1]";
    try {
        require("./applet/background/index").render(req, res, name, apppath);
    }
    catch (e) {
        // applet not found
        console.log(e + " - Error, applet '" + "' does not exist");
        res.status(404).end();
    }
    res.sendStatus(200).end();
});
//# sourceMappingURL=push.js.map