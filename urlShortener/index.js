require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const shortId = require('shortid');
const validUrl = require('valid-url');
const bodyParser = require('body-parser');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.urlencoded());
app.use('/public', express.static(`${process.cwd()}/public`));


//mongoose connection
const mongouri = process.env['MONGO_URI']
mongoose.connect(mongouri,{
  useNewUrlParser: true,
  useUnifiedTopology:  true,
  serverSelectionTimeoutMS: 5000
});

//Checking mongodb connection
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', ()=>{
  console.log("MongoDB database connection succesfull")
});

//DB schema and model
const Schema = mongoose.Schema;
const URLSchema = new Schema({
  original_url: String,
  short_url: String
})
const URL = mongoose.model("URL", URLSchema);

//endpoints
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async function(req, res){
  const url = req.body.url
  const urlCode = shortId.generate()
  if(!validUrl.isWebUri(url)){
    res.json({ error: 'invalid url' })
  } else {
    try{
      let findONE = await URL.findOne({
        original_url : url
      })
      if(findONE){
        res.json({
          original_url : findONE.original_url,
          short_url : findONE.short_url
        })
      } else {
        findONE = new URL({
          original_url : url,
          short_url: urlCode
        })
        await findONE.save()
        res.json({
          original_url : findONE.original_url,
          short_url : findONE.short_url
        })
      }
    } catch(err){
      console.error(err)
      res.json({error: "invalid url"})
    }
  }
});

app.get('/api/shorturl/:code',async function(req,res){
  try{
    let code = req.params.code;
    const short = await URL.findOne({
      short_url:code
    })
    if(short){
      return res.redirect(short.original_url)
    } else {
      return res.status(404).json({error: "URL not found"})
    }
  } catch(err){
    console.error(err)
    res.json({error: "invalid url"})
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
