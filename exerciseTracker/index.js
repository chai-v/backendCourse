const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const mongodb = require('mongodb')
const crypto = require('crypto')
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded())
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//connect to database
const mySecret = process.env['MONGO_URI']
mongoose.connect(mySecret,{
  useNewUrlParser: true,
  useUnifiedTopology:  true,
  serverSelectionTimeoutMS: 5000
});

//check mongo connection
const connection = mongoose.connection;
connection.on('error', console.error.bind((console, "connection error:")));
connection.once('open', ()=>{
  console.log("MongoDB connection secure")
});

//mongo schema and model
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String,
  _id: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String,
    iso: String
  }]
});
const users = mongoose.model("users", userSchema);

//endpoints
app.post('/api/users', async function(req,res){
  let username = req.body.username
  newuser = new users({
    username: username,
    _id:  crypto.randomBytes(10).toString('hex'),
    count: 0
  })
  await newuser.save()
  res.json({username: newuser.username, _id: newuser._id})
});

app.get('/api/users', async function(req,res){
  let allUsers = await users.find({}).exec();
  let list = []
  for(let u of allUsers){
    let entry = '{"_id": "'+u._id+'","username":"'+u.username+'"}'
    list.push(JSON.parse(entry))
  }
  res.send(list)
});

app.post('/api/users/:_id/exercises', async function(req,res){
  let id = req.params._id
  let CurUser = await users.find({_id: id}).exec()
  let des = req.body.description
  let dura = Number(req.body.duration)
  let date = new Date(req.body.date)
  
  if(date=="Invalid Date"){
    date = new Date()
  }
  let isoDate = date.toISOString()
  date = date.toDateString()
  
  try{
    users.findByIdAndUpdate(id,
    {"$push": {"log": {
      "description": des,
      "duration": dura,
      "date": date,
    "iso": isoDate}},
     "$inc": {count:1}
    },
    { "new": true, "upsert": true }).exec();
  }catch(err){
    console.error(err)
    res.json({error: "server error"})
  }
  res.json({_id: id, username: CurUser[0].username, date: date, duration: dura, description: des})
});

app.get('/api/users/:_id/logs', async function(req,res){
  let lo = new Date(req.query.fromDate)
  let hi = new Date(req.query.toDate)
  let limit = req.query.limit
  let count = 0
  
  //no dates
  if(lo=="Invalid Date" && hi=="Invalid Date"){
    let user = await users.find({_id:req.params._id}).exec()
    if(!limit){
      res.json(user[0])
    } else {
      const logs = user[0].log
      let list = []
      for(let log of logs){
        if(count<limit){
          list.push(log)
          count+=1
        }
      }
    res.json({
      _id: req.params._id,
      username: user[0].username, 
      count: count,  
      log: list
    })
    }
  }

  //only lower limit
  if(!(lo=="Invalid Date") && hi=="Invalid Date"){
    let user = await users.find({_id:req.params._id}).exec()
    const logs = user[0].log
    let list = []
    for(let log of logs){
      if(log.iso>=lo.toISOString()){
        if(!limit){
          list.push(log)
          count+=1
        }else{
          if(count<limit){
            list.push(log)
            count+=1
          }
        }
      }
  }
    res.json({
      _id: req.params._id,
      username: user[0].username, 
      count: count,  
      log: list
    })
  }
  
  //only upper limit
  if(lo=="Invalid Date" && !(hi=="Invalid Date")){
    console.log("ran only upper limit")
    let user = await users.find({_id:req.params._id}).exec()
    const logs = user[0].log
    let list = []
    for(let log of logs){
      if(log.iso<=hi.toISOString()){
        if(!limit){
          list.push(log)
          count+=1
        }else{
          if(count<limit){
            list.push(log)
            count+=1
          }
        }
      }
  }
    res.json({
      _id: req.params._id,
      username: user[0].username, 
      count: count,  
      log: list
    })
  }

  //both upper and lower limits
  if(!(lo=="Invalid Date") && !(hi=="Invalid Date")){
    console.log("ran this")
    let user = await users.find({_id:req.params._id}).exec()
    const logs = user[0].log
    let list = []
    for(let log of logs){
      if(log.iso>=lo.toISOString() && log.iso<=hi.toISOString()){
        if(!limit){
          list.push(log)
        }else{
          if(count<limit){
            list.push(log)
            count+=1
          }
        }
      }
    }
    res.json({
      _id: req.params._id,
      username: user[0].username, 
      count: count,  
      log: list
    })
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
