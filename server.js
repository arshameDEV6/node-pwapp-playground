const
    path = require('path'),
    dotenv = require('dotenv');

dotenv.load({
    path: `${__dirname}/.env`
});

const
    express = require('express'),
    app = express(),
    port = process.env.PORT,
    folderToServe = process.env.FOLDER_TO_SERVE;

// Server all files in this directory
app.use('/', express.static(path.join(__dirname, `/${folderToServe}`)));


app.listen(port, () => console.log(`App server up on ${port}!`));