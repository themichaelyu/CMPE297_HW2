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

function mapf() {
    var datestamp = this.ts.getFullYear() + "-" + (this.ts.getMonth()+1) + "-" + this.ts.getDate(); 
    emit(datestamp, {count:1});
}

function reducef(key, values) {
    var count = 0; 
    values.forEach(function(value) {
        count += value.count;
    });
    return count;
} 

function finalizef(key, reducedValue) {
    return reducedValue;
}

var callbackFunction = function() {
}

var record_visit = function(req, res){
  //res.write("inside record_visit\n");
  //res.write("mongourl=" + mongourl + "\n");

  /* Connect to the DB and auth */
  require('mongodb').connect(mongourl, function(err, conn){
    //res.write("connected to mongodb\n");
    conn.collection('ips6', function(err, coll){
      //res.write("connected to collection ips6\n");
      /* Simple object to insert: ip address and date */
      object_to_insert = { 'ip': req.connection.remoteAddress, 'ts': new Date() };

      /* Insert the object then print in response */
      /* Note the _id has been created */
      coll.insert( object_to_insert, {safe:true}, function(err){
      }); 
      //res.write("inserted\n");
          
      coll.mapReduce(mapf, 
                     reducef, 
                     {out:"myoutput"},
                     callbackFunction);  
      //res.write("performed mapreduce!\n");
    });

    conn.collection('myoutput', function(err, coll){
          coll.find(function(err, cursor){
              cursor.toArray(function(err, arr){
                  for (var i = 0; i < arr.length; i++) {
                      var jsonstr = JSON.stringify(arr[i]);
                      var datets = jsonstr.split(",")[0];
                      var datetsval = datets.split("\"")[3].split("-");                      
                      var year = datetsval[0];
                      year = year.substring(year.length-2);
                      var month = datetsval[1];
                      if (month < 10)
                          month = "0" + month;
                      var day = datetsval[2];
                      if (day < 10)
                          day = "0" + day;
                      
                      var countval = jsonstr.split(",")[1].split(":")[1].split("}")[0];
                      
                      res.write(month + "-" + day + "-" + year + " = " + countval + "\n"); 
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
