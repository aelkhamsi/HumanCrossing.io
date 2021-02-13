const express = require('express');
const app = express();
const http = require('http').createServer(app);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("server listening on port " + PORT + "...");
})
