'use strict'

var http = require('http');
var https = require('https');
var fs = require('fs');

var express = require('express');
var serveIndex = require('serve-index');
var socketIo = require('socket.io');
//打log
var log4js = require('log4js');
log4js.configure({
	appenders:{
		file:{
			type:'file',
			filename:'app.log',
			layout:{
				type:'pattern',
				pattern:'%r %p - %m',
			}
		}
	},
	categories:{
		default:{
			appenders:['file'],
			level:'debug'
		}
	}
});
var logger = log4js.getLogger();

var app = express();

//按照这个顺序
app.use(serveIndex('./public'));
app.use(express.static('./public'));

var options = {
	key  : fs.readFileSync('./cert/privkey.pem'),
	cert : fs.readFileSync('./cert/fullchain.pem') 
}

var https_server = https.createServer(options, app);
var io = socketIo.listen(https_server);
//信令服务器
io.sockets.on('connection',(socket)=>{
	socket.on('join',(room)=>{
		socket.join(room);
		var myroom = io.sockets.adapter.rooms[room];//在数组中找房间号
		var users = Object.keys(myroom.sockets).length;
		logger.log('the number of user in room is' + users);
		socket.emit('joined',room,socket.id);//
		socket.to(room).emit('joined',room,socket.id);//除自己外
		io.in(room).emit('joined',room,socket.id);//所有人
		socket.broadcast.emit('joined',room,socket.id);//给站点所有人发，除自己
	});
	socket.on('leave',(room)=>{
		var myroom = io.sockets.adapter.rooms[room];//在数组中找房间号
		var users = Object.keys(myroom.sockets).length;
		logger.log('the number of user in room is' + users-1);//user-1
		socket.leave(room);
		socket.emit('joined',room,socket.id);//
		socket.to(room).emit('joined',room,socket.id);//除自己外
		io.in(room).emit('joined',room,socket.id);//所有人
		socket.broadcast.emit('joined',room,socket.id);//给站点所有人发，除自己
	});
});
https_server.listen(28522, '0.0.0.0');

var http_server = http.createServer(app);
http_server.listen(28521, '0.0.0.0');