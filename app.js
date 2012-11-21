if(process.env.VCAP_SERVICES){
  var env = JSON.parse(process.env.VCAP_SERVICES);
  var mongo = env['mongodb-2.0'][0]['credentials'];
}
else{
  var mongo = {
    "hostname":"localhost",
    "port":27017,
    "username":"",
    "password":"",
    "name":"",
    "db":"db"
  }
}

var generate_mongo_url = function(obj){
  obj.hostname = (obj.hostname || 'localhost');
  obj.port = (obj.port || 27017);
  obj.db = (obj.db || 'test');

  if(obj.username && obj.password){
    return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
  else{
    return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
}

var mongourl = generate_mongo_url(mongo);

var record_visit = function(req, res){
  //res.write("inside record_visit\n");
  //res.write("mongourl=" + mongourl + "\n");

  /* Connect to the DB and auth */
  require('mongodb').connect(mongourl, function(err, conn){
    //res.write("connected to mongodb\n");
    conn.collection('ips', function(err, coll){
      //res.write("connected to collection ips\n");
      /* Simple object to insert: ip address and date */
      object_to_insert = { 'ip': req.connection.remoteAddress, 'ts': new Date() };

      /* Insert the object then print in response */
      /* Note the _id has been created */
      coll.insert( object_to_insert, {safe:true}, function(err){
      });
      //res.write("inserted\n");

      coll.find(function(err, cursor){
          cursor.toArray(function(err, arr){
              var map = new Object();
              for (var i = 0; i < arr.length; i++) {
                  var dateValue = arr[i]["ts"];
                  var year = dateValue.getFullYear();
                  var month = dateValue.getMonth();
                  var date = dateValue.getDate();
                  var dateToInsert = month + "-" + date + "-" + year;
                  if (map[dateToInsert] == null) {
                      map[dateToInsert] = 1;
                  }
                  else {
                      var oldCount = map[dateToInsert];
                      map[dateToInsert] = oldCount + 1;
                  }
              }
              for (var key in map) {
                  res.write([key, map[key]].join(" = "));
                  res.write("\n");
              }
              res.end();
          });
      });
    });
  });
}

var port = (process.env.VMC_APP_PORT || 3000);
var host = (process.env.VCAP_APP_HOST || 'localhost');
var http = require('http');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello World\n');
  record_visit(req, res);
}).listen(port, host);
