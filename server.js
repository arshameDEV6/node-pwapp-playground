const
    path = require('path'),
    fs = require('fs'),
    dotenv = require('dotenv');

dotenv.load({
    path: `${__dirname}/.env`
});

const
    express = require('express'),
    app = express(),
    port = process.env.PORT,
    folderToServe = process.env.FOLDER_TO_SERVE;

// Insert app API key when loading the app.js file
app.use('/scripts/app.js', (req, res) => {

    // Get scripts/app.js file
    // Append initApp(someApiKey)

    fs.readFile(`${__dirname}/${folderToServe}/scripts/app.js`, `utf8`, (error, data) => {

        if (error) {
            res.status(404).send(error);
        }

        data += `\r\ninitApp('${process.env.OPEN_WEATHER_MAPS_API_KEY}')`;

        res.status(200).send(data);

    });

});

// Server all files in this directory
app.use('/', express.static(path.join(__dirname, `/${folderToServe}`)));


app.listen(port, () => console.log(`App server up on ${port}!`));